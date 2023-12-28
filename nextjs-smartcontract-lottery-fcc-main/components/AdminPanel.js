import React, { useState, useEffect } from "react";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants";
import { ethers } from "ethers";

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
    const [currentMinEntries, setCurrentMinEntries] = useState("0");
    const [newMinEntries, setNewMinEntries] = useState("");

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
        params: {
            _newAggregatorAddress: newAggregatorAddress,
        },
    });

    // Additional contract function setups for fetching data
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

    const { runContractFunction: getMinEntries } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "minimumEntrees",
        params: {},
    });

    const { runContractFunction: setMinEntries } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "setMinimumEntrees",
        params: {
            _newMinEntries: ethers.utils.parseUnits(newMinEntries || "0", "wei"),
        },
    });

    // Function to update UI values based on contract data
    async function updateUI() {
        const stateFromContract = (await getRaffleState()).toString();
        const numberOfPlayers = (await fetchNumberOfPlayers()).toString();
        const recentWinner = await fetchRecentWinner();
        const minEntriesFromContract = (await getMinEntries()).toString();

        setRaffleState(stateFromContract);
        setCurrentNumberOfPlayers(numberOfPlayers);
        setCurrentRecentWinner(recentWinner);
        setCurrentMinEntries(minEntriesFromContract);
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI();
        }
    }, [isWeb3Enabled]);

    const handlePauseResume = async () => {
        if (raffleState === "2") {
            await unpauseLottery();
        } else {
            await pauseLottery();
        }
        updateUI();
    };

    const handleUpdateAggregatorAddress = async () => {
        await updateAggregatorAddress({
            onSuccess: () => console.log("Aggregator address updated successfully"),
            onError: (error) => console.error(error),
        });
    };

    const handleSetMinEntries = async () => {
        await setMinEntries({
            onSuccess: () => {
                console.log("Minimum entries updated successfully");
                updateUI(); // Update UI to reflect new minimum entries
            },
            onError: (error) => console.error(error),
        });
    };

    return (
        <div className="admin-panel">
            <h1>Admin Panel</h1>
            <div>
                <button onClick={handlePauseResume}>
                    {raffleState === "2" ? "Resume Lottery" : "Pause Lottery"}
                </button>
            </div>
            <div>
                <input
                    type="text"
                    value={newAggregatorAddress}
                    onChange={(e) => setNewAggregatorAddress(e.target.value)}
                    placeholder="New Aggregator Address"
                />
                <button onClick={handleUpdateAggregatorAddress}>Update Aggregator Address</button>
            </div>
            <div>
                <h2>Contract Information</h2>
                <p>Current Entrance Fee: {ethers.utils.formatUnits(currentEntranceFee, "ether")} MATIC</p>
                <p>Raffle State: {raffleState}</p>
                <p>Number of Players: {currentNumberOfPlayers}</p>
                <p>Most Recent Winner: {currentRecentWinner}</p>
                <h2>Minimum Number of Entries: {currentMinEntries}</h2>
                <input
                    type="number"
                    value={newMinEntries}
                    onChange={(e) => setNewMinEntries(e.target.value)}
                    placeholder="Set New Minimum Entries"
                />
                <button onClick={handleSetMinEntries}>Update Minimum Entries</button>
            </div>
        </div>
    );
}
