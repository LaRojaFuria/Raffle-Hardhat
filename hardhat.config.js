require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

// Improved error handling for missing environment variables
const checkEnvVariables = () => {
  const requiredVars = [
    "PRIVATE_KEY",
    "MAINNET_RPC_URL",
    "POLYGON_MAINNET_RPC_URL",
    "ETHERSCAN_API_KEY",
    "POLYGONSCAN_API_KEY"
  ];
  const missingVars = requiredVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(", ")}`);
  }
};

checkEnvVariables();

const DEPLOYER_ADMIN_ADDRESS = process.env.DEPLOYER_ADMIN_ADDRESS;
const DEVELOPER_ADDRESS = process.env.DEVELOPER_ADDRESS;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const REPORT_GAS = process.env.REPORT_GAS || false;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      // Add any specific hardhat network configurations if needed
    },
    localhost: {
      chainId: 31337,
      // Add any specific localhost network configurations if needed
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
    },
    // Add any other networks you want to configure
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: REPORT_GAS,
    currency: "USD",
    outputFile: "gas-report.txt",
    // Add any specific gas reporter configurations if needed
  },
  contractSizer: {
    runOnCompile: false,
    only: ["Raffle"],
    // Add any specific contract sizer configurations if needed
  },
  namedAccounts: {
    deployer: {
      default: DEPLOYER_ADMIN_ADDRESS,
    },
    player: {
      default: 1,
    },
    admin: {
      default: DEPLOYER_ADMIN_ADDRESS,
    },
    developer: {
      default: DEVELOPER_ADDRESS,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        // Add any specific compiler configurations if needed
      },
    ],
  },
  mocha: {
    timeout: 200000,
    // Add any specific mocha configurations if needed
  },
};
