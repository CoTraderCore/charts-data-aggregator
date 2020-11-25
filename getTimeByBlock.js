module.exports = async (block, web3) => {
  const data = await web3.eth.getBlock(block)
  return data.timestamp
}
