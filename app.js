require('dotenv').config()
const Web3 = require('web3')
const web3 = new Web3(process.env.INFURA)

const abi = require('./abi.js')
const getEvent = require('./getEvent.js')
const getTimeByBlock = require('./getTimeByBlock.js')
const _ = require('lodash')
const BigNumber = require('bignumber.js')
const fs = require('fs')
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const FUND_ADDRESS = "0xe2fc78D330a0fEd887a6a71c2B5Dc7934135A285"
const localDB = []

const fund = new web3.eth.Contract(abi.FUND_ABI, FUND_ADDRESS)

let connectorsAddress
let connectorsAmount
let unixTime
let positionIndex = 0

// events parser
async function runEvensChecker(address, abi){
  let fundAsset
  try{
    fundAsset = await fund.methods.stableCoinAddress().call()
  }catch(e){
    fundAsset = ETH_ADDRESS
  }

  let eventsObj = await getEvent(address, abi, 0, 'allEvents', web3)

  // Check if some events in case happen for this fund address
  if(!_.isEmpty(eventsObj)){

  for(let i =0; i < eventsObj.length; i++){
  const EventName = eventsObj[i].event

  switch(EventName){
    case 'SmartFundCreated':
    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)
    increaseTokenValue(ETH_ADDRESS, 0, unixTime, 'SmartFundCreated', eventsObj[i].transactionHash)
    break

    case 'Deposit':
    // console.log(
    //   `Deposit event,
    //    amount ${eventsObj[i].returnValues[1]}`
    // )

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)
    increaseTokenValue(
      fundAsset,
      eventsObj[i].returnValues[1],
      unixTime,
      'Deposit',
      eventsObj[i].transactionHash)
    break

    case 'Withdraw':
    // console.log(
    //   `Withdraw event,
    //    cut share ${eventsObj[i].returnValues[1]}
    //    total share ${eventsObj[i].returnValues[2]}`
    // )

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)
    subWithdraw(eventsObj[i].returnValues[1], eventsObj[i].returnValues[2], unixTime, eventsObj[i].transactionHash)
    break

    case 'Trade':
    // console.log(
    //   `Trade event,
    //    src address ${eventsObj[i].returnValues[0]},
    //    dest address: ${eventsObj[i].returnValues[2]},
    //    amountSent ${eventsObj[i].returnValues[1]},
    //    amountRecieve ${eventsObj[i].returnValues[3]}
    //    `
    // )

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)
    increaseTokenValue(eventsObj[i].returnValues[2], eventsObj[i].returnValues[3], unixTime, 'Trade', eventsObj[i].transactionHash)
    reduceTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1], unixTime, 'Trade', eventsObj[i].transactionHash)
    break

    case 'BuyPool':
    // console.log(
    //   `Buy pool event,
    //    pool address ${eventsObj[i].returnValues[0]},
    //    pool amount ${eventsObj[i].returnValues[1]},
    //    connectorsAddress ${eventsObj[i].returnValues[2]},
    //    connectorsAmount${eventsObj[i].returnValues[3]}
    //    `)

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)

    // increase pool
    increaseTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1], unixTime, 'BuyPool', eventsObj[i].transactionHash)
    // reduce connectors
    connectorsAddress = eventsObj[i].returnValues[2] // JSON PARSE ???
    connectorsAmount = eventsObj[i].returnValues[3] // JSON PARSE ???
    for(let i = 0; i < connectorsAddress.length; i++){
      reduceTokenValue(connectorsAddress[i], connectorsAmount[i], unixTime, 'BuyPool', eventsObj[i].transactionHash)
    }
    break

    case 'SellPool':
    // console.log(
    //   `Sell pool event,
    //    pool address ${eventsObj[i].returnValues[0]},
    //    pool amount ${eventsObj[i].returnValues[1]},
    //    connectorsAddress ${eventsObj[i].returnValues[2]},
    //    connectorsAmount${eventsObj[i].returnValues[3]}
    //    `)

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)

    // increase connectors
    connectorsAddress = eventsObj[i].returnValues[2] // JSON PARSE ???
    connectorsAmount = eventsObj[i].returnValues[3] // JSON PARSE ???
    for(let i = 0; i < connectorsAddress.length; i++){
      increaseTokenValue(connectorsAddress[i], connectorsAmount[i], unixTime, 'SellPool', eventsObj[i].transactionHash)
    }
    // reduce pool
    reduceTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1], unixTime, 'SellPool', eventsObj[i].transactionHash)
    break

    case 'Loan':
    // console.log(
    //   `Loan event,
    //    CToken address ${eventsObj[i].returnValues[0]},
    //    CToken amount ${eventsObj[i].returnValues[1]},
    //    token address ${eventsObj[i].returnValues[2]},
    //    token amount ${eventsObj[i].returnValues[3]}`
    // )

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)

    increaseTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1], unixTime, 'Loan', ventsObj[i].transactionHash)
    reduceTokenValue(eventsObj[i].returnValues[2], eventsObj[i].returnValues[3], unixTime, 'Loan', ventsObj[i].transactionHash)
    break

    case 'Redeem':
    // console.log(
    //   `Reedem event,
    //    CToken address ${eventsObj[i].returnValues[0]},
    //    CToken amount ${eventsObj[i].returnValues[1]},
    //    token address ${eventsObj[i].returnValues[2]},
    //    token amount ${eventsObj[i].returnValues[3]}`
    // )

    unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)

    reduceTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1], unixTime, 'Redeem', eventsObj[i].transactionHash)
    increaseTokenValue(eventsObj[i].returnValues[2], eventsObj[i].returnValues[3], unixTime, 'Redeem', ventsObj[i].transactionHash)
    break


    case 'DefiCall':
     if(eventsObj[i].returnValues[0] === "YEARN_DEPOSIT"){
       // console.log(
       //   `YEARN_DEPOSIT event,
       //   tokensToSend ${eventsObj[i].returnValues[1][0]},
       //   amountsToSend ${eventsObj[i].returnValues[2][0]},
       //   tokensToReceive ${eventsObj[i].returnValues[3][0]},
       //   amountsToReceive ${eventsObj[i].returnValues[4][0]}
       //   `
       // )

       unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)

       reduceTokenValue(eventsObj[i].returnValues[1][0], eventsObj[i].returnValues[2][0], unixTime, 'YEARN_DEPOSIT', eventsObj[i].transactionHash)
       increaseTokenValue(eventsObj[i].returnValues[3][0], eventsObj[i].returnValues[4][0], unixTime, 'YEARN_DEPOSIT', ventsObj[i].transactionHash)
     }
     else if(eventsObj[i].returnValues[0] === "YEARN_WITHDRAW"){
       // console.log(
       //   `YEARN_WITHDRAW event,
       //   tokensToSend ${eventsObj[i].returnValues[1][0]},
       //   amountsToSend ${eventsObj[i].returnValues[2][0]},
       //   tokensToReceive ${eventsObj[i].returnValues[3][0]},
       //   amountsToReceive ${eventsObj[i].returnValues[4][0]}
       //   `
       // )

       unixTime = await getTimeByBlock(eventsObj[i].blockNumber, web3)

       reduceTokenValue(eventsObj[i].returnValues[1][0], eventsObj[i].returnValues[2][0], unixTime, 'YEARN_WITHDRAW', eventsObj[i].transactionHash)
       increaseTokenValue(eventsObj[i].returnValues[3][0], eventsObj[i].returnValues[4][0], unixTime, 'YEARN_WITHDRAW', eventsObj[i].transactionHash)
     }
     else{
       console.error("UNKNOWN DEFI EVENT")
     }
    break
    }
   }
  }
}


