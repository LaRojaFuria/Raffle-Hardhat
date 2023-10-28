const { frontEndContractsFile, frontEndAbiFile } = require("../helper-hardhat-config")
const fs = require("fs")
const { network } = require("hardhat")

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end updated!")
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    let abis = []

    // Check if the ABI file already exists
    if (fs.existsSync(frontEndAbiFile)) {
        abis = JSON.parse(fs.readFileSync(frontEndAbiFile, "utf8"))
    }

    abis.push(raffle.interface.format(ethers.utils.FormatTypes.json))
    fs.writeFileSync(frontEndAbiFile, JSON.stringify(abis, null, 2))
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    let contractAddresses = {}

    if (fs.existsSync(frontEndContractsFile)) {
        contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    }

    if (!contractAddresses[network.config.chainId]) {
        contractAddresses[network.config.chainId] = []
    }

    if (!contractAddresses[network.config.chainId].includes(raffle.address)) {
        contractAddresses[network.config.chainId].push(raffle.address)
    }

    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses, null, 2))
}

module.exports.tags = ["all", "frontend"]
