const struct = [
  {
    address:"0x1",
    data:[{a:1, b:2}]
  },
  {
    address:"0x2",
    data:[{a:2, b:3}]
  },
]

const item =  struct.filter(item => item.address === "0x1")
const certainItem = item.map(item => item.data)
console.log( certainItem)
