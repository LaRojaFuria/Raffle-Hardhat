const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network, deployments } = require("hardhat");
const { advanceTimeAndBlock } = require('./utils/timeManipulation');
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

// Skip tests if not on a development chain
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
        let raffle, raffleEntranceFee, deployer, vrfFunder;

        // Setup before each test
        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            raffle = await ethers.getContract("Raffle", deployer);
            vrfFunder = await ethers.getContract("VrfFunder", deployer);
            raffleEntranceFee = await raffle.getEntranceFee();
        });

        // Test cases for initializations and upgrades
        describe("Initializations and Upgrades", function () {
            it("should correctly initialize and allow upgrades", async function () {
                // Given: Mock the Chainlink aggregator and set MATIC/USD price
                const AggregatorV3Interface = await ethers.getContractFactory("AggregatorV3InterfaceMock");
                const maticUsdAggregator = await AggregatorV3Interface.deploy();
                await maticUsdAggregator.setLatestAnswer(ethers.utils.parseUnits("1.5", 8));

                // Deploy the contract with initial settings
                const Raffle = await ethers.getContractFactory("Raffle");
                raffle = await upgrades.deployProxy(Raffle, [maticUsdAggregator.address], { initializer: 'initialize' });
                await raffle.deployed();
                // Verify initial state variables
                const initialState = await raffle.getRaffleState();
                const initialEntranceFee = await raffle.getEntranceFee();
                const expectedInitialEntranceFee = ethers.utils.parseUnits("6.66667", 18);

                assert.equal(initialState, 0, "Initial state should be 0 (OPEN)");
                assert.equal(initialEntranceFee.toString(), expectedInitialEntranceFee.toString(), "Initial entrance fee should be equivalent to $10");

                // Prepare a new version of the contract
                const RaffleV2 = await ethers.getContractFactory("RaffleV2");
                raffle = await upgrades.upgradeProxy(raffle.address, RaffleV2);

                // Verify the upgraded state
                const someNewMethodInV2 = await raffle.someNewMethodInV2();
                assert.equal(someNewMethodInV2, /* actual expected value here */, "The new method in V2 should return X");

                // Confirm that state from the original contract is retained
                const retainedState = await raffle.getRaffleState();
                assert.equal(retainedState, 0, "State should be retained after the upgrade");
            });
        });

        // Test cases for the enterRaffle function
        describe("enterRaffle function", function () {
            it("should allow a user to enter the raffle when conditions are met", async function () {
                const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                await tx.wait(1);
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0); // 0 means OPEN
            });

            it("should reject a user entering the raffle with insufficient funds", async function () {
                await expect(raffle.enterRaffle({ value: 0 })).to.be.revertedWith("Raffle__SendMoreToEnterRaffle");
            });

            it("should reject a user entering the raffle when it's not open", async function () {
                await raffle.pauseLottery();
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__RaffleNotOpen");
            });
        });
        // Test cases for the pauseLottery function
        describe("pauseLottery function", function () {
            it("should pause the raffle", async function () {
                await raffle.pauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 2); // 2 means PAUSED
            });
            it("should reject pausing the raffle by non-admin", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.pauseLottery()).to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });

        // Test cases for the unpauseLottery function
        describe("unpauseLottery function", function () {
            it("should unpause the raffle", async function () {
                await raffle.pauseLottery();
                await raffle.unpauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0); // 0 means OPEN
            });
            it("should reject unpausing the raffle by non-admin", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.unpauseLottery()).to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });

        // Test cases for the updateAggregatorAddress function
        describe("updateAggregatorAddress function", function () {
            it("should update the Chainlink aggregator address", async function () {
                const newAggregatorAddress = "0xNewAggregatorAddress";
                await raffle.updateAggregatorAddress(newAggregatorAddress);
                const updatedAddress = await raffle.maticUsdAggregatorAddress();
                assert.equal(updatedAddress, newAggregatorAddress);
            });
            it("should reject updating the Chainlink aggregator address by non-admin", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.updateAggregatorAddress("0xNewAggregatorAddress")).to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });
        // Test cases for the performUpkeep function
        describe("performUpkeep function", function () {
            it("should perform upkeep when conditions are met", async function () {
                await raffle.unpauseLottery();
                await advanceTimeAndBlock(86401);  // 86401 seconds = 1 day + 1 second
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 10; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }
                const tx = await raffle.performUpkeep("0x");
                await tx.wait();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 1); // 1 means CALCULATING
            });
            it("should reject performing upkeep when not needed", async function () {
                await raffle.pauseLottery();
                await advanceTimeAndBlock(10);  // 10 seconds is not enough
                await expect(raffle.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded");
            });
        });

        // Test cases for the fulfillRandomWords function
        describe("fulfillRandomWords function", function () {
            beforeEach(async function () {
                await advanceTimeAndBlock(86401);  // 86401 seconds = 1 day + 1 second
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 10; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }
                await raffle.performUpkeep("0x");
            });

            it("should pick a winner correctly", async function () {
                const tx = await raffle.fulfillRandomWords(0, [0]); // Simulate picking the first player as the winner
                await tx.wait();
                const recentWinner = await raffle.getRecentWinner();
                assert.equal(recentWinner, deployer, "Winner should be the first player");
            });

            it("should reset the raffle state to OPEN after picking a winner", async function () {
                await raffle.fulfillRandomWords(0, [0]);
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0, "Raffle state should be reset to OPEN");
            });

            it("should clear the list of players after picking a winner", async function () {
                await raffle.fulfillRandomWords(0, [0]);
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                assert.equal(numberOfPlayers.toNumber(), 0, "List of players should be cleared");
            });
        });

        // Test cases for additional functionality and edge cases
        describe("Additional Functionality and Edge Cases", function () {
            it("should revert if someone sends Ether directly to the contract", async function () {
                await expect(
                    deployer.sendTransaction({
                        to: raffle.address,
                        value: ethers.utils.parseEther("1")
                    })
                ).to.be.reverted;
            });

            it("should correctly return the number of players after multiple entries", async function () {
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 5; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                assert.equal(numberOfPlayers.toNumber(), 5, "There should be 5 players in the raffle");
            });

            it("should correctly reset the raffle after fulfillment", async function () {
                // Enter raffle and perform upkeep to simulate a complete cycle
                await advanceTimeAndBlock(86401);  // 86401 seconds = 1 day + 1 second
                await raffle.performUpkeep("0x");
                await raffle.fulfillRandomWords(0, [0]); // Simulate picking a winner

                // Check if raffle has reset correctly
                const raffleState = await raffle.getRaffleState();
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                const lastTimeStamp = await raffle.getLastTimeStamp();

                assert.equal(raffleState, 0, "Raffle state should be reset to OPEN");
                assert.equal(numberOfPlayers.toNumber(), 0, "Number of players should be reset to 0");
                assert.isTrue(lastTimeStamp.gt(0), "Last timestamp should be updated");
           
            });

            // Additional tests for specific edge cases can be added here
        });
    });
