const { run } = require("hardhat");

const verify = async (contractAddress, args, isUpgradeable = false, proxyAddress = null) => {
  console.log("Verifying contract...");

  // Verify the implementation contract if it's upgradeable
  if (isUpgradeable) {
    console.log("Verifying implementation contract...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
      });
    } catch (e) {
      handleVerificationError(e);
    }

    console.log("Verifying proxy contract...");
    try {
      // Proxy contracts usually don't have constructor arguments
      await run("verify:verify", {
        address: proxyAddress,
      });
    } catch (e) {
      handleVerificationError(e);
    }
  } else {
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
      });
    } catch (e) {
      handleVerificationError(e);
    }
  }
};

const handleVerificationError = (e) => {
  if (e.message.toLowerCase().includes("already verified")) {
    console.log("Already verified!");
  } else {
    console.log(e);
  }
};

module.exports = {
  verify,
};
