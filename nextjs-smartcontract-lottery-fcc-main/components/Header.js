import { ConnectButton } from "web3uikit"
import Link from "next/link"

export default function Header() {
    return (
        <nav className="p-5 border-b-2 flex flex-row">
            <h1 className="py-4 px-4 font-bold text-3xl">Decentralized Lottery</h1>
            <div className="flex-grow">
                <ul className="flex flex-row justify-end">
                    <li className="mx-2">
                        <Link href="/player-dashboard">
                            <a className="text-blue-500 hover:text-blue-700">Player Dashboard</a>
                        </Link>
                    </li>
                    <li className="mx-2">
                        <Link href="/admin-panel">
                            <a className="text-blue-500 hover:text-blue-700">Admin Panel</a>
                        </Link>
                    </li>
                </ul>
            </div>
            <div className="py-2 px-4">
                <ConnectButton moralisAuth={false} />
            </div>
        </nav>
    )
}
