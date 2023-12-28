import { useEffect } from "react"
import { useMoralis } from "react-moralis"
import Link from "next/link"

export default function ManualHeader() {
    const { enableWeb3, isWeb3Enabled, isWeb3EnableLoading, account, Moralis, deactivateWeb3 } =
        useMoralis()

    useEffect(() => {
        if (
            !isWeb3Enabled &&
            typeof window !== "undefined" &&
            window.localStorage.getItem("connected")
        ) {
            enableWeb3()
        }
    }, [isWeb3Enabled])

    useEffect(() => {
        Moralis.onAccountChanged((newAccount) => {
            if (newAccount == null) {
                window.localStorage.removeItem("connected")
                deactivateWeb3()
            }
        })
    }, [])

    return (
        <nav className="p-5 border-b-2">
            <ul className="flex flex-row">
                <li className="mr-auto py-2 px-4 font-bold text-3xl">Decentralized Lottery</li>
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
                <li>
                    {account ? (
                        <div>
                            Connected to {account.slice(0, 6)}...
                            {account.slice(account.length - 4)}
                        </div>
                    ) : (
                        <button
                            onClick={async () => {
                                const ret = await enableWeb3()
                                if (typeof ret !== "undefined") {
                                    window.localStorage.setItem("connected", "injected")
                                }
                            }}
                            disabled={isWeb3EnableLoading}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Connect
                        </button>
                    )}
                </li>
            </ul>
        </nav>
    )
}
