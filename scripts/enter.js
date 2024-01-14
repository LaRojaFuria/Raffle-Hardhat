const { ethers } = require("hardhat");

async function enterRaffle() {
    try {
        const raffle = await ethers.getContract("Raffle");
        const entranceFee = await raffle.getEntranceFee();

        if (!entranceFee) {
            throw new Error("Unable to fetch entrance fee. Ensure the contract is deployed and the network is correct.");
        }

        console.log(`Entrance Fee: ${ethers.utils.formatUnits(entranceFee, "ether")} MATIC`);

        // Enter the raffle with the exact entrance fee
        console.log("Attempting to enter the raffle...");
        const tx = await raffle.enterRaffle({ value: entranceFee });
        console.log("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log(`Transaction confirmed. Block number: ${receipt.blockNumber}`);
        console.log("Successfully entered the raffle!");
    } catch (error) {
        console.error("Error encountered:", error);
        process.exit(1);
    }
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Unhandled error:", error);
        process.exit(1);
    });
