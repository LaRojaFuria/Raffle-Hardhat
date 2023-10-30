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
            // This test ensures that a user can enter the raffle successfully when conditions are met
            it("should allow a user to enter the raffle when conditions are met", async function () {
                const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                await tx.wait(1);
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0); // 0 means OPEN
            });
            // This test ensures that the contract rejects a user who tries to enter the raffle without sending enough funds
            it("should reject a user entering the raffle with insufficient funds", async function () {
                await expect(raffle.enterRaffle({ value: 0 })).to.be.revertedWith("Raffle__SendMoreToEnterRaffle");
            });
            // This test ensures that a user cannot enter the raffle if it is currently paused
            it("should reject a user entering the raffle when it's not open", async function () {
                await raffle.pauseLottery();
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__RaffleNotOpen");
            });
            // Custom error tests for enterRaffle
            it("should throw a custom error when entering the raffle with insufficient funds", async function () {
                await expect(raffle.enterRaffle({ value: 0 }))
                    .to.be.revertedWith("Raffle__SendMoreToEnterRaffle");
            });
            it("should throw a custom error when entering the raffle that is not open", async function () {
                await raffle.pauseLottery(); // Assuming this puts the raffle in a not-open state
                await expect(raffle.enterRaffle({ value: raffleEntranceFee }))
                    .to.be.revertedWith("Raffle__RaffleNotOpen");
            });
        });
        // Test cases for the pauseLottery function          
        describe("pauseLottery function", function () {
            // This test ensures that the admin can pause the raffle
            it("should pause the raffle", async function () {
                await raffle.pauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 2); // 2 means PAUSED
            });
            // This test ensures that a non-admin cannot pause the raffle
            it("should reject pausing the raffle by non-admin", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.pauseLottery()).to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
            // Custom error tests for pauseLottery
            it("should throw a custom error when a non-admin tries to pause the raffle", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.pauseLottery())
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });
        // Test cases for the unpauseLottery function
        describe("unpauseLottery function", function () {
            // This test ensures that the admin can unpause the raffle
            it("should unpause the raffle", async function () {
                await raffle.pauseLottery();
                await raffle.unpauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0); // 0 means OPEN
            });

            // This test ensures that a non-admin cannot unpause the raffle
            it("should reject unpausing the raffle by non-admin", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.unpauseLottery()).to.be.revertedWith("Raffle__AddressNotAuthorized");
            });

            // Custom error tests for unpauseLottery
            it("should throw a custom error when a non-admin tries to unpause the raffle", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.unpauseLottery())
                    .to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });
        // Test cases for the updateAggregatorAddress function
        describe("updateAggregatorAddress function", function () {
            // This test ensures that the admin can update the Chainlink aggregator address
            it("should update the Chainlink aggregator address", async function () {
                const newAggregatorAddress = "0xNewAggregatorAddress";
                await raffle.updateAggregatorAddress(newAggregatorAddress);
                const updatedAddress = await raffle.maticUsdAggregatorAddress();
                assert.equal(updatedAddress, newAggregatorAddress);
            });

            // This test ensures that a non-admin cannot update the Chainlink aggregator address
            it("should reject updating the Chainlink aggregator address by non-admin", async function () {
                const accounts = await ethers.getSigners();
                const nonAdmin = accounts[1];
                const nonAdminRaffle = raffle.connect(nonAdmin);
                await expect(nonAdminRaffle.updateAggregatorAddress("0xNewAggregatorAddress")).to.be.revertedWith("Raffle__AddressNotAuthorized");
            });
        });
        // Test cases for the performUpkeep function        
        describe("performUpkeep function", function () {
            // This test case ensures that the performUpkeep function works when conditions are met
            it("should perform upkeep when conditions are met", async function () {
                // Unpause the lottery to ensure that it's open
                await raffle.unpauseLottery();

                // Advance the blockchain time to ensure that the interval has passed
                // Here we use a utility function advanceTimeAndBlock to manipulate the time
                await advanceTimeAndBlock(86401);  // 86401 seconds = 1 day + 1 second

                // Simulate 10 players entering the raffle to meet the minimum player count condition
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

            // This test case ensures that the performUpkeep function doesn't work when conditions are not met
            it("should reject performing upkeep when not needed", async function () {
                // Ensure the lottery is paused
                await raffle.pauseLottery();

                // Advance the blockchain time but not enough to trigger the upkeep
                await advanceTimeAndBlock(10);  // 10 seconds is not enough

                // Assuming the raffle is fresh or reset, there should not be enough players
                // Alternatively, you could explicitly remove players to set the desired initial state

                await expect(raffle.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded");
            });
        });
        // Test cases for fulfillRandomWords function
        describe("fulfillRandomWords function", function () {
            it("should pick a winner and distribute rewards", async function () {
                // Setup
                const vrfCoordinator = await ethers.getContract('VRFCoordinatorV2Mock');

                // 1. Start by entering multiple players into the raffle
                await enterPlayers(3);

                // 2. Manually call performUpkeep to switch the state to CALCULATING
                const tx = await raffle.performUpkeep("0x0");
                const receipt = await tx.wait();
                const requestEvent = receipt.events.find(e => e.event === "RequestedRaffleWinner");
                const requestId = requestEvent.args.requestId;

                // 3. Use the VRFCoordinatorV2Mock to simulate fulfillRandomWords
                const randomWords = [1];
                await vrfCoordinator.callBackWithRandomness(requestId, randomWords[0], raffle.address);

                // 4. Fetch the recent winner
                const recentWinner = await raffle.getRecentWinner();

                // 5. Validate that a winner was picked
                assert.notEqual(recentWinner, "0x0000000000000000000000000000000000000000");

                // 6. Validate that the contract balance is zero after distributing rewards
                const contractBalance = await ethers.provider.getBalance(raffle.address);
                assert.equal(contractBalance, 0);

                // 7. Validate that the raffle state is back to OPEN
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0);  // 0 means OPEN

                // 8. Validate that the last time stamp was updated
                const lastTimeStamp = await raffle.getLastTimeStamp();
                assert.isAbove(lastTimeStamp.toNumber(), initialTimeStamp.toNumber());
            });
        });
        // Test cases for read-only functions       
        describe("read-only functions", function () {
            // Run some setup code to put the contract into a specific state
            beforeEach(async function () {
                // Unpause the lottery to ensure that it's open
                await raffle.unpauseLottery();

                // Simulate 10 players entering the raffle
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 10; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }
            });

            // This test ensures that the read-only functions return expected values
            it("should return correct values", async function () {
                const numWords = await raffle.getNumWords();
                const requestConfirmations = await raffle.getRequestConfirmations();
                const recentWinner = await raffle.getRecentWinner();
                const lastTimeStamp = await raffle.getLastTimeStamp();
                const interval = await raffle.getInterval();
                const numberOfPlayers = await raffle.getNumberOfPlayers();

                assert.equal(numWords, 1);  // Assuming the number of words for Chainlink request is 1
                assert.equal(requestConfirmations, 3);  // Assuming 3 confirmations are required
                assert.equal(recentWinner, "0xYourExpectedRecentWinnerAddress");  // Replace with the address you expect
                assert.isAbove(lastTimeStamp, 0);  // Should be greater than 0 after the raffle has started
                assert.equal(interval, 86400);  // Assuming a 1-day interval
                assert.equal(numberOfPlayers, 10);  // 10 players have entered
            });
        });
        // Test cases for checkUpkeep function               
        describe("checkUpkeep function", function () {
            it("should return true when upkeep is needed", async function () {
                // Ensure the raffle is OPEN
                await raffle.unpauseLottery();

                // Advance the blockchain time to ensure that enough time has passed since the last timestamp
                await ethers.provider.send("evm_increaseTime", [86401]);  // 86401 seconds to pass the 1-day interval
                await ethers.provider.send("evm_mine");

                // Simulate 100 players entering the raffle to meet the minimum player count condition
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 100; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }

                // Check if upkeep is needed
                const [upkeepNeeded,] = await raffle.checkUpkeep("0x");
                assert.isTrue(upkeepNeeded);
            });

            it("should return false when upkeep is not needed", async function () {
                // Make sure the raffle is PAUSED
                await raffle.pauseLottery();

                // Advance the blockchain time but not enough to trigger upkeep
                await ethers.provider.send("evm_increaseTime", [10]);  // Only 10 seconds
                await ethers.provider.send("evm_mine");

                // Assuming the raffle is fresh or reset, there should not be enough players
                // Alternatively, you could explicitly remove players to set the desired initial state

                // Check if upkeep is needed
                const [upkeepNeeded,] = await raffle.checkUpkeep("0x");
                assert.isFalse(upkeepNeeded);
            });
        });
        // Test cases for entrance fee updates
        describe("Entrance Fee Update", function () {
            it("should update the entrance fee based on MATIC/USD price", async function () {
                // Given: The initial entrance fee
                const initialEntranceFee = await raffle.getEntranceFee();

                // When: We simulate a change in the MATIC/USD price
                // (Here you'd typically interact with a mock of the Chainlink aggregator to set a new price)
                const newMaticUsdPrice = 2;  // Replace this with the new simulated price
                await maticUsdAggregator.setLatestAnswer(newMaticUsdPrice);  // This assumes your mock allows setting the price

                // And: We simulate the fulfillRandomWords function to trigger an entrance fee update
                // (Reuse the same logic for simulating fulfillRandomWords here as in your previous test)

                // Then: The entrance fee should be updated
                const newEntranceFee = await raffle.getEntranceFee();
                assert.notEqual(initialEntranceFee.toString(), newEntranceFee.toString(), "The entrance fee should be updated");

                // Optionally, you can add more specific assertions based on how exactly your contract updates the entrance fee
                const expectedNewEntranceFee = newMaticUsdPrice * 10;  // Replace this with the exact formula used in your contract
                assert.equal(newEntranceFee.toString(), expectedNewEntranceFee.toString(), "The entrance fee should match the expected new fee");
            });
        });
        // Test cases for zero or negative MATIC/USD price
        describe("Zero or Negative MATIC/USD Price", function () {
            it("should revert if MATIC/USD price is zero or negative", async function () {
                // Given: A zero or negative MATIC/USD price
                // (Assuming you have a way to mock or manipulate the Chainlink Aggregator)
                await maticUsdAggregatorMock.setLatestAnswer(0);

                // When & Then: Trying to perform upkeep or some other action that checks the price
                await expect(raffle.performUpkeep(/* your parameters here */))
                    .to.be.revertedWith("MATIC/USD price cannot be zero or negative");

                // Optionally: Test for negative value
                await maticUsdAggregatorMock.setLatestAnswer(-1);
                await expect(raffle.performUpkeep(/* your parameters here */))
                    .to.be.revertedWith("MATIC/USD price cannot be zero or negative");
            });
        });
        // Test cases for shares and PaymentSplitter
        describe("Shares and PaymentSplitter", function () {
            it("should distribute funds based on shares", async function () {
                // Given: Initial balances of payees
                const accounts = await ethers.getSigners();
                const initialDeveloperBalance = await ethers.provider.getBalance(accounts[0].address);
                const initialAdminBalance = await ethers.provider.getBalance(accounts[1].address);

                // When: The raffle is completed and funds are to be distributed
                // (Here you'd typically simulate the complete lifecycle of a raffle, ending in a call to `fulfillRandomWords`)

                // Simulate a winner for this example, assume the winner is accounts[2]
                await raffle.enterRaffle({ from: accounts[2].address, value: await raffle.getEntranceFee() });

                // Simulate the `fulfillRandomWords` function being called (or the complete raffle lifecycle)
                // This should trigger the fund distribution based on shares
                await raffle.fulfillRandomWords(/* your parameters here */);

                // Then: Fetch new balances and compare
                const newDeveloperBalance = await ethers.provider.getBalance(accounts[0].address);
                const newAdminBalance = await ethers.provider.getBalance(accounts[1].address);

                // Add your assertions here
                assert.isAbove(Number(newDeveloperBalance), Number(initialDeveloperBalance), "The developer should receive their share");
                assert.isAbove(Number(newAdminBalance), Number(initialAdminBalance), "The admin should receive their share");

                // Optionally: Add more specific assertions based on the exact share percentages
                // const expectedDeveloperShare = /* calculate based on your contract logic */;
                // const expectedAdminShare = /* calculate based on your contract logic */;

                assert.equal(Number(newDeveloperBalance) - Number(initialDeveloperBalance), expectedDeveloperShare, "Developer share should match the expected value");
                assert.equal(Number(newAdminBalance) - Number(initialAdminBalance), expectedAdminShare, "Admin share should match the expected value");
            });
        });
        // Test cases for event emissions     
        describe("Events", function () {
            it("should emit RaffleEnter event when a user enters the raffle", async function () {
                const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                const receipt = await tx.wait(1);
                const event = receipt.events.find(e => e.event === "RaffleEnter");
                assert.exists(event, "Event RaffleEnter not emitted");
            });

            it("should emit WinnerPicked event after picking a winner", async function () {
                // Ensure the raffle is OPEN
                await raffle.unpauseLottery();

                // Advance the blockchain time to ensure that enough time has passed since the last timestamp
                await ethers.provider.send("evm_increaseTime", [86401]);  // 86401 seconds to pass the 1-day interval
                await ethers.provider.send("evm_mine");

                // Simulate 100 players entering the raffle to meet the minimum player count condition
                const accounts = await ethers.getSigners();
                for (let i = 0; i < 100; i++) {
                    const player = accounts[i];
                    const playerRaffle = raffle.connect(player);
                    await playerRaffle.enterRaffle({ value: raffleEntranceFee });
                }

                // Perform upkeep, which should pick a winner
                const tx = await raffle.performUpkeep("0x");
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === "WinnerPicked");
                assert.exists(event, "Event WinnerPicked not emitted");
            });
        });
        // Test cases for dynamic assertions
        describe("Dynamic Assertions", function () {
            it("should update lastTimeStamp dynamically", async function () {
                const initialTimeStamp = await raffle.getLastTimeStamp();
                await advanceTimeAndBlock(3600); // Advancing time by 1 hour
                const newTimeStamp = await raffle.getLastTimeStamp();
                assert.equal(newTimeStamp.toNumber(), initialTimeStamp.toNumber() + 3600);
            });
        });
        // Test cases for additional scenarios
        describe("Additional Scenarios", function () {
            it("should behave correctly when paused, time advances, and then unpaused", async function () {
                await raffle.pauseLottery();
                await advanceTimeAndBlock(3600); // Advancing time by 1 hour
                await raffle.unpauseLottery();
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState, 0); // 0 means OPEN
            });
        });

    });


