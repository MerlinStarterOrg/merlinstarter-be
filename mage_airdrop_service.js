import {getConnection, releaseConnection} from "./db.js";
import {client} from './redisClient.js';
import {twitter_id} from './config.js';
import Web3 from 'web3';
import {service} from "./service.js";
import {checkHasJoinTgGroup, mage_tg_group_id, merlin_tg_group_id} from "./telegram.js";
import {checkHasJoinDcServer} from "./discordService.js";

const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc.merlinchain.io"));

const tokenABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
];

async function mageCheck(addr,inviteCode) {
    const whiteAddrs = ["0xAcc3C2906EC7E2834Ad9cc7a4a8ca0e3DbAd9c16", "0xA9C8f281f6e89F501972A4dE47eCC29eDE9D0b12","0xf562BceA547F9e1eA9273dB409E760db066a4e90"];
    // placeholder
    let balance = await web3.eth.getBalance(addr);
    // placeholder
    balance = web3.utils.fromWei(balance, 'ether');
    let result=false;
    if (balance > 0) {
        console.log(`checkWallet-The balance of ${addr} is: ${balance} BTC`);
        result=true;
    }
    const white=await client.sIsMember("mineral_white_list",addr)
    if (white) {
        console.log("white list:",addr);
        result=true;
    }

    return result;
}

async function addMageUser(addr,inviteCode) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from mage_users where wallet_address = ?", [addr]);
        if (resultRows.length===0){
            const [resultRows, ] = await connection.query("select * from users where wallet_address = ?", [addr]);
            const bindtwitterid=resultRows[0].twitter_id;
            let steps='step1;';
            if (bindtwitterid){
                steps='step1;step2;';
            }
            if (inviteCode){
                await connection.query("insert into mage_users(wallet_address,steps,father_code) values(?,?,?)", [addr,steps,inviteCode]);
            }else {
                await connection.query("insert into mage_users(wallet_address,steps) values(?,?)", [addr,steps]);
            }
        }
    } finally {
        if (connection) {
            releaseConnection(connection)
        }
    }
}

async function setMageBindSteps(addr,finishSteps,newSteps) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from mage_users where wallet_address = ? and steps =? ", [addr,finishSteps]);
        if (resultRows.length === 0) {
            return false;
        }
        await connection.query("update mage_users set steps = ?  where wallet_address = ?", [finishSteps+newSteps, addr]);
    } catch (err) {
        console.log("merlin swap set steps error:", err)
    } finally {
        if (connection) {
            releaseConnection(connection);
        }
    }
}

async function setMageBindStepsFinal(addr,preSteps,finalSteps) {
    let connection;
    try {
        connection = await getConnection();
        const [resultRows,] = await connection.query("select * from mage_users where wallet_address = ? and steps =? ", [addr,preSteps]);
        if (resultRows.length === 0) {
            return false;
        }
        await connection.query("update mage_users set steps = ?  where wallet_address = ?", [finalSteps, addr]);
    } catch (err) {
        console.log("setBindStepsFinal error:", err)
    } finally {
        if (connection) {
            await releaseConnection(connection);
        }
    }
}

async function MageBindingTwittet(twitterId, addr) {
    const bindResult=await service.bind(twitterId, addr);
    if (typeof bindResult === "boolean" && bindResult){
        await setMageBindSteps(addr,"step1;","step2;");
        console.log("MageBindingTwittet success,wallet:",addr," twitter:",twitterId);
        return true;
    }else {
        console.log("MageBindingTwittet fail,wallet:",addr," twitter:",twitterId," result:",bindResult);
        return false;
    }
}

async function MageInfo(addr) {
    let connection;
    try {
        connection = await getConnection();
        let [resultRows,] = await connection.query("select * from mage_users where wallet_address = ?", [addr]);
        if (resultRows.length===0){
            return {}
        }
        if(resultRows[0].steps==='step1;step2;step3;step4;'){
            const result=await checkHasJoinTgGroup( addr, merlin_tg_group_id);
            console.log("checkHasJoinTgGroup,result:",result);
            if (result===2){
                await setMageBindSteps(addr,"step1;step2;step3;step4;","step5;step6-1;");
                [resultRows,] = await connection.query("select * from mage_users where wallet_address = ?", [addr]);
            }else if (result===1){
                await setMageBindSteps(addr,"step1;step2;step3;step4;","step5-1;");
                [resultRows,] = await connection.query("select * from mage_users where wallet_address = ?", [addr]);
            }
        }else if(resultRows[0].steps==='step1;step2;step3;step4;step5;step6-1;'){
            const result=await checkHasJoinTgGroup( addr, mage_tg_group_id);
            if (result===2){
                await setMageBindStepsFinal(addr,"step1;step2;step3;step4;step5;step6-1","step1;step2;step3;step4;step5;step6;");
            }
            [resultRows,] = await connection.query("select * from mage_users where wallet_address = ?", [addr]);
        }
        let inviteSize=0;
        let [users,] = await connection.query("select * from users where wallet_address = ?", [addr]);
        if (users.length>0 && users[0].invite_code){
            const [inviteRows,]=await connection.query("select * from mage_users where father_code=?",[users[0].invite_code]);
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


async function follow_merlin_twitter(addr) {
    await setMageBindSteps(addr,"step1;step2;","step3;")
}

async function follow_mage_twitter(addr) {
    await setMageBindSteps(addr,"step1;step2;step3;","step4;")
}

async function post_mage_tweet(addr) {
    await setMageBindSteps(addr,"step1;step2;step3;step4;step5;step6;","step7;claimed;")
}


export {mageCheck, addMageUser,MageInfo,MageBindingTwittet,follow_merlin_twitter,follow_mage_twitter,setMageBindStepsFinal,post_mage_tweet,setMageBindSteps}