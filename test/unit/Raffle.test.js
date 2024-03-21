const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { advanceTimeAndBlock } = require("./utils/timeManipulation")
const { BigNumber } = require("ethers")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, deployer, raffleEntranceFee, vrfFunder

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfFunder = await ethers.getContract("VrfFunder", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("initialize", function () {
              it("should initialize all contract variables correctly", async function () {
                  const actualMaticUsdAggregatorAddress = await raffle.maticUsdAggregatorAddress()
                  const actualDeveloperAddress = await raffle.i_developerAddress()
                  const actualAdminAddress = await raffle.i_adminAddress()
                  const actualVrfCoordinator = await raffle.i_vrfCoordinator()
                  const actualSubscriptionId = await raffle.i_subscriptionId()
                  const actualGasLane = await raffle.i_gasLane()
                  const actualInterval = await raffle.i_interval()
                  const actualEntranceFee = await raffle.s_entranceFeeInMatic()
                  const actualCallbackGasLimit = await raffle.i_callbackGasLimit()

                  const config = networkConfig[network.config.chainId]

                  assert.equal(
                      actualMaticUsdAggregatorAddress,
                      config.maticUsdAggregatorAddress,
                      "MATIC/USD Aggregator address should be initialized correctly"
                  )
                  assert.equal(
                      actualDeveloperAddress,
                      deployer,
                      "Developer address should be initialized correctly"
                  )
                  assert.equal(
                      actualAdminAddress,
                      deployer,
                      "Admin address should be initialized correctly"
                  )
                  assert.equal(
                      actualVrfCoordinator,
                      vrfFunder.address,
                      "VRF Coordinator should be initialized correctly"
                  )
                  assert.equal(
                      actualSubscriptionId.toString(),
                      config.subscriptionId,
                      "Subscription ID should be initialized correctly"
                  )
                  assert.equal(
                      actualGasLane,
                      config.gasLane,
                      "Gas Lane should be initialized correctly"
                  )
                  assert.equal(
                      actualInterval.toString(),
                      config.interval,
                      "Interval should be initialized correctly"
                  )
                  assert.equal(
                      actualEntranceFee.toString(),
                      ethers.utils.parseUnits(config.entranceFee.toString(), "ether").toString(),
                      "Entrance fee should be initialized correctly"
                  )
                  assert.equal(
                      actualCallbackGasLimit.toString(),
                      config.callbackGasLimit,
                      "Callback Gas Limit should be initialized correctly"
                  )
              })
          })

          describe("enterRaffle", function () {
              it("should allow a user to enter the raffle when conditions are met", async function () {
                  const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                  await tx.wait()
                  const raffleState = await raffle.getRaffleState()
                  const newPlayer = await raffle.getPlayer(0)

                  assert.equal(raffleState.toString(), "0", "Raffle state should be OPEN")
                  assert.equal(newPlayer, deployer, "Deployer should be the first player")
              })

              it("should fail if the raffle is not in OPEN state", async function () {
                  await raffle.pauseLottery()
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__RaffleNotOpen"
                  )
              })

              it("should fail if insufficient entrance fee is sent", async function () {
                  const insufficientFee = raffleEntranceFee.sub(ethers.utils.parseEther("0.001"))
                  await expect(raffle.enterRaffle({ value: insufficientFee })).to.be.revertedWith(
                      "Raffle__SendMoreToEnterRaffle"
                  )
              })
          })

          describe("checkUpkeep", function () {
              it("should return false if no upkeep is needed", async function () {
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, false, "Upkeep should not be needed")
              })

              it("should return true if upkeep is needed", async function () {
                  await advanceTimeAndBlock(parseInt(await raffle.getInterval()) + 1)
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                  assert.equal(upkeepNeeded, true, "Upkeep should be needed")
              })
          })

          describe("performUpkeep", function () {
              beforeEach(async function () {
                  await advanceTimeAndBlock(parseInt(await raffle.getInterval()) + 1)
                  await raffle.enterRaffle({ value: raffleEntranceFee })
              })

              it("should successfully perform upkeep", async function () {
                  const tx = await raffle.performUpkeep("0x")
                  await tx.wait()
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(
                      raffleState.toString(),
                      "1",
                      "Raffle state should be CALCULATING after upkeep"
                  )
              })

              it("should fail if upkeep is not needed", async function () {
                  await raffle.performUpkeep("0x")
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await advanceTimeAndBlock(parseInt(await raffle.getInterval()) + 1)
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await raffle.performUpkeep("0x")
              })

              it("should pick a winner correctly", async function () {
                  await network.provider.send("evm_increaseTime", [3600])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.fulfillRandomWords(0, [0])
                  await tx.wait()
                  const recentWinner = await raffle.getRecentWinner()
                  assert.equal(recentWinner, deployer, "Winner should be the deployer")
              })

              it("should handle multiple players and pick a winner correctly", async function () {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 5; i++) {
                      await raffle.connect(accounts[i]).enterRaffle({ value: raffleEntranceFee })
                  }
                  await network.provider.send("evm_increaseTime", [3600])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.fulfillRandomWords(0, [2])
                  await tx.wait()
                  const recentWinner = await raffle.getRecentWinner()
                  assert.equal(
                      recentWinner,
                      accounts[2].address,
                      "Winner should be the third player"
                  )
              })
          })

          describe("pauseLottery and unpauseLottery", function () {
              it("should pause and unpause the raffle correctly", async function () {
                  await raffle.pauseLottery()
                  let raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "2", "Raffle state should be PAUSED")

                  await raffle.unpauseLottery()
                  raffleState = await raffle.getRaffleState()
                  assert.equal(
                      raffleState.toString(),
                      "0",
                      "Raffle state should be OPEN after unpausing"
                  )
              })

              it("should fail if non-admin tries to pause or unpause the lottery", async function () {
                  const accounts = await ethers.getSigners()
                  await expect(raffle.connect(accounts[1]).pauseLottery()).to.be.revertedWith(
                      "Raffle__AddressNotAuthorized"
                  )
                  await expect(raffle.connect(accounts[1]).unpauseLottery()).to.be.revertedWith(
                      "Raffle__AddressNotAuthorized"
                  )
              })
          })

          describe("updateAggregatorAddress", function () {
              it("should update the aggregator address correctly", async function () {
                  const newAggregatorAddress = "0x0000000000000000000000000000000000000001"
                  await raffle.updateAggregatorAddress(newAggregatorAddress)
                  const updatedAggregatorAddress = await raffle.maticUsdAggregatorAddress()
                  assert.equal(
                      updatedAggregatorAddress,
                      newAggregatorAddress,
                      "Aggregator address should be updated"
                  )
              })

              it("should fail if non-admin tries to update the aggregator address", async function () {
                  const accounts = await ethers.getSigners()
                  const newAggregatorAddress = "0x0000000000000000000000000000000000000001"
                  await expect(
                      raffle.connect(accounts[1]).updateAggregatorAddress(newAggregatorAddress)
                  ).to.be.revertedWith("Raffle__AddressNotAuthorized")
              })
          })

          describe("Getter Functions", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
              })

              it("should return the correct raffle state", async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0", "Raffle state should be OPEN")
              })

              it("should return the correct entrance fee", async function () {
                  const entranceFee = await raffle.getEntranceFee()
                  assert.equal(
                      entranceFee.toString(),
                      raffleEntranceFee.toString(),
                      "Entrance fee should be correct"
                  )
              })

              it("should return the address of the recent winner", async function () {
                  // Perform actions to select a winner
                  await advanceTimeAndBlock(parseInt(await raffle.getInterval()) + 1)
                  await raffle.performUpkeep("0x")
                  await raffle.fulfillRandomWords(0, [0])

                  const recentWinner = await raffle.getRecentWinner()
                  assert.equal(recentWinner, deployer, "Recent winner should be the deployer")
              })

              it("should return the player address at a given index", async function () {
                  const playerAddress = await raffle.getPlayer(0)
                  assert.equal(playerAddress, deployer, "Player address should be the deployer")
              })

              it("should return the last timestamp when the raffle was reset", async function () {
                  const lastTimeStamp = await raffle.getLastTimeStamp()
                  assert.isAbove(
                      lastTimeStamp.toNumber(),
                      0,
                      "Last timestamp should be greater than 0"
                  )
              })

              it("should return the interval time for the raffle", async function () {
                  const interval = await raffle.getInterval()
                  assert.equal(
                      interval.toString(),
                      "3600",
                      "Interval should be 1 hour (3600 seconds)"
                  )
              })

              it("should return the current number of players", async function () {
                  const numberOfPlayers = await raffle.getNumberOfPlayers()
                  assert.equal(numberOfPlayers.toNumber(), 1, "Number of players should be 1")
              })
          })

          describe("Error Handling and Edge Cases", function () {
              it("should revert if someone sends Ether directly to the contract", async function () {
                  await expect(
                      deployer.sendTransaction({
                          to: raffle.address,
                          value: ethers.utils.parseEther("1"),
                      })
                  ).to.be.reverted
              })

              it("should correctly return the number of players after multiple entries", async function () {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 4; i++) {
                      await raffle.connect(accounts[i]).enterRaffle({ value: raffleEntranceFee })
                  }
                  const numberOfPlayers = await raffle.getNumberOfPlayers()
                  assert.equal(
                      numberOfPlayers.toNumber(),
                      4,
                      "There should be 4 players in the raffle"
                  )
              })

              it("should correctly reset the raffle after fulfillment", async function () {
                  // Enter raffle and perform upkeep to simulate a complete cycle
                  await advanceTimeAndBlock(parseInt(await raffle.getInterval()) + 1)
                  await raffle.performUpkeep("0x")
                  await raffle.fulfillRandomWords(0, [0]) // Simulate picking a winner

                  // Check if raffle has reset correctly
                  const raffleState = await raffle.getRaffleState()
                  const numberOfPlayers = await raffle.getNumberOfPlayers()
                  const lastTimeStamp = await raffle.getLastTimeStamp()

                  assert.equal(raffleState.toString(), "0", "Raffle state should be reset to OPEN")
                  assert.equal(
                      numberOfPlayers.toNumber(),
                      0,
                      "Number of players should be reset to 0"
                  )
                  assert.isTrue(lastTimeStamp.gt(0), "Last timestamp should be updated")
              })

              // Additional tests for specific revert conditions and edge cases can be added here
          })
      })
