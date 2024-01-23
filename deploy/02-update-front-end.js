const { ethers, network } = require("hardhat")
const fs = require("fs")
const path = require("path")

// Front-end paths
const frontEndContractsFile = path.join(
    __dirname,
    "../nextjs-smartcontract-lottery/constants/contractAddresses.json"
)
const frontEndAbiFile = path.join(__dirname, "../nextjs-smartcontract-lottery/constants/abi.json")

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        try {
            await updateContractAddresses()
            await updateAbi()
            console.log("Front end updated successfully!")
        } catch (error) {
            console.error("Error updating the front end:", error)
        }
    }
}

async function updateContractAddresses() {
    try {
        const raffle = await ethers.getContract("Raffle")
        const chainId = network.config.chainId.toString()
        let contractAddresses = {}

        if (fs.existsSync(frontEndContractsFile)) {
            contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
        }

        contractAddresses[chainId] = contractAddresses[chainId] || []
        if (!contractAddresses[chainId].includes(raffle.address)) {
            contractAddresses[chainId].push(raffle.address)
        }

        fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses, null, 2))
    } catch (error) {
        console.error("Error updating contract addresses:", error)
        throw error
    }
}

async function updateAbi() {
    try {
        const raffle = await ethers.getContract("Raffle")
        const raffleAbi = raffle.interface.format(ethers.utils.FormatTypes.json)
        let abis = []

        if (fs.existsSync(frontEndAbiFile)) {
            abis = JSON.parse(fs.readFileSync(frontEndAbiFile, "utf8"))
        }

        abis.push(raffleAbi)
        fs.writeFileSync(frontEndAbiFile, JSON.stringify(abis, null, 2))
    } catch (error) {
        console.error("Error updating ABI:", error)
        throw error
    }
}

module.exports.tags = ["all", "frontend"]
