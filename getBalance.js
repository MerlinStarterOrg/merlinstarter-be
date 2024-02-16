
import Web3 from 'web3';


// placeholder
const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc.merlinchain.io/"));

// placeholder
async function getBalance(address) {
    try {
        // placeholder
        let balance = await web3.eth.getBalance(address);
        // placeholder
        balance = web3.utils.fromWei(balance, 'ether');
        console.log(`The balance of ${address} is: ${balance} BTC`);
        if(balance>=0.0001){
            console.log("余额大于0.0001BTC")
        }
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
    }
}

// placeholder
getBalance("0xE58b318D8a37c53F86534a33BfAeefeA4Bba1111");