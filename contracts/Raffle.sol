// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

/* Errors */
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);
error Raffle__TransferFailed();
error Raffle__SendMoreToEnterRaffle();
error Raffle__RaffleNotOpen();

/**@title A sample Raffle Contract
 * @author Patrick Collins
 * @notice This contract is for creating a sample raffle contract
 * @dev This implements the Chainlink VRF Version 2
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface, PaymentSplitter {
    /* Type declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    /* State variables */
    // Chainlink Aggregator Variables
    address public maticUsdAggregatorAddress;
    AggregatorV3Interface public maticUsdAggregator;

    // PaymentSplitter Variables
    address[] public payees;
    uint256[] public shares;
    uint256 private s_totalShares;

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery Variables
    uint256 private immutable i_interval;
    uint256 private s_entranceFeeInMatic;
    uint256 private s_lastTimeStamp;
    address private s_recentWinner;
    address payable[] private s_players;
    RaffleState private s_raffleState;
    uint256 public minimumEntrees = 100;
    address private s_developerAddress;
    address private s_adminAddress;
    address private s_admin;

    /* Events */
    event RequestedRaffleWinner(uint256 indexed requestId);
    event RaffleEnter(address indexed player);
    event WinnerPicked(address indexed player);
    event EntranceFeeSet(bool success, string message);

    /* Functions */
    constructor(
        address _maticUsdAggregatorAddress,
        address _developerAddress,
        address _adminAddress,
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint256 interval,
        uint256 entranceFeeInMatic,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) PaymentSplitter(payees, shares) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_interval = interval;
        i_subscriptionId = subscriptionId;
        s_entranceFeeInMatic = entranceFeeInMatic;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_callbackGasLimit = callbackGasLimit;
        maticUsdAggregatorAddress = _maticUsdAggregatorAddress;
        maticUsdAggregator = AggregatorV3Interface(maticUsdAggregatorAddress);
        payees = [_developerAddress, _adminAddress];
        shares = [1, 1];
        s_developerAddress = _developerAddress;
        s_adminAddress = _adminAddress;
        s_admin = _adminAddress;
    }

    function enterRaffle() public payable {
        // Check if the sent value is sufficient
        if (msg.value < s_entranceFeeInMatic) {
            revert Raffle__SendMoreToEnterRaffle();
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
     * the following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open.
     * 3. The contract has MATIC.
     * 4. Implicity, your subscription is funded with LINK.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = RaffleState.OPEN == s_raffleState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = s_players.length >= 100;
        bool hasBalance = address(this).balance >= (s_entranceFeeInMatic * s_players.length);
        upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers);
        return (upkeepNeeded, "0x0"); // can we comment this out?
    }

    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        // require(upkeepNeeded, "Upkeep not needed");
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
        // Quiz... is this redundant?
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
            payable(payees[i]).transfer(shareAmount);
        }

        // Resetting the players array
        delete s_players;

        // Reduce the total shares by the amount held by the most recent winner
        s_totalShares -= shares[shares.length - 1];

        // Reset payees and shares arrays to their initial state (developer and admin)
        delete payees;
        delete shares;

        s_recentWinner = recentWinner;

        // Fetch the latest MATIC/USD price to set the new entrance fee
        (
            uint80 roundID,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = maticUsdAggregator.latestRoundData();

        // Check for zero MATIC/USD price and revert or set a default value
        if (answer <= 0) {
            revert("MATIC/USD price cannot be zero or negative");
            // Alternatively, you can set a default entrance fee
            // s_entranceFeeInMatic = <default_value>;
        }

        // Update the entrance fee for the next round
        s_entranceFeeInMatic = uint256(answer) * 10;

        // Re-open the raffle for the next round
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;

        emit WinnerPicked(recentWinner);
    }

    // Function to update Chainlink aggregator address
    function updateAggregatorAddress(address _newAggregatorAddress) external {
        if (msg.sender != s_admin) {
            revert NotAuthorized("Only the admin can update the aggregator address");
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
