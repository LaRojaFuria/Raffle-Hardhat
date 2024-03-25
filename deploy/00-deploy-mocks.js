const { ethers, network } = require("hardhat")
const { BASE_FEE, GAS_PRICE_LINK } = require("../helper-hardhat-config")
const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (chainId === 31337) {
        log("Local network detected! Deploying mocks...")

        // Deploy VRFCoordinatorV2Mock if not already deployed
        const vrfCoordinatorV2Mock = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
        log(`VRFCoordinatorV2Mock deployed at ${vrfCoordinatorV2Mock.address}`)

        // Deploy AggregatorV3Mock and update .env
        const aggregatorV3Mock = await deploy("AggregatorV3Mock", {
            from: deployer,
            log: true,
        })
        log(`AggregatorV3Mock deployed at ${aggregatorV3Mock.address}`)

        // Update the .env file with the new AggregatorV3Mock address
        const envPath = path.join(__dirname, "../.env")
        const envConfig = dotenv.parse(fs.readFileSync(envPath))
        envConfig.LOCAL_MATIC_USD_AGGREGATOR_ADDRESS = aggregatorV3Mock.address
        const newEnv = Object.entries(envConfig)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n")
        fs.writeFileSync(envPath, newEnv)

        log(`Updated .env with LOCAL_MATIC_USD_AGGREGATOR_ADDRESS=${aggregatorV3Mock.address}`)

        log("Mocks Deployed!")
        log("----------------------------------------------------------")
        log(
            "You are deploying to a local network. Run `yarn hardhat console --network localhost` to interact with deployed contracts.",
        )
        log("----------------------------------------------------------")
    } else {
        log("Skipping mock deployments for non-local network.")
    }
}

module.exports.tags = ["all", "mocks"]
