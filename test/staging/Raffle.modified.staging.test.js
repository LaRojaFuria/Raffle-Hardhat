const { assert, expect } = require("chai");
const { getNamedAccounts, ethers, network } = require("hardhat");
const { advanceTimeAndBlock } = require('./utils/timeManipulation');
const { developmentChains } = require("../../helper-hardhat-config");

// Skip tests if not on a development chain
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
        let raffle, raffleEntranceFee, deployer;

        // Setup before each test
        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            raffle = await ethers.getContract("Raffle", deployer);
            raffleEntranceFee = await raffle.getEntranceFee();
        });

        // Test cases for initializations and upgrades
        describe("Initializations and Upgrades", function () {
            it("should correctly initialize and allow upgrades", async function () {
                try {
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
                } catch (error) {
                    assert.fail(`An error occurred: ${error.message}`);
                }
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
        describe("fulfillRandomWords function", function () {
            it("should pick a winner, distribute rewards, and reset the lottery", async function () {
                // Setup
                const vrfCoordinator = await ethers.getContract('VRFCoordinatorV2Mock');

                // Initial setup to fetch the current payees and shares
                const initialPayees = await raffle.getPayees();
                const initialShares = await raffle.getShares();

                // 1. Start by entering multiple players into the raffle
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 3; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }

                // 2. Manually call performUpkeep to switch the state to CALCULATING
                const tx = await raffle.performUpkeep("0x0");
                const receipt = await tx.wait();
                const requestEvent = receipt.events.find(e => e.event === "RequestedRaffleWinner");
                const requestId = requestEvent.args.requestId;

                // 3. Use the VRFCoordinatorV2Mock to simulate fulfillRandomWords
                const randomWords = [1];
                await vrfCoordinator.callBackWithRandomness(requestId, randomWords[0], raffle.address);

                // 4. Fetch the recent winner and validate
                const recentWinner = await raffle.getRecentWinner();
                assert.notEqual(recentWinner, ethers.constants.AddressZero);

                // 5. Validate that the contract balance is zero after distributing rewards
                const contractBalance = await ethers.provider.getBalance(raffle.address);
                assert.equal(contractBalance.toString(), "0");

                // 6. Validate the raffle state is back to OPEN
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0);  // 0 means OPEN

                // 7. Validate that the entrance fee is reset to $10
                const newEntranceFee = await raffle.getEntranceFee();
                const expectedNewEntranceFee = ethers.utils.parseUnits("6.66667", 18);  // Equivalent to $10
                assert.equal(newEntranceFee.toString(), expectedNewEntranceFee.toString());

                // 8. Validate payees and shares are updated
                const updatedPayees = await raffle.getPayees();
                const updatedShares = await raffle.getShares();
                assert.notDeepEqual(updatedPayees, initialPayees, "Payees should be updated");
                assert.notDeepEqual(updatedShares, initialShares, "Shares should be updated");

                // 9. Validate that the last timestamp was updated
                const lastTimeStamp = await raffle.getLastTimeStamp();
                const initialTimeStamp = await raffle.getLastTimeStamp();  // Assuming you have fetched this earlier in your tests
                assert.isAbove(lastTimeStamp.toNumber(), initialTimeStamp.toNumber());
            });
        });

    });
