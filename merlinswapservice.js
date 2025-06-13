import {getConnection, releaseConnection} from "./db.js";
import {client} from './redisClient.js';
import {twitter_id} from './config.js';
import Web3 from 'web3';
import {service} from "./service.js";
import {checkHasJoinTgGroup, merlin_tg_group_id} from "./telegram.js";
import {checkHasJoinDcServer} from "./discordService.js";

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

async function merlinswapCheck(addr,inviteCode) {
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

    return result;
}

async function checkStarters(addr){
    let connection;
    try{
        connection=await getConnection();
        const [resultRows,] = await connection.query("select * from users where wallet_address = ? and stars>=500", [addr]);
        if (resultRows.length>0){
            return true;
        }
        return false;
    }finally {
        if (connection){
            releaseConnection(connection);
        }

    }
}
async function addMerlinswapUser(addr,inviteCode) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from merlin_swap_users where wallet_address = ?", [addr]);
        if (resultRows.length===0){
            const [resultRows, ] = await connection.query("select * from users where wallet_address = ?", [addr]);
            const bindtwitterid=resultRows[0].twitter_id;
            let steps='step1;';
            if (bindtwitterid){
                steps='step1;step2;';
            }
            if (inviteCode){
                await connection.query("insert into merlin_swap_users(wallet_address,steps,father_code) values(?,?,?)", [addr,steps,inviteCode]);
            }else {
                await connection.query("insert into merlin_swap_users(wallet_address,steps) values(?,?)", [addr,steps]);
            }
        }
    } finally {
        if (connection) {
            releaseConnection(connection)
        }
    }
}

async function setMerlinswapBindSteps(addr,finishSteps,newSteps) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from merlin_swap_users where wallet_address = ? and steps =? ", [addr,finishSteps]);
        if (resultRows.length === 0) {
            return false;
        }
        await connection.query("update merlin_swap_users set steps = ?  where wallet_address = ?", [finishSteps+newSteps, addr]);
    } catch (err) {
        console.log("merlin swap set steps error:", err)
    } finally {
        if (connection) {
            releaseConnection(connection);
        }
    }
}

async function setMerlinswapBindStepsFinal(addr,preSteps,finalSteps) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from merlin_swap_users where wallet_address = ? and steps =? ", [addr,preSteps]);
        if (resultRows.length === 0) {
            return false;
        }
        await connection.query("update merlin_swap_users set steps = ?  where wallet_address = ?", [finalSteps, addr]);
    } catch (err) {
        console.log("setBindStepsFinal error:", err)
    } finally {
        if (connection) {
            await releaseConnection(connection);
        }
    }
}

async function merlinSwapBindingTwittet(twitterId, addr) {
    await service.bind(twitterId, addr);
    await setMerlinswapBindSteps(addr,"step1;","step2;");
}

async function merlinSwapInfo(addr) {
    let connection;
    try {
        connection = await getConnection();
        let [resultRows,] = await connection.query("select * from merlin_swap_users where wallet_address = ?", [addr]);
        if (resultRows.length===0){
            return {}
        }
        if(resultRows[0].steps==='step1;step2;step3;step4;'){
            const result=await checkHasJoinTgGroup( addr, merlin_tg_group_id);
            console.log("checkHasJoinTgGroup,result:",result);
            if (result===2){
                await setMerlinswapBindSteps(addr,"step1;step2;step3;step4;","step5;")
            }else if (result===1){
                await setMerlinswapBindSteps(addr,"step1;step2;step3;step4;","step5-1;")
            }
            [resultRows,] = await connection.query("select * from merlin_swap_users where wallet_address = ?", [addr]);
        }else if(resultRows[0].steps==='step1;step2;step3;step4;step5;'){
            const dccheck=await checkHasJoinDcServer(addr,"1204999197582163988");
            if (dccheck===2){
                await setMerlinswapBindStepsFinal(addr,"step1;step2;step3;step4;step5;","step1;step2;step3;step4;step5;step6;");
            }else if(dccheck===1) {
                await setMerlinswapBindStepsFinal(addr,"step1;step2;step3;step4;step5;","step1;step2;step3;step4;step5;step6-1;");
            }
            [resultRows,] = await connection.query("select * from merlin_swap_users where wallet_address = ?", [addr]);
        }
        let inviteSize=0;
        let [users,] = await connection.query("select * from users where wallet_address = ?", [addr]);
        if (users.length>0 && users[0].invite_code){
            const [inviteRows,]=await connection.query("select * from merlin_swap_users where father_code=?",[users[0].invite_code]);
            inviteSize=inviteRows.length;
        }
        return {
            'stars': resultRows[0].points,
            "steps": resultRows[0].steps,
            "draw": resultRows[0].is_draw,
            "inviteSize":inviteSize
        };
    } catch (err) {
        console.log("info Error", err)
    } finally {
        if (connection) {
            releaseConnection(connection);
        }
    }
}

async function getVOYABalance(addr) {
    const voyaAddr = "0x480E158395cC5b41e5584347c495584cA2cAf78d";
    const tokenContract = new web3.eth.Contract(tokenABI, voyaAddr);
    const balance = await tokenContract.methods.balanceOf(addr).call();
    const balanceInEther = web3.utils.fromWei(balance, 'ether');
    console.log(`Address: ${addr} VOYA Balance: ${balanceInEther} Tokens`);
    return balanceInEther > 100.0;
}

async function merlin_swap_follow_merlin_twitter(addr) {
    await setMerlinswapBindSteps(addr,"step1;step2;","step3;")
}

async function merlin_swap_follow_merlin_swap_twitter(addr) {
    await setMerlinswapBindSteps(addr,"step1;step2;step3;","step4;")
}

async function merlin_swap_post_tweet(addr) {
    await setMerlinswapBindSteps(addr,"step1;step2;step3;step4;step5;step6;","step7;claimed;")
}



// await getVOYABalance("0xC882b111A75C0c657fC507C04FbFcD2cC984F071")

export {merlinswapCheck, checkStarters,merlinSwapInfo,merlinSwapBindingTwittet,merlin_swap_follow_merlin_twitter,merlin_swap_follow_merlin_swap_twitter,setMerlinswapBindSteps,setMerlinswapBindStepsFinal,merlin_swap_post_tweet,addMerlinswapUser}
