import { contractAddresses, abi } from "../constants";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { useEffect, useState } from "react";
import { useNotification } from "web3uikit";
import { ethers } from "ethers";

export default function LotteryEntrance() {
    const { isWeb3Enabled, chainId: chainIdHex, Moralis } = useMoralis();
    const chainId = parseInt(chainIdHex);
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null;

    const [entranceFee, setEntranceFee] = useState("0");
    const [numberOfPlayers, setNumberOfPlayers] = useState("0");
    const [recentWinner, setRecentWinner] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const dispatch = useNotification();

    const { runContractFunction: enterRaffle } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "enterRaffle",
        msgValue: entranceFee,
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
        if (isWeb3Enabled && raffleAddress) {
            setIsLoading(true);
            updateUIValues().finally(() => setIsLoading(false));
        }
    }, [isWeb3Enabled, raffleAddress, chainId]);

    async function updateUIValues() {
        try {
            const entranceFeeFromCall = await getEntranceFee();
            const numPlayersFromCall = await getPlayersNumber();
            const recentWinnerFromCall = await getRecentWinner();

            setEntranceFee(entranceFeeFromCall.toString());
            setNumberOfPlayers(numPlayersFromCall.toString());
            setRecentWinner(recentWinnerFromCall);
        } catch (error) {
            console.error("Error updating UI values:", error);
            dispatchErrorNotification(error);
        }
    }

    const handleEnterRaffle = async () => {
        try {
            const userBalance = await Moralis.Web3API.account.getNativeBalance({ chain: chainIdHex });
            if (new ethers.BigNumber.from(userBalance.balance).lt(entranceFee)) {
                dispatchErrorNotification({ message: "Insufficient funds to enter the raffle." });
                return;
            }

            await enterRaffle({
                onSuccess: handleSuccess,
                onError: (error) => dispatchErrorNotification(error),
            });
        } catch (error) {
            console.error("Error on entering raffle:", error);
            dispatchErrorNotification(error);
        }
    };

    const handleSuccess = async (tx) => {
        await tx.wait(1);
        updateUIValues();
        dispatchNotification();
    };

    const dispatchNotification = () => {
        dispatch({
            type: "info",
            message: "Transaction Complete!",
            title: "Transaction Notification",
            position: "topR",
            icon: "bell",
        });
    };

    const dispatchErrorNotification = (error) => {
        dispatch({
            type: "error",
            message: error.message || "An error occurred",
            title: "Error Notification",
            position: "topR",
            icon: "bell",
        });
    };

    if (!raffleAddress) {
        return <div>Please connect to a supported chain.</div>;
    }

    return (
        <div className="p-5">
            <h1 className="py-4 px-4 font-bold text-3xl">Lottery Entrance</h1>
            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
                onClick={handleEnterRaffle}
                aria-label="Enter Raffle"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
                ) : (
                    "Enter Raffle"
                )}
            </button>
            <div>Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} MATIC</div>
            <div>Number of Players: {numberOfPlayers}</div>
            <div>Recent Winner: {recentWinner}</div>
        </div>
    );
}
