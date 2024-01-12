import {getConnection, releaseConnection} from "./db.js";
import {client} from './redisClient.js';
import {twitter_id} from './config.js';
import Web3 from 'web3';
import {service} from "./service.js";

const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc.merlinchain.io/"));
const tokenABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
];

async function mineralCheckWallet(addr, code) {
    const whiteAddrs = ["0xAcc3C2906EC7E2834Ad9cc7a4a8ca0e3DbAd9c16", "0xA9C8f281f6e89F501972A4dE47eCC29eDE9D0b12","0xf562BceA547F9e1eA9273dB409E760db066a4e90"];
    // placeholder
    let balance = await web3.eth.getBalance(addr);
    // placeholder
    balance = web3.utils.fromWei(balance, 'ether');
    let result=false;
    if (balance < 0.01) {
        console.log(`checkWallet-The balance of ${addr} is: ${balance} BTC`);
        result = getVOYABalance(addr);
    }else {
        result=true;
    }
    const white=await client.sIsMember("mineral_white_list",addr)
    if (white) {
        console.log("white list:",addr);
        result=true;
    }
    if (result) {
        await addMineralUser(addr);
        await service.addCodeRelation(addr, code);
    }
    return result;
}

async function addMineralUser(addr) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from mineral_users where wallet_address = ?", [addr]);
        if (resultRows.length===0){
            const [resultRows, ] = await connection.query("select * from users where wallet_address = ?", [addr]);
            const bindtwitterid=resultRows[0].twitter_id;
            let steps='step1;';
            if (bindtwitterid){
                steps='step1;step2;';
            }
            await connection.query("insert into mineral_users(wallet_address,steps) values(?,?)", [addr,steps]);
        }
    } finally {
        if (connection) {
            releaseConnection(connection)
        }
    }
}
