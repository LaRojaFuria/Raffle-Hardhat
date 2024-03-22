require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const checkEnvVariables = () => {
    const requiredVars = [
        "DEPLOYER_ADMIN_ADDRESS",
        "DEVELOPER_ADDRESS",
        "PRIVATE_KEY",
        "MAINNET_RPC_URL",
        "SEPOLIA_RPC_URL",
        "POLYGON_MAINNET_RPC_URL",
        "MUMBAI_RPC_URL",
        "ETHERSCAN_API_KEY",
        "POLYGONSCAN_API_KEY",
    ]
    const missingVars = requiredVars.filter((v) => !process.env[v])
    if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(", ")}`)
    }
}

checkEnvVariables()

const DEPLOYER_ADMIN_ADDRESS = process.env.DEPLOYER_ADMIN_ADDRESS
const DEVELOPER_ADDRESS = process.env.DEVELOPER_ADDRESS
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY
const REPORT_GAS = process.env.REPORT_GAS || true

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            forking: {
                url: MAINNET_RPC_URL,
                blockNumber: 12345678, // specify a block number if needed
            },
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
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            saveDeployments: true,
            chainId: 11155111,
        },
        polygon: {
            url: POLYGON_MAINNET_RPC_URL,
            accounts: [PRIVATE_KEY],
            saveDeployments: true,
            chainId: 137,
        },
        mumbai: {
            url: MUMBAI_RPC_URL,
            accounts: [PRIVATE_KEY],
            saveDeployments: true,
            chainId: 80001,
        },
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
    },
    contractSizer: {
        runOnCompile: true,
        only: ["Raffle"],
    },
    namedAccounts: {
        deployer: {
            default: DEPLOYER_ADMIN_ADDRESS,
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
            },
        ],
    },
    mocha: {
        timeout: 30000, // 30 seconds
    },
}
