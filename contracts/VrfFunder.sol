// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC677.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract VrfFunder {
    using SafeERC20 for IERC20;

    VRFCoordinatorV2Interface public vrfCoordinator;
    AggregatorV3Interface public priceFeed;
    IERC20 public linkToken;
    IERC677 public linkToken677;
    address public pegSwap;
    uint64 public subscriptionId;
    uint256 public minLinkBalance;
    IUniswapV2Router02 public uniswapRouter;

    constructor(
        address _vrfCoordinator,
        address _priceFeed,
        address _linkToken,
        address _linkToken677,
        address _pegSwap,
        address _uniswapRouter,
        uint64 _subscriptionId,
        uint256 _minLinkBalance
    ) {
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        priceFeed = AggregatorV3Interface(_priceFeed);
        linkToken = IERC20(_linkToken);
        linkToken677 = IERC677(_linkToken677);
        pegSwap = _pegSwap;
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        subscriptionId = _subscriptionId;
        minLinkBalance = _minLinkBalance;
    }

    /**
     * @dev Checks the VRF subscription balance and funds it if the balance is below the minimum required.
     */
    function checkAndFundSubscription() public {
        (uint96 balance, , , ) = vrfCoordinator.getSubscription(subscriptionId);
        if (balance < minLinkBalance) {
            uint256 linkAmountNeeded = minLinkBalance - balance;
            uint256 maticAmountNeeded = getRequiredMaticAmount(linkAmountNeeded);
            swapMaticForLink(maticAmountNeeded);
            swapLinkForLink677(linkAmountNeeded);
            fundSubscription(linkAmountNeeded);
        }
    }

    /**
     * @dev Swaps MATIC for ERC20 LINK using Uniswap.
     * @param maticAmount The amount of MATIC to swap for LINK.
     */
    function swapMaticForLink(uint256 maticAmount) private {
        address[] memory path = new address[](2);
        path[0] = uniswapRouter.WETH();
        path[1] = address(linkToken);

        uniswapRouter.swapExactETHForTokens{value: maticAmount}(
            0, // Accept any amount of LINK
            path,
            address(this),
            block.timestamp
        );
    }

    /**
     * @dev Swaps ERC20 LINK for ERC677 LINK using PegSwap.
     * @param linkAmount The amount of ERC20 LINK to swap for ERC677 LINK.
     */
    function swapLinkForLink677(uint256 linkAmount) private {
        linkToken.approve(pegSwap, linkAmount);
        (bool success, ) = pegSwap.call(
            abi.encodeWithSignature(
                "swap(uint256,address,address)",
                linkAmount,
                address(linkToken),
                address(linkToken677)
            )
        );
        if (!success) {
            revert("PegSwap swap failed");
        }
    }

    /**
     * @dev Funds the VRF subscription by transferring LINK tokens to the VRFCoordinator contract.
     * @param linkAmount The amount of LINK tokens to transfer for funding the subscription.
     */
    function fundSubscription(uint256 linkAmount) private {
        linkToken677.transferAndCall(
            address(vrfCoordinator),
            linkAmount,
            abi.encode(subscriptionId)
        );
    }

    /**
     * @dev Retrieves the latest MATIC/LINK price from the price feed.
     * @return The latest price of MATIC/LINK.
     */
    function getLatestPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return uint256(price);
    }

    /**
     * @dev Calculates the required amount of MATIC to swap for a specified amount of LINK.
     * @param linkAmount The amount of LINK needed.
     * @return The required amount of MATIC to swap for the specified amount of LINK.
     */
    function getRequiredMaticAmount(uint256 linkAmount) public view returns (uint256) {
        uint256 linkPrice = getLatestPrice();
        return (linkAmount * 1e18) / linkPrice;
    }

    /**
     * @dev Allows the contract to receive ETH when swapping.
     */
    receive() external payable {}
}
