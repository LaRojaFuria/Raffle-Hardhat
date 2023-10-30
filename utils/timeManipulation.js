const ethers = require('ethers');

async function advanceTimeAndBlock(time) {
    await ethers.provider.send("evm_increaseTime", [time]);
    await ethers.provider.send("evm_mine");
}

module.exports = {
    advanceTimeAndBlock
};
