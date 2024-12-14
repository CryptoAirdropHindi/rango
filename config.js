
// config 

const privateKey = "YOUR-PRIVATE-KEY"; // enter your private key here
const address = "YOUR-EVM-ADDRESS" // enter your address here
const amount = '0.0001'; // amount you want to bridge each time

// SOME NETWORK NEED FEE 0.0005 ETH EACH BRIDGE SO CHOOSE CAREFULLY
// NETWORK OPTIONS: "BASE", "ARBITRUM", "LINEA", "ZKSYNC", "OPTIMISM", "MODE", "SCROLL"

const bridgeFrom = "ARBITRUM"; // the network you want to bridge from
const bridgeTo = "BASE"; // the network you want to bridge to

export { privateKey, address, amount, bridgeFrom, bridgeTo }
