const { ethers } = require("hardhat");

async function enterRaffle() {
    const raffle = await ethers.getContract("Raffle");
    const entranceFee = await raffle.getEntranceFee();

    // Enter the raffle with the exact entrance fee
    const tx = await raffle.enterRaffle({ value: entranceFee });
    const receipt = await tx.wait();
    
    console.log("Entered!");
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