// Add amount to a certain token address
function increaseTokenValue(address, amount, unixtime, eventName, transactionHash) {
  // get address struct from local DB
  const addressStruct = localDB.filter(item => String(item.address).toLowerCase() === String(address).toLowerCase())

  // update data if such address exist in DB
  if(addressStruct.length > 0){
    const index = localDB.map(item => String(item.address).toLowerCase()).indexOf(String(address).toLowerCase())
    const prevData = addressStruct.map(item => item.data)
    const curAmount = new BigNumber(addressStruct.map(item => item.latestValue))
    const latestValue = curAmount.plus(amount).toString(10)


    localDB[index] = {
      address,
      data:[...prevData[0], {
        amount:latestValue, unixtime, eventName, action: "Increase", transactionHash
      }],
      latestValue
    }
  }
  // insert if not exist
  else{
    localDB.push(
      {
        address,
        data:[{amount, unixtime, eventName, action: 'Init', transactionHash}],
        latestValue:amount
      }
    )
  }
}


// sub amount from a certain token address
function reduceTokenValue(address, amount, unixtime, eventName, transactionHash) {
  // get address struct from local DB
  const addressStruct = localDB.filter(item => String(item.address).toLowerCase() === String(address).toLowerCase())
  const index = localDB.findIndex(item => String(item.address).toLowerCase() === String(address).toLowerCase())
  const prevData = addressStruct.map(item => item.data)
  const curAmount = new BigNumber(addressStruct.map(item => item.latestValue))
  const latestValue = curAmount.minus(amount).toString(10)

  localDB[index] = {
    address,
    data:[...prevData[0], {
      amount:latestValue, unixtime, eventName, action: "Reduce", transactionHash
    }],
    latestValue
  }
}



// sub withdrawed % from each token in DB
async function subWithdraw(cutShare, removedShare, unixtime, transactionHash){
  // calculate TOTAL_SHARES
  const TOTAL_SHARES = new BigNumber(cutShare).plus(removedShare)

  // get all token addresses from DB
  const addresses = localDB.map(item => item.address)

  // update latest balance with withdarwed
  for(let i = 0; i < addresses.length; i++){
    // get data for current address
    const address = addresses[i]
    const index = localDB.findIndex(item => String(item.address).toLowerCase() === String(address).toLowerCase())
    const latestValue = new BigNumber(localDB[index].latestValue)
    const prevData = localDB[index].data

    // calculate withdarwed
    const withdrawed = BigNumber(latestValue.minus(latestValue.multipliedBy(cutShare).dividedBy(TOTAL_SHARES))).toString(10)

    // update data for current address
    localDB[index] = {
      address,
      data:[...prevData, {
        amount:withdrawed, unixtime, eventName:'Withdraw', action: "Reduce", transactionHash
      }],
      latestValue:withdrawed
    }
  }
}


// test call
(async function main(){
  await runEvensChecker(FUND_ADDRESS, abi.FUND_ABI)

  fs.writeFileSync('./data.json', JSON.stringify(localDB, null, 2) , 'utf-8');
}())
