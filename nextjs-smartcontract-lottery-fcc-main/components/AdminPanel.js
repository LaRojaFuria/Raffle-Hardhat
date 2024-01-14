import React, { useState, useEffect } from "react";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants";
import { ethers } from "ethers";
import Header from "../components/Header";

export default function AdminPanel() {
    const { isWeb3Enabled, chainId: chainIdHex } = useMoralis();
    const chainId = parseInt(chainIdHex);
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null;

    // State hooks for admin functionalities
    const [newAggregatorAddress, setNewAggregatorAddress] = useState("");
    const [raffleState, setRaffleState] = useState("");
    const [currentEntranceFee, setCurrentEntranceFee] = useState("0");
    const [currentNumberOfPlayers, setCurrentNumberOfPlayers] = useState("0");
    const [currentRecentWinner, setCurrentRecentWinner] = useState("");

    // Web3 Contract interaction setup for admin functions
    const { runContractFunction: getRaffleState } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getRaffleState",
        params: {},
    });

    const { runContractFunction: pauseLottery } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "pauseLottery",
        params: {},
    });

    const { runContractFunction: unpauseLottery } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "unpauseLottery",
        params: {},
    });

    const { runContractFunction: updateAggregatorAddress } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "updateAggregatorAddress",
        params: { _newAggregatorAddress: newAggregatorAddress },
    });

    // Additional contract function setups for fetching data
    const { runContractFunction: fetchEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},
    });

    const { runContractFunction: fetchNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getNumberOfPlayers",
        params: {},
    });

    const { runContractFunction: fetchRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getRecentWinner",
        params: {},
    });

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI();
        }
    }, [isWeb3Enabled]);

    async function updateUI() {
        const stateFromContract = await getRaffleState();
        setRaffleState(stateFromContract.toString());

        const feeFromContract = await fetchEntranceFee();
        setCurrentEntranceFee(ethers.utils.formatUnits(feeFromContract, "ether"));

        const playersNumber = await fetchNumberOfPlayers();
        setCurrentNumberOfPlayers(playersNumber.toString());

        const recentWinnerFromContract = await fetchRecentWinner();
        setCurrentRecentWinner(recentWinnerFromContract);
    }

    const handlePauseResume = async () => {
        if (raffleState === "PAUSED") { // Assuming "PAUSED" is the enum value for PAUSED
            await unpauseLottery();
        } else {
            await pauseLottery();
        }
        updateUI();
    };

    const handleUpdateAggregatorAddress = async () => {
        if (!newAggregatorAddress) {
            console.log("Please enter a valid address.");
            return;
        }
        await updateAggregatorAddress({
            onSuccess: () => console.log("Aggregator address updated successfully"),
            onError: (error) => console.error(error),
        });
        setNewAggregatorAddress(""); // Reset the input field after updating
    };

    return (
        <div>
            <Header />
            <div className="admin-panel p-5">
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <div className="mt-3">
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handlePauseResume}
                    >
                        {raffleState === "PAUSED" ? "Resume Lottery" : "Pause Lottery"}
                    </button>
                </div>
                <div className="mt-3">
                    <input
                        type="text"
                        value={newAggregatorAddress}
                        onChange={(e) => setNewAggregatorAddress(e.target.value)}
                        placeholder="New Aggregator Address"
                        className="border p-2 rounded"
                    />
                    <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-2"
                        onClick={handleUpdateAggregatorAddress}
                    >
                        Update Aggregator Address
                    </button>
                </div>
                <div className="mt-3">
                    <h2 className="text-lg font-bold">Contract Information</h2>
                    <p>Current Entrance Fee: {currentEntranceFee} MATIC</p>
                    <p>Raffle State: {raffleState}</p>
                    <p>Number of Players: {currentNumberOfPlayers}</p>
                    <p>Most Recent Winner: {currentRecentWinner}</p>
                </div>
            </div>
        </div>
    );
}
