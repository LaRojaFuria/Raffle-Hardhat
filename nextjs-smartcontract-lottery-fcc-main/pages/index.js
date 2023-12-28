import Head from "next/head";
import styles from "../styles/Home.module.css";
import Header from "../components/Header";
import LotteryEntrance from "../components/LotteryEntrance";
import { useMoralis } from "react-moralis";
import Link from 'next/link';

const supportedChains = ["31337", "11155111", "137", "80001"]; // Add Polygon mainnet and testnet IDs

export default function Home() {
  const { isWeb3Enabled, chainId, isWeb3EnableLoading } = useMoralis();

  const networkNames = {
    "31337": "Localhost",
    "11155111": "Custom Network",
    "137": "Polygon Mainnet",
    "80001": "Polygon Testnet",
  };

  if (isWeb3EnableLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Decentralized Lottery App</title>
        <meta name="description" content="Participate in a decentralized lottery using MATIC. Secure and automated with Chainlink and smart contracts." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      {isWeb3Enabled ? (
        <>
          {supportedChains.includes(parseInt(chainId).toString()) ? (
            <div className="flex flex-col items-center">
              <LotteryEntrance className="p-8" />
              <div className="mt-4">
                <Link href="/player-dashboard">
                  <a className="text-blue-500 hover:text-blue-700" aria-label="Player Dashboard">Player Dashboard</a>
                </Link> | 
                <Link href="/admin-panel">
                  <a className="text-blue-500 hover:text-blue-700" aria-label="Admin Panel">Admin Panel</a>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {`Please switch to a supported chain. Supported chains are: ${
                Object.values(networkNames).join(", ")
              }.`}
            </div>
          )}
        </>
      ) : (
        <div>Please connect to a Wallet</div>
      )}
    </div>
  );
}
