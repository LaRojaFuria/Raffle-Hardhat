const { run } = require("hardhat");
const axios = require("axios");

const ETHERSCAN_API_URL = "https://api.etherscan.io/api"; // Adjust for other networks if needed

const verify = async (contractAddress, args, isUpgradeable = false, proxyAddress = null) => {
  console.log(`Verifying contract at address: ${contractAddress}`);

  if (await isContractVerified(contractAddress)) {
    console.log(`Contract ${contractAddress} is already verified!`);
    return;
  }

  if (isUpgradeable) {
    await verifyContract(contractAddress, args, "implementation contract");
    await verifyContract(proxyAddress, [], "proxy contract");
  } else {
    await verifyContract(contractAddress, args, "contract");
  }
};

const verifyContract = async (address, args, contractType) => {
  console.log(`Verifying ${contractType} at address: ${address}`);
  try {
    await run("verify:verify", {
      address,
      constructorArguments: args,
    });
    console.log(`Verification successful for ${contractType} at address: ${address}`);
  } catch (e) {
    handleVerificationError(e, address);
  }
};

const handleVerificationError = (e, address) => {
  if (e.message.toLowerCase().includes("already verified")) {
    console.log(`Contract ${address} is already verified!`);
  } else {
    console.error(`Error verifying contract ${address}:`, e);
  }
};

const isContractVerified = async (address) => {
  try {
    const response = await axios.get(ETHERSCAN_API_URL, {
      params: {
        module: "contract",
        action: "getabi",
        address: address,
        apiKey: process.env.ETHERSCAN_API_KEY,
      },
    });

    return response.data.status !== "0";
  } catch (e) {
    console.error(`Error checking verification status for contract ${address}:`, e);
    return false;
  }
};

module.exports = {
  verify,
};
