import { MoralisProvider } from "react-moralis";
import { NotificationProvider } from "web3uikit";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <MoralisProvider initializeOnMount={false}>
      <NotificationProvider>
        <div className="lotteryBackground">
          <Component {...pageProps} />
        </div>
      </NotificationProvider>
    </MoralisProvider>
  );
}

export default MyApp;
