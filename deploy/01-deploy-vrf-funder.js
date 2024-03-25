const { ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")
const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")

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
    const minLinkBalance = ethers.utils.parseEther("2")

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

    // Update the .env file with the new VrfFunder address
    const envPath = path.join(__dirname, "../.env")
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    envConfig[`VRF_FUNDER_ADDRESS_${chainId}`] = vrfFunder.address
    const newEnv = Object.entries(envConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")
    fs.writeFileSync(envPath, newEnv)

    log(`Updated .env with VRF_FUNDER_ADDRESS_${chainId}=${vrfFunder.address}`)
}

module.exports.tags = ["all", "vrfFunder"]
