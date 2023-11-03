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

        // ... Other describe and it blocks will follow
    });
