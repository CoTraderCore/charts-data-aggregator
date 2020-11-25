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
    case 'Deposit':
    console.log(
      `Deposit event,
       amount ${eventsObj[i].returnValues[1]}`
    )

    // test parse time from event 
    const time = await getTimeByBlock(eventsObj[i].blockNumber, web3)
    console.log("timestamp", time, 'blockNumber', eventsObj[i].blockNumber)

    insertOrIncreaseTokenValue(fundAsset, eventsObj[i].returnValues[1])
    break

    case 'Withdraw':
    console.log(
      `Withdraw event,
       cut share ${eventsObj[i].returnValues[1]}
       total share ${eventsObj[i].returnValues[2]}`
    )

    subWithdraw(eventsObj[i].returnValues[1], eventsObj[i].returnValues[2])
    break

    case 'Trade':
    console.log(
      `Trade event,
       src address ${eventsObj[i].returnValues[0]},
       dest address: ${eventsObj[i].returnValues[2]},
       amountSent ${eventsObj[i].returnValues[1]},
       amountRecieve ${eventsObj[i].returnValues[3]}
       `
    )
    insertOrIncreaseTokenValue(eventsObj[i].returnValues[2], eventsObj[i].returnValues[3])
    reduceTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1])
    break

    case 'BuyPool':
    console.log(
      `Buy pool event,
       pool address ${eventsObj[i].returnValues[0]},
       pool amount ${eventsObj[i].returnValues[1]},
       connectorsAddress ${eventsObj[i].returnValues[2]},
       connectorsAmount${eventsObj[i].returnValues[3]}
       `)

    // increase pool
    insertOrIncreaseTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1])
    // reduce connectors
    connectorsAddress = eventsObj[i].returnValues[2] // JSON PARSE ???
    connectorsAmount = eventsObj[i].returnValues[3] // JSON PARSE ???
    for(let i = 0; i < connectorsAddress.length; i++){
      reduceTokenValue(connectorsAddress[i], connectorsAmount[i])
    }
    break

    case 'SellPool':
    console.log(
      `Sell pool event,
       pool address ${eventsObj[i].returnValues[0]},
       pool amount ${eventsObj[i].returnValues[1]},
       connectorsAddress ${eventsObj[i].returnValues[2]},
       connectorsAmount${eventsObj[i].returnValues[3]}
       `)

    // increase connectors
    connectorsAddress = eventsObj[i].returnValues[2] // JSON PARSE ???
    connectorsAmount = eventsObj[i].returnValues[3] // JSON PARSE ???
    for(let i = 0; i < connectorsAddress.length; i++){
      insertOrIncreaseTokenValue(connectorsAddress[i], connectorsAmount[i])
    }
    // reduce pool
    reduceTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1])
    break

    case 'Loan':
    console.log(
      `Loan event,
       CToken address ${eventsObj[i].returnValues[0]},
       CToken amount ${eventsObj[i].returnValues[1]},
       token address ${eventsObj[i].returnValues[2]},
       token amount ${eventsObj[i].returnValues[3]}`
    )

    insertOrIncreaseTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1])
    reduceTokenValue(eventsObj[i].returnValues[2], eventsObj[i].returnValues[3])
    break

    case 'Redeem':
    console.log(
      `Reedem event,
       CToken address ${eventsObj[i].returnValues[0]},
       CToken amount ${eventsObj[i].returnValues[1]},
       token address ${eventsObj[i].returnValues[2]},
       token amount ${eventsObj[i].returnValues[3]}`
    )

    reduceTokenValue(eventsObj[i].returnValues[0], eventsObj[i].returnValues[1])
    insertOrIncreaseTokenValue(eventsObj[i].returnValues[2], eventsObj[i].returnValues[3])
    break


    case 'DefiCall':
     if(eventsObj[i].returnValues[0] === "YEARN_DEPOSIT"){
       console.log(
         `YEARN_DEPOSIT event,
         tokensToSend ${eventsObj[i].returnValues[1][0]},
         amountsToSend ${eventsObj[i].returnValues[2][0]},
         tokensToReceive ${eventsObj[i].returnValues[3][0]},
         amountsToReceive ${eventsObj[i].returnValues[4][0]}
         `
       )

       reduceTokenValue(eventsObj[i].returnValues[1][0], eventsObj[i].returnValues[2][0])
       insertOrIncreaseTokenValue(eventsObj[i].returnValues[3][0], eventsObj[i].returnValues[4][0])
     }
     else if(eventsObj[i].returnValues[0] === "YEARN_WITHDRAW"){
       console.log(
         `YEARN_WITHDRAW event,
         tokensToSend ${eventsObj[i].returnValues[1][0]},
         amountsToSend ${eventsObj[i].returnValues[2][0]},
         tokensToReceive ${eventsObj[i].returnValues[3][0]},
         amountsToReceive ${eventsObj[i].returnValues[4][0]}
         `
       )

       reduceTokenValue(eventsObj[i].returnValues[1][0], eventsObj[i].returnValues[2][0])
       insertOrIncreaseTokenValue(eventsObj[i].returnValues[3][0], eventsObj[i].returnValues[4][0])
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
function insertOrIncreaseTokenValue(address, amount) {
  const searchObj = localDB.filter((item) => {
    return item.address === address
  })

  if(searchObj.length > 0){
    // update amount
    let curAmount = new BigNumber(searchObj[0].amount)
    searchObj[0].amount = curAmount.plus(amount).toString(10)
  }else{
    // insert
    localDB.push(
      { address, amount }
    )
  }
}


// sub amount from a certain token address
function reduceTokenValue(address, amount) {
  const searchObj = localDB.filter((item) => {
    return item.address === address
  })

  if(searchObj.length > 0){
    // update amount
    let curAmount = new BigNumber(searchObj[0].amount)
    searchObj[0].amount = curAmount.minus(amount).toString(10)
  }
}



// sub withdrawed % from each token in DB
async function subWithdraw(cutShare, removedShare){
  let TOTAL_SHARES = new BigNumber(cutShare).plus(removedShare)

  localDB.forEach((item) => {
    let amount = new BigNumber(item.amount)
    item.amount = BigNumber(amount.minus(amount.multipliedBy(cutShare).dividedBy(TOTAL_SHARES))).toString(10)
  })
}


// TODO
function compareBalanceFromContractAndLocalDB(){
  return
}



// test call
(async function main(){
  await runEvensChecker(FUND_ADDRESS, abi.FUND_ABI)

  fs.writeFileSync('./data.json', JSON.stringify(localDB, null, 2) , 'utf-8');
}())
