const { ethers } = require("hardhat")

// Check for essential environment variables
const checkEnvVariables = () => {
    const requiredVars = [
        "LOCAL_MATIC_USD_AGGREGATOR_ADDRESS",
        "SEPOLIA_MATIC_USD_AGGREGATOR_ADDRESS",
        "POLYGON_CHAINLINK_SUBSCRIPTION_ID",
        "MUMBAI_CHAINLINK_SUBSCRIPTION_ID",
        "ETHEREUM_CHAINLINK_SUBSCRIPTION_ID",
        "SEPOLIA_CHAINLINK_SUBSCRIPTION_ID",
        "POLYGON_GAS_LANE",
        "MUMBAI_GAS_LANE",
        "ETHEREUM_GAS_LANE",
        "SEPOLIA_GAS_LANE",
        "POLYGON_CALLBACK_GAS_LIMIT",
        "MUMBAI_CALLBACK_GAS_LIMIT",
        "ETHEREUM_CALLBACK_GAS_LIMIT",
        "SEPOLIA_CALLBACK_GAS_LIMIT",
        "POLYGON_VRF_COORDINATOR",
        "MUMBAI_VRF_COORDINATOR",
        "ETHEREUM_VRF_COORDINATOR",
        "SEPOLIA_VRF_COORDINATOR",
        "POLYGON_MATIC_USD_AGGREGATOR_ADDRESS",
        "MUMBAI_USD_AGGREGATOR_ADDRESS",
        "ETHEREUM_USD_AGGREGATOR_ADDRESS",
        "SEPOLIA_USD_AGGREGATOR_ADDRESS",
    ]
    const missingVars = requiredVars.filter((v) => !process.env[v])
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(", ")}`)
    }
}

checkEnvVariables()

const networkConfig = {
    default: {
        name: "hardhat",
        keepersUpdateInterval: process.env.KEEPERS_UPDATE_INTERVAL,
    },
    31337: {
        name: "localhost",
        subscriptionId: "588",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        keepersUpdateInterval: process.env.KEEPERS_UPDATE_INTERVAL,
        callbackGasLimit: "500000",
        maticUsdAggregatorAddress: process.env.LOCAL_MATIC_USD_AGGREGATOR_ADDRESS,
    },
    11155111: {
        name: "sepolia",
        subscriptionId: process.env.SEPOLIA_CHAINLINK_SUBSCRIPTION_ID,
        gasLane: process.env.SEPOLIA_GAS_LANE,
        keepersUpdateInterval: process.env.KEEPERS_UPDATE_INTERVAL,
        callbackGasLimit: process.env.SEPOLIA_CALLBACK_GAS_LIMIT,
        vrfCoordinatorV2: process.env.SEPOLIA_VRF_COORDINATOR,
        ethUsdAggregatorAddress: process.env.SEPOLIA_USD_AGGREGATOR_ADDRESS,
    },
    1: {
        name: "mainnet",
        subscriptionId: process.env.ETHEREUM_CHAINLINK_SUBSCRIPTION_ID,
        gasLane: process.env.ETHEREUM_GAS_LANE,
        keepersUpdateInterval: process.env.KEEPERS_UPDATE_INTERVAL,
        callbackGasLimit: process.env.ETHEREUM_CALLBACK_GAS_LIMIT,
        vrfCoordinatorV2: process.env.ETHEREUM_VRF_COORDINATOR,
        ethUsdAggregatorAddress: process.env.ETHEREUM_USD_AGGREGATOR_ADDRESS,
    },
    137: {
        name: "polygon",
        subscriptionId: process.env.POLYGON_CHAINLINK_SUBSCRIPTION_ID,
        gasLane: process.env.POLYGON_GAS_LANE,
        keepersUpdateInterval: process.env.KEEPERS_UPDATE_INTERVAL,
        callbackGasLimit: process.env.POLYGON_CALLBACK_GAS_LIMIT,
        vrfCoordinatorV2: process.env.POLYGON_VRF_COORDINATOR,
        maticUsdAggregatorAddress: process.env.POLYGON_MATIC_USD_AGGREGATOR_ADDRESS,
    },
    80001: {
        name: "mumbai",
        subscriptionId: process.env.MUMBAI_CHAINLINK_SUBSCRIPTION_ID,
        gasLane: process.env.MUMBAI_GAS_LANE,
        keepersUpdateInterval: process.env.KEEPERS_UPDATE_INTERVAL,
        callbackGasLimit: process.env.MUMBAI_CALLBACK_GAS_LIMIT,
        vrfCoordinatorV2: process.env.MUMBAI_VRF_COORDINATOR,
        maticUsdAggregatorAddress: process.env.MUMBAI_USD_AGGREGATOR_ADDRESS,
    },
}

const developmentChains = ["hardhat", "localhost"]
const verificationBlockConfirmations = process.env.VERIFICATION_BLOCK_CONFIRMATIONS
const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const frontEndAbiFile = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"

module.exports = {
    networkConfig,
    developmentChains,
    verificationBlockConfirmations,
    frontEndContractsFile,
    frontEndAbiFile,
}
