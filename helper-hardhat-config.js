const { ethers } = require("hardhat")

// Check for essential environment variables
const checkEnvVariables = () => {
    const requiredVars = [
        "LOCAL_MATIC_USD_AGGREGATOR_ADDRESS",
        "SEPOLIA_VRF_COORDINATOR",
        "SEPOLIA_MATIC_USD_AGGREGATOR_ADDRESS",
        "POLYGON_CHAINLINK_SUBSCRIPTION_ID",
        "POLYGON_GAS_LANE",
        "POLYGON_ENTRANCE_FEE",
        "POLYGON_CALLBACK_GAS_LIMIT",
        "POLYGON_VRF_COORDINATOR",
        "POLYGON_MATIC_USD_AGGREGATOR_ADDRESS",
        // Add any other required environment variables here
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
        keepersUpdateInterval: "3600",
    },
    31337: {
        name: "localhost",
        subscriptionId: "588",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        keepersUpdateInterval: "3600",
        raffleEntranceFee: ethers.utils.parseEther("0.01"),
        callbackGasLimit: "500000",
        maticUsdAggregatorAddress: process.env.LOCAL_MATIC_USD_AGGREGATOR_ADDRESS,
    },
    11155111: {
        name: "sepolia",
        subscriptionId: "6926",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        keepersUpdateInterval: "3600",
        raffleEntranceFee: ethers.utils.parseEther("0.01"),
        callbackGasLimit: "500000",
        vrfCoordinatorV2: process.env.SEPOLIA_VRF_COORDINATOR,
        maticUsdAggregatorAddress: process.env.SEPOLIA_MATIC_USD_AGGREGATOR_ADDRESS,
    },
    1: {
        name: "mainnet",
        keepersUpdateInterval: "3600",
        // Add other mainnet specific configurations if needed
    },
    137: {
        name: "polygon",
        subscriptionId: process.env.POLYGON_CHAINLINK_SUBSCRIPTION_ID,
        gasLane: process.env.POLYGON_GAS_LANE,
        keepersUpdateInterval: "3600",
        raffleEntranceFee: ethers.utils.parseEther(process.env.POLYGON_ENTRANCE_FEE),
        callbackGasLimit: process.env.POLYGON_CALLBACK_GAS_LIMIT,
        vrfCoordinatorV2: process.env.POLYGON_VRF_COORDINATOR,
        maticUsdAggregatorAddress: process.env.POLYGON_MATIC_USD_AGGREGATOR_ADDRESS,
    },
    // Add any other network configurations here
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6
const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const frontEndAbiFile = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    frontEndContractsFile,
    frontEndAbiFile,
}
