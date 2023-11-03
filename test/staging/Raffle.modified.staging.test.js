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
        describe("fulfillRandomWords", function () {

            // Point 1: Validate the winner is picked correctly
            it("should pick a winner based on random words", async function () {
                const randomWords = [3]; // Let's assume the 4th player in the array wins
                await raffle.connect(keeper).performUpkeep('0x0');
                await raffle.fulfillRandomWords(randomWords);

                const recentWinner = await raffle.getRecentWinner();
                expect(recentWinner).to.equal(players[3]);
            });

            // Point 2: Validate that the winner is added to the payees list
            it("should add the winner to the payees list", async function () {
                const initialPayeesCount = await raffle.getPayeesCount();
                await raffle.fulfillRandomWords([0]); // The first player in the array should win

                const finalPayeesCount = await raffle.getPayeesCount();
                expect(finalPayeesCount).to.equal(initialPayeesCount + 1);
            });

            // Point 3: Validate that the winner receives the correct share of the prize
            it("should distribute the prize to the winner correctly", async function () {
                const initialBalance = await ethers.provider.getBalance(players[0]);
                await raffle.fulfillRandomWords([0]); // The first player in the array should win

                const finalBalance = await ethers.provider.getBalance(players[0]);
                const expectedShare = ethers.utils.parseEther("18.0"); // Assuming 18 shares for the winner
                expect(finalBalance).to.equal(initialBalance.add(expectedShare));
            });

            // Point 4: Validate the developers and admin get their share
            it("should distribute the prize to the developers and admin correctly", async function () {
                const initialAdminBalance = await ethers.provider.getBalance(adminAddress);
                const initialDevBalance = await ethers.provider.getBalance(devAddress);

                await raffle.fulfillRandomWords([0]); // The first player in the array should win

                const finalAdminBalance = await ethers.provider.getBalance(adminAddress);
                const finalDevBalance = await ethers.provider.getBalance(devAddress);

                const expectedShare = ethers.utils.parseEther("1.0"); // Assuming 1 share for admin and dev
                expect(finalAdminBalance).to.equal(initialAdminBalance.add(expectedShare));
                expect(finalDevBalance).to.equal(initialDevBalance.add(expectedShare));
            });

            // Point 5: Validate that the list of players is cleared
            it("should clear the list of players", async function () {
                await raffle.fulfillRandomWords([0]);
                const playersCount = await raffle.getNumberOfPlayers();
                expect(playersCount).to.equal(0);
            });

            // Point 6: Validate that the raffle state is set back to OPEN
            it("should set the raffle state back to OPEN", async function () {
                await raffle.fulfillRandomWords([0]);
                const state = await raffle.getRaffleState();
                expect(state).to.equal(0); // Assuming 0 is the enum value for OPEN
            });

            // Point 7: Validate that a new timestamp is set
            it("should update the last timestamp", async function () {
                const initialTimestamp = await raffle.getLastTimeStamp();
                await raffle.fulfillRandomWords([0]);
                const finalTimestamp = await raffle.getLastTimeStamp();
                expect(finalTimestamp).to.be.gt(initialTimestamp);
            });

            // Point 8: Validate that the entrance fee is updated
            it("should update the entrance fee", async function () {
                const initialFee = await raffle.getEntranceFee();
                await raffle.fulfillRandomWords([0]);
                const finalFee = await raffle.getEntranceFee();
                expect(finalFee).to.not.equal(initialFee); // Assuming that the fee should change
            });
        });
        describe("pauseLottery and unpauseLottery function", function () {

            // Point 1: Validate that only the admin can pause the lottery
            it("should allow only the admin to pause the lottery", async function () {
                await expect(raffle.connect(nonAdminAccount).pauseLottery()).to.be.revertedWith("Only admin can pause the lottery");
                await expect(raffle.connect(adminAccount).pauseLottery()).to.not.be.reverted;
            });
        
            // Point 2: Validate that the raffle state is set to PAUSED
            it("should set the raffle state to PAUSED", async function () {
                await raffle.connect(adminAccount).pauseLottery();
                const state = await raffle.getRaffleState();
                expect(state).to.equal(2); // Assuming 2 is the enum value for PAUSED
            });
        
            // Point 3: Validate that only the admin can unpause the lottery
            it("should allow only the admin to unpause the lottery", async function () {
                await raffle.connect(adminAccount).pauseLottery();
                await expect(raffle.connect(nonAdminAccount).unpauseLottery()).to.be.revertedWith("Only admin can unpause the lottery");
                await expect(raffle.connect(adminAccount).unpauseLottery()).to.not.be.reverted;
            });
        
            // Point 4: Validate that the raffle state is set back to OPEN after unpause
            it("should set the raffle state back to OPEN after unpause", async function () {
                await raffle.connect(adminAccount).pauseLottery();
                await raffle.connect(adminAccount).unpauseLottery();
                const state = await raffle.getRaffleState();
                expect(state).to.equal(0); // Assuming 0 is the enum value for OPEN
            });
        });
        describe("updateAggregatorAddress function", function () {

            // Point 1: Validate that only the admin can update the aggregator address
            it("should allow only the admin to update the aggregator address", async function () {
                await expect(raffle.connect(nonAdminAccount).updateAggregatorAddress(newAggregatorAddress)).to.be.revertedWith("Only the admin can update the aggregator address");
                await expect(raffle.connect(adminAccount).updateAggregatorAddress(newAggregatorAddress)).to.not.be.reverted;
            });
        
            // Point 2: Validate that the aggregator address is updated correctly
            it("should update the aggregator address correctly", async function () {
                await raffle.connect(adminAccount).updateAggregatorAddress(newAggregatorAddress);
                const updatedAddress = await raffle.maticUsdAggregatorAddress();
                expect(updatedAddress).to.equal(newAggregatorAddress);
            });
        
            // Point 3: Validate that an invalid address cannot be set
            it("should not allow setting an invalid address", async function () {
                await expect(raffle.connect(adminAccount).updateAggregatorAddress("0x0000000000000000000000000000000000000000")).to.be.revertedWith("Provided aggregator address is the zero address");
            });
        });
        describe("Getter Functions", function () {

            // Point 1: Validate getRaffleState function
            it("should return the correct raffle state", async function () {
                const raffleState = await raffle.getRaffleState();
                expect(raffleState).to.equal(0);  // Assuming 0 corresponds to RaffleState.OPEN
            });
        
            // Point 2: Validate getNumWords function
            it("should return the correct numWords", async function () {
                const numWords = await raffle.getNumWords();
                expect(numWords).to.equal(1);  // As per contract, should be 1
            });
        
            // Point 3: Validate getRequestConfirmations function
            it("should return the correct request confirmations", async function () {
                const requestConfirmations = await raffle.getRequestConfirmations();
                expect(requestConfirmations).to.equal(3);  // As per contract, should be 3
            });
        
            // Point 4: Validate getRecentWinner function
            it("should return the address of the recent winner", async function () {
                // Assuming that a winner has been picked and is stored in s_recentWinner
                const recentWinner = await raffle.getRecentWinner();
                expect(recentWinner).to.equal(winnerAddress);
            });
        
            // Point 5: Validate getPlayer function
            it("should return the player address at a given index", async function () {
                const player = await raffle.getPlayer(0);  // Get the first player
                expect(player).to.equal(playerAddress);  // Assuming playerAddress is the first player
            });
        
            // Point 6: Validate getLastTimeStamp function
            it("should return the last timestamp when the raffle was reset", async function () {
                const lastTimeStamp = await raffle.getLastTimeStamp();
                expect(lastTimeStamp).to.be.a.bignumber.that.is.closeTo(someRecentTimestamp, 2);  // 'someRecentTimestamp' should be a recent block timestamp
            });
        
            // Point 7: Validate getInterval function
            it("should return the interval time for the raffle", async function () {
                const interval = await raffle.getInterval();
                expect(interval).to.equal(600);  // Assuming 600 seconds as the interval as per contract
            });
        
            // Point 8: Validate getEntranceFee function
            it("should return the current entrance fee", async function () {
                const entranceFee = await raffle.getEntranceFee();
                expect(entranceFee).to.equal(someEntranceFee);  // Assuming 'someEntranceFee' is the current entrance fee
            });
        
            // Point 9: Validate getNumberOfPlayers function
            it("should return the number of players", async function () {
                const numberOfPlayers = await raffle.getNumberOfPlayers();
                expect(numberOfPlayers).to.equal(100);  // Assuming 100 players have entered the raffle
            });
        });
        describe("Administrative Functions", function () {

            // Point 1: Validate pauseLottery function
            it("should pause the lottery", async function () {
                await raffle.pauseLottery({ from: adminAddress });
                const raffleState = await raffle.getRaffleState();
                expect(raffleState).to.equal(2);  // Assuming 2 corresponds to RaffleState.PAUSED
            });
        
            // Point 2: Validate unpauseLottery function
            it("should unpause the lottery", async function () {
                await raffle.unpauseLottery({ from: adminAddress });
                const raffleState = await raffle.getRaffleState();
                expect(raffleState).to.equal(0);  // Assuming 0 corresponds to RaffleState.OPEN
            });
        
            // Point 3: Validate updateAggregatorAddress function
            it("should update the aggregator address", async function () {
                const newAggregatorAddress = "0xSomeNewAddress";
                await raffle.updateAggregatorAddress(newAggregatorAddress, { from: adminAddress });
                const updatedAggregatorAddress = await raffle.maticUsdAggregatorAddress();
                expect(updatedAggregatorAddress).to.equal(newAggregatorAddress);
            });
        });
        describe('Additional Functionalities and Edge Cases', function () {

            it('should reject plain Ether transfers', async function () {
                await expect(
                    ethers.provider.sendTransaction({
                        to: raffle.address,
                        value: ethers.utils.parseEther("0.1")
                    })
                ).to.be.reverted;
            });
        
            it('should pause and unpause the raffle correctly', async function () {
                await raffle.connect(admin).pauseLottery();
                expect(await raffle.getRaffleState()).to.equal(2);  // 2 is PAUSED state
        
                await raffle.connect(admin).unpauseLottery();
                expect(await raffle.getRaffleState()).to.equal(0);  // 0 is OPEN state
            });
        
            it('should revert if MATIC/USD price feed is invalid', async function () {
                // Simulate invalid price feed here, then try to perform upkeep
                // You may need to mock the Chainlink Aggregator for this.
            });
        
            it('should measure gas usage', async function () {
                const tx1 = await raffle.enterRaffle({value: entranceFee});
                const receipt1 = await tx1.wait();
                console.log(`Gas used for entering raffle: ${receipt1.gasUsed.toString()}`);
        
                // Similar gas calculations for other key functions can be added
            });
        
        });                                
    });
