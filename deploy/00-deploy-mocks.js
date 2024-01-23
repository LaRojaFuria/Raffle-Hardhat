const { network } = require("hardhat")

const BASE_FEE = "250000000000000000" // 0.25 LINK (configurable for testing)
const GAS_PRICE_LINK = 1e9 // 0.000000001 LINK per gas (configurable)

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // Dynamic check for local development network
    if (chainId === 31337) {
        log("Local network detected! Deploying mocks...")

        // Deploy VRFCoordinatorV2Mock if not already deployed
        try {
            const vrfCoordinatorV2Mock = await deploy("VRFCoordinatorV2Mock", {
                contract: "VRFCoordinatorV2Mock",
                from: deployer,
                log: true,
                args: [BASE_FEE, GAS_PRICE_LINK],
            })
            log(`VRFCoordinatorV2Mock deployed at ${vrfCoordinatorV2Mock.address}`)
        } catch (error) {
            log(`Error deploying VRFCoordinatorV2Mock: ${error.message}`)
        }

        // Deploy AggregatorV3Mock if not already deployed
        try {
            const aggregatorV3Mock = await deploy("AggregatorV3Mock", {
                contract: "AggregatorV3Mock",
                from: deployer,
                log: true,
            })

            // Setting initial value for the MATIC/USD price feed in the mock
            const initialPrice = ethers.utils.parseUnits("1.5", 8) // 1.5 USD (configurable)
            await aggregatorV3Mock.setLatestAnswer(initialPrice)
            log(`AggregatorV3Mock set to a mock MATIC/USD price of $1.5 per MATIC`)
        } catch (error) {
            log(`Error deploying AggregatorV3Mock: ${error.message}`)
        }

        log("Mocks Deployed!")
        log("----------------------------------------------------------")
        log(
            "You are deploying to a local network. Run `yarn hardhat console --network localhost` to interact with deployed contracts."
        )
        log("----------------------------------------------------------")
    } else {
        log("Skipping mock deployments for non-local network.")
    }
}

module.exports.tags = ["all", "mocks"]
