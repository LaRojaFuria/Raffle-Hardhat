require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

// Check for missing environment variables
if (!process.env.PRIVATE_KEY || !process.env.MAINNET_RPC_URL) {
  throw new Error("Missing environment variables");
}

const DEPLOYER_ADMIN_ADDRESS = process.env.DEPLOYER_ADMIN_ADDRESS || "0xYourDefaultAdminAddressHere";
const DEVELOPER_ADDRESS = process.env.DEVELOPER_ADDRESS || "0xYourDefaultDeveloperAddressHere";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key";
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-mainnet.alchemyapi.io/v2/your-api-key";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "Your etherscan API key";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key";
const REPORT_GAS = process.env.REPORT_GAS || false;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      saveDeployments: true,
      chainId: 1,
    },
    polygon: {
      url: POLYGON_MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      saveDeployments: true,
      chainId: 137,
   
