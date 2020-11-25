// get events helper
module.exports = async (address, abi, fromBlock, eventName, web3) => {
const isAddress =	web3.utils.isAddress(address)
if(isAddress){
const contract = new web3.eth.Contract(abi, address)
 try {
   let getEvent = await contract.getPastEvents(
    eventName,
    {
      fromBlock: fromBlock,
      toBlock: 'latest'
    }
   )
  return getEvent
  }
  catch(err){
  return new Error(err);
}
}
else{
	return new Error("Not correct address");
}
}
