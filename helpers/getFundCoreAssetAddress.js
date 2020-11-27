const abi  = require('../abi.js')
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'


module.exports = async (fundAddress, web3) => {
  const smartfund = new web3.eth.Contract(abi.FUND_ABI, fundAddress)
  // get version
  let version
  try{
    version = await smartfund.methods.version().call()
    version = Number(version)
  }catch(e){
    version = 1
  }

  // get main asset depense of fund version
  if(version >= 6){
    const coreFundAsset = await smartfund.methods.coreFundAsset().call()
    return coreFundAsset
  }
  else if(version === 4 || version === 5) {
    const fundV_4_5 = new web3.eth.Contract(abi.SmartFundUSDABI_V_4_5, fundAddress)
    try{
      return await fundV_4_5.methods.stableCoinAddress().call()
    }
    catch(e){
      return ETH_ADDRESS
    }
  }
  else{
    return ETH_ADDRESS
  }
}
