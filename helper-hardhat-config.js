const { ethers } = require("hardhat");

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
    maticUsdAggregatorAddress: "<Your-Chainlink-Aggregator-Address-for-Local-Testing>",
  },
  11155111: {
    name: "sepolia",
    subscriptionId: "6926",
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    keepersUpdateInterval: "3600",
    raffleEntranceFee: ethers.utils.parseEther("0.01"),
    callbackGasLimit: "500000",
    vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    maticUsdAggregatorAddress: "<Your-Chainlink-Aggregator-Address-for-Sepolia>",
  },
  1: {
    name: "mainnet",
    keepersUpdateInterval: "3600",
    // Add other mainnet specific configurations if needed
  },
  137: {
    name: "polygon",
    subscriptionId: "<Your-Chainlink-Subscription-ID-for-Polygon>",
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    keepersUpdateInterval: "3600",
    raffleEntranceFee: ethers.utils.parseEther("0.01"),
    callbackGasLimit: "500000",
    vrfCoordinatorV2: "<Your-VRF-Coordinator-Address-for-Polygon>",
    maticUsdAggregatorAddress: "<Your-Chainlink-Aggregator-Address-for-Polygon>",
  },
};

const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json";
const frontEndAbiFile = "../nextjs-smartcontract-lottery-fcc/constants/abi.json";

module.exports = {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  frontEndContractsFile,
  frontEndAbiFile,
};
