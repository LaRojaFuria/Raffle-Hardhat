const { ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator
    const priceFeedAddress = networkConfig[chainId].maticLinkAggregator
    const linkTokenAddress = networkConfig[chainId].chainlinkToken
    const linkToken677Address = networkConfig[chainId].chainlinkToken677
    const pegSwapAddress = networkConfig[chainId].pegSwap
    const uniswapRouterAddress = networkConfig[chainId].uniswapRouter
    const subscriptionId = networkConfig[chainId].chainlinkSubscriptionId
    const minLinkBalance = ethers.utils.parseEther("2") // Adjust the minimum LINK balance as needed

    const args = [
        vrfCoordinatorAddress,
        priceFeedAddress,
        linkTokenAddress,
        linkToken677Address,
        pegSwapAddress,
        uniswapRouterAddress,
        subscriptionId,
        minLinkBalance,
    ]

    const vrfFunder = await deploy("VrfFunder", {
        from: deployer,
        args: args,
        log: true,
    })

    log(`VrfFunder deployed to ${vrfFunder.address}`)
}

module.exports.tags = ["all", "vrfFunder"]
