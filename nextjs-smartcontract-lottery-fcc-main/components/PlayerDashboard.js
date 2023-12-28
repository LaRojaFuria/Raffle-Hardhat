import { useMoralis, useWeb3Contract } from "react-moralis";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractAddresses, abi } from "../constants";

export default function PlayerDashboard() {
    const { user, isAuthenticated, chainId: chainIdHex } = useMoralis();
    const [participationHistory, setParticipationHistory] = useState([]);
    const [entranceFee, setEntranceFee] = useState("0");
    const [numberOfPlayers, setNumberOfPlayers] = useState("0");
    const [recentWinner, setRecentWinner] = useState("");
    const chainId = parseInt(chainIdHex);
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null;

    const { runContractFunction: getPlayerHistory } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getPlayerHistory",
        params: { player: user?.get("ethAddress") },
    });

    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},
    });

    const { runContractFunction: getPlayersNumber } = useWeb3Contract({
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
        if (isAuthenticated && user) {
            updateUI();
        }
    }, [user, isAuthenticated]);

    async function updateUI() {
        const history = await getPlayerHistory();
        setParticipationHistory(history);

        const fee = await getEntranceFee();
        setEntranceFee(ethers.utils.formatUnits(fee, "ether"));

        const playersNum = await getPlayersNumber();
        setNumberOfPlayers(playersNum.toString());

        const winner = await getRecentWinner();
        setRecentWinner(winner);
    }

    if (!isAuthenticated) {
        return <div>Please connect your wallet to access the dashboard.</div>;
    }

    return (
        <div className="p-5">
            <h1 className="text-xl font-bold mb-4">Player Dashboard</h1>
            <h2>Welcome, {user.get("username")}</h2>
            <div>
                <h3 className="text-lg font-bold">Your Participation History</h3>
                {participationHistory.length === 0 ? (
                    <p>You have not participated in any lotteries yet.</p>
                ) : (
                    participationHistory.map((entry, index) => (
                        <div key={index}>
                            <p>Entry {index + 1}: {entry}</p>
                        </div>
                    ))
                )}
            </div>
            <div>
                <h3 className="text-lg font-bold">Raffle Information</h3>
                <p>Entrance Fee: {entranceFee} MATIC</p>
                <p>Number of Players: {numberOfPlayers}</p>
                <p>Recent Winner: {recentWinner}</p>
            </div>
        </div>
    );
}
