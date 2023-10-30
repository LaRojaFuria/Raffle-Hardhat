const { network } = require("hardhat")

const BASE_FEE = "250000000000000000" // 0.25 LINK
const GAS_PRICE_LINK = 1e9 // 0.000000001 LINK per gas

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network detected! Deploying mocks...")

        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })

        const aggregatorMock = await deploy("AggregatorV3Mock", {
            from: deployer,
            log: true,
        })

        // Setting an initial value for the MATIC/USD price feed in the mock.
        // Assuming the mock has a `setLatestAnswer` function to set price data.
        // Here, setting it to a value representing $1.5 per MATIC for testing.
        await aggregatorMock.setLatestAnswer(1500000000000000000)

        log("Mocks Deployed!")
        log("----------------------------------------------------------")
        log("You are deploying to a local network, you'll need a local network running to interact")
        log(
            "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
        )
        log("----------------------------------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]