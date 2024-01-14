import React, { useState, useEffect } from "react";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants";
import Header from "../components/Header";
import { ethers } from "ethers";

export default function PlayerDashboard() {
    const { isWeb3Enabled, chainId: chainIdHex, account } = useMoralis();
    const chainId = parseInt(chainIdHex);
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null;

    // State hooks for player-specific information
    const [entranceFee, setEntranceFee] = useState("0");
    const [numberOfPlayers, setNumberOfPlayers] = useState("0");
    const [recentWinner, setRecentWinner] = useState("");
    const [playerHistory, setPlayerHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Web3 Contract interaction setup for player functions
    const { runContractFunction: getPlayerHistory } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getPlayerHistory",
        params: { player: account },
    });
    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},
    });

    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getNumberOfPlayers",
        params: {},
    });

    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getRecentWinner",
        params: {},
    });

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI().catch(console.error);
        }
    }, [isWeb3Enabled, raffleAddress]);

    async function updateUI() {
        try {
            setIsLoading(true);
            const fee = ethers.utils.formatEther(await getEntranceFee());
            const playersNumber = (await getNumberOfPlayers()).toString();
            const winner = await getRecentWinner();
            const history = await getPlayerHistory();

            setEntranceFee(fee);
            setNumberOfPlayers(playersNumber);
            setRecentWinner(winner);
            setPlayerHistory(history);
        } catch (error) {
            console.error("Error updating UI:", error);
        } finally {
            setIsLoading(false);
        }
    }

    if (!isWeb3Enabled) {
        return <div>Please connect to a supported network.</div>;
    }

    return (
        <div className="p-5">
            <Header />
            {isLoading ? (
                <p>Loading...</p>
            ) : (
                <>
                    <h1 className="text-xl font-bold">Player Dashboard</h1>
                    <p>Connected Address: {account}</p>
                    <div className="mt-3">
                        <h2 className="text-lg font-bold">Your Participation History</h2>
                        {playerHistory.length === 0

                        ? <p>You have not participated in any lotteries yet.</p>
                        : playerHistory.map((entry, index) => (
                            <div key={index}>
                                <p>Lottery Entry {index + 1}: {entry}</p>
                            </div>
                        ))
                    }
                    </div>
                    <div className="mt-3">
                        <h2 className="text-lg font-bold">Lottery Information</h2>
                        <p>Current Entrance Fee: {entranceFee} MATIC</p>
                        <p>Number of Players: {numberOfPlayers}</p>
                        <p>Most Recent Winner: {recentWinner}</p>
                    </div>
                </>
            )}
        </div>
    );
}



