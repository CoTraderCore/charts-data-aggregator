 async function dateTimer(start){
  const now = Math.floor(Date.now() / 1000)
  const oneDay = 24*60*60

  let timer = start

  do {
  console.log(new Date(timer * 1000).toLocaleDateString("en-US"))
  // Do action here 
  timer = timer + oneDay
  }
  while (timer < now);
}

dateTimer(1601761721)
