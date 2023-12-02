const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { advanceTimeAndBlock } = require('./utils/timeManipulation');
const { BigNumber } = require("ethers");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
        let raffle, deployer, raffleEntranceFee;

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            const Raffle = await ethers.getContractFactory("Raffle");
            raffle = await Raffle.deploy();
            await raffle.deployed();
            raffleEntranceFee = await raffle.getEntranceFee();
        });

        // Test cases for the initialize function
        describe("initialize", function () {
            it("should initialize all contract variables correctly", async function () {
                // Fetch the actual values from the contract
                const actualMaticUsdAggregatorAddress = await raffle.maticUsdAggregatorAddress();
                const actualDeveloperAddress = await raffle.i_developerAddress();
                const actualAdminAddress = await raffle.i_adminAddress();
                const actualVrfCoordinator = await raffle.i_vrfCoordinator();
                const actualSubscriptionId = await raffle.i_subscriptionId();
                const actualGasLane = await raffle.i_gasLane();
                const actualInterval = await raffle.i_interval();
                const actualEntranceFee = await raffle.s_entranceFeeInMatic();
                const actualCallbackGasLimit = await raffle.i_callbackGasLimit();

                // Replace these with the expected values from your deployment
                const expectedMaticUsdAggregatorAddress = /* Expected Aggregator Address */;
                const expectedDeveloperAddress = /* Expected Developer Address */;
                const expectedAdminAddress = /* Expected Admin Address */;
                const expectedVrfCoordinator = /* Expected VRF Coordinator Address */;
                const expectedSubscriptionId = /* Expected Subscription ID */;
                const expectedGasLane = /* Expected Gas Lane */;
                const expectedInterval = /* Expected Interval */;
                const expectedEntranceFee = /* Expected Entrance Fee */;
                const expectedCallbackGasLimit = /* Expected Callback Gas Limit */;

                // Assertions for each initialized variable
                assert.equal(actualMaticUsdAggregatorAddress, expectedMaticUsdAggregatorAddress, "MATIC/USD Aggregator address should be initialized correctly");
                assert.equal(actualDeveloperAddress, expectedDeveloperAddress, "Developer address should be initialized correctly");
                assert.equal(actualAdminAddress, expectedAdminAddress, "Admin address should be initialized correctly");
                assert.equal(actualVrfCoordinator, expectedVrfCoordinator, "VRF Coordinator should be initialized correctly");
                assert.equal(actualSubscriptionId.toString(), expectedSubscriptionId, "Subscription ID should be initialized correctly");
                assert.equal(actualGasLane, expectedGasLane, "Gas Lane should be initialized correctly");
                assert.equal(actualInterval.toString(), expectedInterval, "Interval should be initialized correctly");
                assert.equal(actualEntranceFee.toString(), expectedEntranceFee.toString(), "Entrance fee should be initialized correctly");
                assert.equal(actualCallbackGasLimit.toString(), expectedCallbackGasLimit, "Callback Gas Limit should be initialized correctly");
            });
        });

        // Test cases for the enterRaffle function
        describe("enterRaffle", function () {
            it("should allow a user to enter the raffle when conditions are met", async function () {
                // Assuming raffleEntranceFee is set in the beforeEach block
                const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                await tx.wait();
                const raffleState = await raffle.getRaffleState();
                const newPlayer = await raffle.getPlayer(0);

                assert.equal(raffleState.toString(), "0", "Raffle state should be OPEN");
                assert.equal(newPlayer, deployer, "Deployer should be the first player");
            });

            it("should fail if the raffle is not in OPEN state", async function () {
                await raffle.pauseLottery();
                await expect(raffle.enterRaffle({ value: raffleEntranceFee }))
                    .to.be.revertedWith("Raffle__RaffleNotOpen");
            });

            it("should fail if insufficient entrance fee is sent", async function () {
                const insufficientFee = raffleEntranceFee.sub(ethers.utils.parseEther("0.001"));
                await expect(raffle.enterRaffle({ value: insufficientFee }))
                    .to.be.revertedWith("Raffle__SendMoreToEnterRaffle");
            });
        });

        // Test cases for the checkUpkeep function
        describe("checkUpkeep", function () {
            it("should return false if no upkeep is needed", async function () {
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert.equal(upkeepNeeded, false, "Upkeep should not be needed");
            });

            it("should return true if upkeep is needed", async function () {
                // Assumptions for conditions to meet upkeep requirements
                await advanceTimeAndBlock(3600); // Advance time by 1 hour (3600 seconds)
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert.equal(upkeepNeeded, true, "Upkeep should be needed");
            });
        });

        // Test cases for the performUpkeep function
        describe("performUpkeep", function () {
            beforeEach(async function () {
                await advanceTimeAndBlock(3600); // Ensure time condition is met for upkeep
                await raffle.enterRaffle({ value: raffleEntranceFee }); // Ensure there's at least one player
            });

            it("should successfully perform upkeep", async function () {
                const tx = await raffle.performUpkeep([]);
                await tx.wait();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState.toString(), "1", "Raffle state should be CALCULATING after upkeep");
            });

            it("should fail if upkeep is not needed", async function () {
                await raffle.unpauseLottery(); // Reset state to ensure upkeep is not needed
                await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded");
            });
        });


        // Test cases for the fulfillRandomWords function
        describe("fulfillRandomWords", function () {
            beforeEach(async function () {
                // Setup for fulfilling random words
                await advanceTimeAndBlock(3600); // Assure the time condition for upkeep is met
                await raffle.enterRaffle({ value: raffleEntranceFee }); // Ensure there's at least one player
                await raffle.performUpkeep("0x");
            });

            it("should pick a winner correctly", async function () {
                const tx = await raffle.fulfillRandomWords(0, [0]); // Simulate Chainlink VRF response
                await tx.wait();
                const recentWinner = await raffle.getRecentWinner();
                assert.equal(recentWinner, deployer, "Winner should be the first player");
            });

            it("should handle multiple players and pick a winner correctly", async function () {
                // Assuming multiple players enter the raffle
                for (let i = 0; i < 5; i++) {
                    const playerAccount = await ethers.getSigners()[i];
                    await raffle.connect(playerAccount).enterRaffle({ value: raffleEntranceFee });
                }

                const tx = await raffle.fulfillRandomWords(0, [2]); // Simulating the 3rd player wins
                await tx.wait();
                const recentWinner = await raffle.getRecentWinner();
                const playerAccount = await ethers.getSigners()[2];

                assert.equal(recentWinner, playerAccount.address, "3rd player should be the winner");
            });
        });

        // Test cases for the pauseLottery function
        describe("pauseLottery", function () {
            it("should pause the raffle", async function () {
                await raffle.pauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState.toString(), "2", "Raffle state should be PAUSED");
            });

            it("should fail if called by a non-admin", async function () {
                const playerAccount = await ethers.getSigners()[1];
                await expect(raffle.connect(playerAccount).pauseLottery())
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });

        // Test cases for the unpauseLottery function
        describe("unpauseLottery", function () {
            beforeEach(async function () {
                await raffle.pauseLottery(); // Ensure the raffle is paused before testing unpause
            });

            it("should unpause the raffle", async function () {
                await raffle.unpauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState.toString(), "0", "Raffle state should be OPEN");
            });

            it("should fail if called by a non-admin", async function () {
                const playerAccount = await ethers.getSigners()[1];
                await expect(raffle.connect(playerAccount).unpauseLottery())
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });


        // Test cases for the updateAggregatorAddress function
        describe("updateAggregatorAddress", function () {
            it("should update the Chainlink aggregator address", async function () {
                const newAggregatorAddress = ethers.Wallet.createRandom().address;
                await raffle.updateAggregatorAddress(newAggregatorAddress);
                const updatedAddress = await raffle.maticUsdAggregatorAddress();
                assert.equal(updatedAddress, newAggregatorAddress, "Aggregator address should be updated");
            });

            it("should fail if called by a non-admin", async function () {
                const nonAdmin = await ethers.getSigners()[1];
                const newAggregatorAddress = ethers.Wallet.createRandom().address;
                await expect(raffle.connect(nonAdmin).updateAggregatorAddress(newAggregatorAddress))
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });

            it("should revert with an invalid address", async function () {
                await expect(raffle.updateAggregatorAddress(ethers.constants.AddressZero))
                    .to.be.revertedWith("InvalidAddress");
            });
        });

        // Test cases for Getter Functions
        describe("Getter Functions", function () {
            beforeEach(async function () {
                // Set up conditions, if needed, for getter functions
            });

            it("should return the correct raffle state", async function () {
                const raffleState = await raffle.getRaffleState();
                // Assuming "0" is the enum value for OPEN
                assert.equal(raffleState.toString(), "0", "Raffle state should be OPEN");
            });

            it("should return the correct entrance fee", async function () {
                const entranceFee = await raffle.getEntranceFee();
                // Compare with expected entrance fee
                assert.equal(entranceFee.toString(), raffleEntranceFee.toString(), "Entrance fee should be correct");
            });

            it("should return the address of the recent winner", async function () {
                // Assuming a winner has been picked and is stored in s_recentWinner
                const recentWinner = await raffle.getRecentWinner();
                // Replace with expected winner address
                assert.equal(recentWinner, /* expected winner address */, "Recent winner should be correct");
            });

            it("should return the player address at a given index", async function () {
                // Assuming players have entered the raffle
                const playerIndex = 0; // For example, the first player
                const playerAddress = await raffle.getPlayer(playerIndex);
                // Replace with expected player address
                assert.equal(playerAddress, /* expected player address */, "Player address should be correct");
            });

            it("should return the last timestamp when the raffle was reset", async function () {
                const lastTimeStamp = await raffle.getLastTimeStamp();
                assert.isAbove(lastTimeStamp.toNumber(), 0, "Last timestamp should be greater than 0");
            });

            it("should return the interval time for the raffle", async function () {
                const interval = await raffle.getInterval();
                assert.equal(interval.toString(), "3600", "Interval should be 1 hour (3600 seconds)");
            });

            it("should return the current number of players", async function () {
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                assert.isAtLeast(numberOfPlayers.toNumber(), 0, "Number of players should be non-negative");
            });
        });

        // Enhanced Error Handling Tests
        describe("Error Handling and Revert Conditions", function () {

            it("should revert with 'Raffle__RafflePaused' if trying to enter when raffle is paused", async function () {
                await raffle.pauseLottery();
                await expect(raffle.enterRaffle({ value: raffleEntranceFee }))
                    .to.be.revertedWith("Raffle__RafflePaused");
            });

            it("should revert with 'Raffle__AddressNotAuthorized' if non-admin tries to pause the lottery", async function () {
                const nonAdmin = (await ethers.getSigners())[1];
                await expect(raffle.connect(nonAdmin).pauseLottery())
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });

            it("should revert with 'Raffle__AddressNotAuthorized' if non-admin tries to unpause the lottery", async function () {
                await raffle.pauseLottery();
                const nonAdmin = (await ethers.getSigners())[1];
                await expect(raffle.connect(nonAdmin).unpauseLottery())
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });

            it("should revert with 'Raffle__AddressNotAuthorized' if non-admin tries to update aggregator address", async function () {
                const nonAdmin = (await ethers.getSigners())[1];
                await expect(raffle.connect(nonAdmin).updateAggregatorAddress("0xNewAddress"))
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });

            it("should revert with 'Raffle__UpkeepNotNeeded' if upkeep is not needed", async function () {
                await expect(raffle.performUpkeep("0x"))
                    .to.be.revertedWith("Raffle__UpkeepNotNeeded");
            });

            it("should revert with 'InvalidAddress' when trying to set a zero address for the aggregator", async function () {
                await expect(raffle.updateAggregatorAddress(ethers.constants.AddressZero))
                    .to.be.revertedWith("InvalidAddress");
            });

            // Additional tests for specific revert conditions can be added here
        });

        // Tests for Additional Functionalities and Edge Cases
        describe("Additional Functionalities and Edge Cases", function () {

            it("should revert if someone sends Ether directly to the contract", async function () {
                await expect(
                    deployer.sendTransaction({
                        to: raffle.address,
                        value: ethers.utils.parseEther("1")
                    })
                ).to.be.reverted;
            });

            it("should correctly return the number of players after multiple entries", async function () {
                for (let i = 0; i < 3; i++) {
                    await raffle.enterRaffle({ value: raffleEntranceFee });
                }
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                assert.equal(numberOfPlayers.toString(), "3", "There should be 3 players in the raffle");
            });

            it("should correctly reset the raffle after fulfillment", async function () {
                // Enter raffle and perform upkeep to simulate a complete cycle
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await advanceTimeAndBlock(3600); // Ensure time condition for upkeep is met
                await raffle.performUpkeep("0x");
                await raffle.fulfillRandomWords(0, [0]); // Simulate picking a winner

                // Check if raffle has reset correctly
                const raffleState = await raffle.getRaffleState();
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                const lastTimeStamp = await raffle.getLastTimeStamp();

                assert.equal(raffleState.toString(), "0", "Raffle state should be reset to OPEN");
                assert.equal(numberOfPlayers.toString(), "0", "Number of players should be reset to 0");
                assert.isTrue(lastTimeStamp.gt(0), "Last timestamp should be updated");
            });

            // Additional tests for specific edge cases can be added here
        });

    });