const { ethers, network } = require("hardhat");

async function mockKeepers() {
  const raffle = await ethers.getContract("Raffle");
  const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));

  // Check if upkeep is needed
  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData);

  if (upkeepNeeded) {
    // Perform upkeep
    const tx = await raffle.performUpkeep(checkData);
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.events.find((e) => e.event === "RequestedRaffleWinner").args.requestId;

    console.log(`Performed upkeep with RequestId: ${requestId}`);

    // If we are on a local network, we'll mock the VRF response
    if (network.config.chainId === 31337) {
      await mockVrf(requestId, raffle);
    }
  } else {
    console.log("No upkeep needed!");
  }
}

async function mockVrf(requestId, raffle) {
  console.log("Local network detected. Mocking VRF response...");

  // Get the mock VRF Coordinator contract
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");

  // Mock the VRF response
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, [Math.floor(Math.random() * 1000)]);

  console.log("VRF response mocked!");

  // Retrieve the recent winner from the contract
  const recentWinner = await raffle.getRecentWinner();
  console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
