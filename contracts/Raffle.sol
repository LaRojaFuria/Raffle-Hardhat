// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

// Import OpenZeppelin's upgradeable contracts and Chainlink interfaces
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/finance/PaymentSplitterUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "hardhat/console.sol";

// Custom errors for specific fail states
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);
error Raffle__TransferFailed();
error Raffle__SendMoreToEnterRaffle();
error Raffle__RaffleNotOpen();
error Raffle__AddressNotAuthorized(string message);
error Raffle__RafflePaused();

// Contract meta information
/**@title A Raffle Contract
 * @author Eric Carmical
 * @notice This contract facilitates a decentralized raffle game, where participants can enter by sending MATIC. The raffle is automated by Chainlink Keepers and secured by Chainlink VRF.
 * @dev This contract is built with upgradeability and pausability features. It utilizes Chainlink VRF Version 2 for secure randomness and Chainlink Keepers for automated maintenance tasks like picking winners and resetting the raffle state.
 */

// Main contract declaration inheriting various other contracts
contract Raffle is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    PaymentSplitterUpgradeable,
    VRFConsumerBaseV2,
    AutomationCompatibleInterface
{
    /* Type declarations */

    // Raffle state enum to manage different stages of the raffle
    enum RaffleState {
        OPEN,
        CALCULATING,
        PAUSED
    }

    /* State variables */

    // Chainlink Aggregator variables for MATIC/USD pricing
    address public maticUsdAggregatorAddress;
    AggregatorV3Interface public maticUsdAggregator;

    // PaymentSplitter variables for distributing rewards
    address[] public payees;
    uint256[] public shares;
    uint256 private s_totalShares;

    // Chainlink VRF variables for secure randomness
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery-specific variables
    uint256 private immutable i_interval;
    uint256 private s_entranceFeeInMatic;
    uint256 private s_lastTimeStamp;
    address private s_recentWinner;
    address payable[] private s_players;
    RaffleState private s_raffleState;
    uint256 public minimumEntrees = 100;
    address private immutable i_developerAddress;
    address private immutable i_adminAddress;

    /* Events */
    event RequestedRaffleWinner(uint256 indexed requestId);
    event RaffleEnter(address indexed player);
    event WinnerPicked(address indexed player);
    event EntranceFeeSet(bool success, string message);

    /* Functions */
    function initialize(
        address _maticUsdAggregatorAddress,
        address _developerAddress,
        address _adminAddress,
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 interval,
        uint32 callbackGasLimit
    ) public initializer {
        // Initialize VRFConsumerBaseV2 variables
        __VRFConsumerBaseV2_init(vrfCoordinatorV2);
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;

        // Initialize PaymentSplitter variables
        address[] memory initialPayees = new address[](2);
        uint256[] memory initialShares = new uint256[](2);
        initialPayees[0] = _developerAddress;
        initialPayees[1] = _adminAddress;
        initialShares[0] = 1;
        initialShares[1] = 1;
        __PaymentSplitter_init(initialPayees, initialShares);

        // Initialize other state variables
        i_interval = interval;
        i_subscriptionId = subscriptionId;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_callbackGasLimit = callbackGasLimit;
        maticUsdAggregatorAddress = _maticUsdAggregatorAddress;
        i_developerAddress = _developerAddress;
        i_adminAddress = _adminAddress;

        // Initialize Pausable and UUPSUpgradeable
        __Pausable_init();
        __UUPSUpgradeable_init();

        // Fetch MATIC/USD price to set initial entrance fee
        maticUsdAggregator = AggregatorV3Interface(_maticUsdAggregatorAddress);
        (, int256 price, , , ) = maticUsdAggregator.latestRoundData();
        if (price <= 0) {
            revert("Invalid MATIC/USD price");
        }
        // Calculate entrance fee based on MATIC/USD price for 10 USD
        // Assuming price is in 8 decimal places and you want 10 USD worth of MATIC
        s_entranceFeeInMatic = (10 * 1e18) / uint256(price);
    }

    function enterRaffle() public payable {
        // Check if the sent value is sufficient
        if (msg.value < s_entranceFeeInMatic) {
            revert Raffle__SendMoreToEnterRaffle();
        }

        //Check if the raffle is paused
        if (s_raffleState == RaffleState.PAUSED) {
            revert Raffle__RafflePaused();
        }

        // Check if the raffle is open
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }

        // Add the player to the list of players for this round
        s_players.push(payable(msg.sender));

        // Emit an event to log the entry
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = RaffleState.OPEN == s_raffleState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = s_players.length >= 100;
        bool hasBalance = address(this).balance >= (s_entranceFeeInMatic * s_players.length);
        upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers);
        return (upkeepNeeded, "0x0");
    }

    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    /**
     * @dev This is the function that Chainlink VRF node
     * calls to send the money to the random winner.
     */
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];

        // Add the lottery winner to the payees array and allocate 18 shares
        payees.push(recentWinner);
        shares.push(18);
        s_totalShares += 18; // Update the running total

        // Calculate total shares
        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }

        // Distribute the funds based on shares
        uint256 contractBalance = address(this).balance;
        for (uint256 i = 0; i < payees.length; i++) {
            uint256 shareAmount = (contractBalance * shares[i]) / totalShares;
            (bool success, ) = payable(payees[i]).call{value: shareAmount}("");
            if (!success) {
                revert Raffle__TransferFailed();
            }
        }

        // Resetting the players array
        delete s_players;

        // Reduce the total shares by the amount held by the most recent winner
        s_totalShares -= shares[shares.length - 1];

        // Reset payees and shares arrays to their initial state (developer and admin)
        delete payees;
        payees = [i_developerAddress, i_adminAddress];
        shares = [1, 1];
        s_totalShares = 2;

        s_recentWinner = recentWinner;

        // Fetch the latest MATIC/USD price to set the new entrance fee
        (
            uint80 roundID,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = maticUsdAggregator.latestRoundData();

        // Check for zero or negative MATIC/USD price and revert if invalid
        if (answer <= 0) {
            revert("Invalid MATIC/USD price");
        }

        // Update the entrance fee for the next round
        s_entranceFeeInMatic = uint256(answer) * 10; // 10 USD equivalent in MATIC

        // Re-open the raffle for the next round
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;

        emit WinnerPicked(recentWinner);
    }

    // Function to pause the lottery
    function pauseLottery() external whenNotPaused {
        if (msg.sender != i_adminAddress) {
            revert Raffle__AddressNotAuthorized("Only admin can pause the lottery");
        }
        _pause();
        s_raffleState = RaffleState.PAUSED;
    }

    // Function to unpause the lottery
    function unpauseLottery() external whenPaused {
        if (msg.sender != i_adminAddress) {
            revert Raffle__AddressNotAuthorized("Only admin can unpause the lottery");
        }
        _unpause();
        s_raffleState = RaffleState.OPEN;
    }

    // Function to update Chainlink aggregator address
    function updateAggregatorAddress(address _newAggregatorAddress) external {
        if (msg.sender != i_adminAddress) {
            revert Raffle__AddressNotAuthorized("Only the admin can update the aggregator address");
        }
        if (_newAggregatorAddress == address(0)) {
            revert InvalidAddress("Provided aggregator address is the zero address");
        }
        maticUsdAggregatorAddress = _newAggregatorAddress;
        maticUsdAggregator = AggregatorV3Interface(maticUsdAggregatorAddress);
    }

    /** Getter Functions */

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getEntranceFee() public view returns (uint256) {
        return s_entranceFeeInMatic;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }
}
