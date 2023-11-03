// Segment 1: Setup and Deploy Contracts

// These are typically at the top of your test file
const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
        let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, interval, player;

        beforeEach(async () => {
            const accounts = await ethers.getSigners();
            player = accounts[1];

            // Deploy your contracts here
            await deployments.fixture(["mocks", "raffle"]);

            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
            raffleContract = await ethers.getContract("Raffle");
            raffle = raffleContract.connect(player);

            // Initialize any variables you'll use in your tests here
            raffleEntranceFee = await raffle.getEntranceFee();
            interval = await raffle.getInterval();
        });

        // Segment 2: Test for the Initialization

        describe("Initialization", function () {
            it("initializes the raffle with the correct default values and settings", async () => {
                // Retrieving values from the deployed contract
                const raffleState = await raffle.getRaffleState();
                const currentInterval = await raffle.getInterval();
                const currentEntranceFee = await raffle.getEntranceFee();
                const developerAddress = await raffle.i_developerAddress();
                const adminAddress = await raffle.i_adminAddress();
                
                // Use helper-hardhat-config to get expected values
                const expectedInterval = networkConfig[network.config.chainId]["keepersUpdateInterval"];
                const expectedEntranceFee = networkConfig[network.config.chainId]["entranceFee"];

                // Check the initial raffle state
                expect(raffleState).to.equal(0, "Raffle should be in an OPEN state after initialization.");

                // Check if the interval and entrance fee are set correctly
                expect(currentInterval.toString()).to.equal(expectedInterval, `Interval should be ${expectedInterval}`);
                expect(currentEntranceFee.toString()).to.equal(expectedEntranceFee, `Entrance fee should be ${expectedEntranceFee}`);

                // Check if developer and admin addresses are set correctly
                expect(developerAddress).to.equal(accounts[0].address, "Developer address should be set to the deployer's address");
                expect(adminAddress).to.equal(accounts[1].address, "Admin address should be set to the specified admin's address");
            });
        });
        // Segment 3: Test for the enterRaffle Function

        describe("enterRaffle", function () {
            it("reverts when you don't pay enough", async () => {
                // Attempt to enter the raffle with less than the entrance fee
                await expect(raffle.enterRaffle()).to.be.revertedWith(
                    "Raffle__SendMoreToEnterRaffle",
                    "Should revert with Raffle__SendMoreToEnterRaffle when not enough MATIC is sent"
                );
            });

            it("records player when they enter", async () => {
                // Enter the raffle with exactly the entrance fee
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const contractPlayer = await raffle.getPlayer(0);
                expect(contractPlayer).to.equal(player.address, "Player should be recorded in the raffle");
            });

            it("emits event on enter", async () => {
                // Listen for the RaffleEnter event when entering the raffle
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                    raffle,
                    "RaffleEnter"
                ).withArgs(player.address, "Should emit RaffleEnter with the player's address");
            });

            it("doesn't allow entrance when raffle is calculating", async () => {
                // Enter the raffle to change the state
                await raffle.enterRaffle({ value: raffleEntranceFee });

                // Simulate time passing and the raffle entering the CALCULATING state
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);

                // Simulate the upkeep being performed
                await raffle.performUpkeep([]);

                // Attempt to enter the raffle while it's in the CALCULATING state
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                    "Raffle__RaffleNotOpen",
                    "Should revert with Raffle__RaffleNotOpen when the raffle is in the CALCULATING state"
                );
            });
        });
        // Segment 5: Test for the performUpkeep Function

        describe("performUpkeep", function () {
            it("can only run if checkUpkeep is true", async () => {
                // Enter the raffle and simulate time passing
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);

                // Perform the upkeep after conditions are met
                const tx = await raffle.performUpkeep("0x");
                assert(tx);
            });

            it("reverts if checkUpkeep is false", async () => {
                // Attempt to perform upkeep when conditions are not met
                await expect(raffle.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded");
            });

            it("updates the raffle state and emits a requestId", async () => {
                // Enter the raffle and simulate time passing
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);

                // Perform upkeep and wait for transaction receipt
                const txResponse = await raffle.performUpkeep("0x");
                const txReceipt = await txResponse.wait(1);

                // Assert the state of the raffle is updated and a RequestId event is emitted
                const raffleState = await raffle.getRaffleState();
                const requestId = txReceipt.events[1].args.requestId;
                assert.equal(requestId.toNumber() > 0, true);
                assert.equal(raffleState.toString(), "1"); // 1 corresponds to the CALCULATING state
            });
        });
        // Segment 7: Test for Upgrade and Administrative Functions

        describe("Raffle Contract Upgradability and Administration", function () {
            let newRaffle; // This will represent our new implementation after upgrade

            it("prevents unauthorized accounts from upgrading the contract", async () => {
                const RaffleV2 = await ethers.getContractFactory("RaffleV2"); // Assuming "RaffleV2" is our new version
                newRaffle = await upgrades.prepareUpgrade(raffleContract.address, RaffleV2);
                await expect(
                    raffleContract.connect(accounts[1]).upgradeTo(newRaffle)
                ).to.be.revertedWith("Ownable: caller is not the owner"); // Assuming Ownable is used
            });

            it("allows the owner to upgrade the contract", async () => {
                const RaffleV2 = await ethers.getContractFactory("RaffleV2");
                newRaffle = await upgrades.upgradeProxy(raffleContract.address, RaffleV2);
                assert(newRaffle.address === raffleContract.address);
            });

            it("allows only the owner to pause and unpause the raffle", async () => {
                // Pause the raffle
                await expect(raffle.pauseLottery()).to.emit(raffle, "Paused");
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Pausable: paused");

                // Unpause the raffle
                await expect(raffle.unpauseLottery()).to.emit(raffle, "Unpaused");
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.changeBalance(raffle, raffleEntranceFee);
            });

            it("allows only the owner to update the aggregator address", async () => {
                const newAggregatorAddress = "0x...";
                await expect(raffle.updateAggregatorAddress(newAggregatorAddress))
                    .to.emit(raffle, "AggregatorAddressUpdated")
                    .withArgs(newAggregatorAddress);

                // Ensure the update was successful
                const updatedAddress = await raffle.maticUsdAggregatorAddress();
                assert.equal(updatedAddress, newAggregatorAddress);
            });
        });

});
