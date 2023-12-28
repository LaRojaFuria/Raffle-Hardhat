const { network } = require("hardhat");

const BASE_FEE = "250000000000000000"; // 0.25 LINK
const GAS_PRICE_LINK = 1e9; // 0.000000001 LINK per gas

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network detected! Deploying mocks...");

        // Deploy VRFCoordinatorV2Mock if it's not already deployed
        try {
            const existingVRFCoordinatorV2Mock = await get("VRFCoordinatorV2Mock");
            log(`Using existing VRFCoordinatorV2Mock at ${existingVRFCoordinatorV2Mock.address}`);
        } catch {
            await deploy("VRFCoordinatorV2Mock", {
                from: deployer,
                log: true,
                args: [BASE_FEE, GAS_PRICE_LINK],
            });
        }

        // Deploy AggregatorV3Mock if it's not already deployed
        try {
            const existingAggregatorV3Mock = await get("AggregatorV3Mock");
            log(`Using existing AggregatorV3Mock at ${existingAggregatorV3Mock.address}`);
        } catch {
            const aggregatorMock = await deploy("AggregatorV3Mock", {
                from: deployer,
                log: true,
            });

            // Setting an initial value for the MATIC/USD price feed in the mock.
            await aggregatorMock.setLatestAnswer(1500000000000000000);
            log("Set AggregatorV3Mock to a mock MATIC/USD price of $1.5 per MATIC");
        }

        log("Mocks Deployed!");
        log("----------------------------------------------------------");
        log("You are deploying to a local network, you'll need a local network running to interact");
        log("Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!");
        log("----------------------------------------------------------");
    }
};

module.exports.tags = ["all", "mocks"];
