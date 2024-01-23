import { ConnectButton } from "web3uikit";
import Link from "next/link";
import { useMoralis } from "react-moralis";

export default function Header() {
    const { account } = useMoralis();

    const isAdmin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS === account; // Replace with actual admin address

    return (
        <nav className="p-5 border-b-2 flex flex-row">
            <h1 className="py-4 px-4 font-bold text-3xl">Decentralized Lottery</h1>
            <div className="flex-grow">
                <ul className="flex flex-row justify-end">
                    <li className="mx-2">
                        <Link href="/player-dashboard">
                            <a className="text-blue-500 hover:text-blue-700" aria-label="Player Dashboard">Player Dashboard</a>
                        </Link>
                    </li>
                    {isAdmin && (
                        <li className="mx-2">
                            <Link href="/admin-panel">
                                <a className="text-blue-500 hover:text-blue-700" aria-label="Admin Panel">Admin Panel</a>
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
            <div className="py-2 px-4">
                <ConnectButton moralisAuth={false} />
                {account && (
                    <p className="text-sm text-gray-600">Connected as: {account}</p>
                )}
            </div>
        </nav>
    );
}
