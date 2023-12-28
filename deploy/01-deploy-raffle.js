const { ethers, upgrades, network } = require("hardhat");
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

// Making FUND_AMOUNT dynamic based on the network
const FUND_AMOUNT = network.name === "localhost" 
                    ? ethers.utils.parseEther("1") 
                    : ethers.utils.parseEther("0.1"); // Adjusted for other networks

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer, admin, developer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let vrfCoordinatorV2Address, subscriptionId;

    // Improved error handling
    try {
        if (chainId == 31337) {
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
            vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
            const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
            const transactionReceipt = await transactionResponse.wait();
            subscriptionId = transactionReceipt.events[0].args.subId;
            await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
        } else {
            vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
            subscriptionId = networkConfig[chainId]["subscriptionId"];
        }

        const Raffle = await ethers.getContractFactory("Raffle");
        const raffle = await upgrades.deployProxy(Raffle, [
            networkConfig[chainId]["maticUsdAggregatorAddress"],
            developer,
            admin,
            vrfCoordinatorV2Address,
            subscriptionId,
            networkConfig[chainId]["gasLane"],
            networkConfig[chainId]["keepersUpdateInterval"],
            networkConfig[chainId]["raffleEntranceFee"],
            networkConfig[chainId]["callbackGasLimit"],
        ], { initializer: "initialize" });
        await raffle.deployed();

        console.log(`Raffle deployed to: ${raffle.address}`);

        // Confirming deployment
        const isPaused = await raffle.paused();
        if (isPaused) {
            throw new Error("Raffle contract is paused after deployment.");
        }

        // Verifying on Etherscan
        if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
            await verify(raffle.address, arguments);
        }

        console.log(`Contract verified and is active: ${!isPaused}`);
    } catch (error) {
        console.error("Error during deployment:", error);
    }
};

module.exports.tags = ["all", "raffle"];
