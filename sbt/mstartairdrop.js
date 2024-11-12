import {getConnection, releaseConnection} from "../db.js";
import Web3 from "web3";
import {claimConfig} from "../config.js";
import {AbiCoder, ethers} from "ethers";
import {keccak256} from "web3-utils";
import {service} from "../service.js";

async function unlockToken(){
    let connection;
    try {
        connection=await getConnection();
        const [lockrecords,]=await connection.query("select * from wallet_lock_balance w where w.remain_days>0 and balance>=unfreeze_amount",[]);
        console.log("unlockToken start,records:",lockrecords.length);
        for (const lockrecord of lockrecords){
            console.log("realse wallet:",lockrecord.wallet_address," remain days:",lockrecord.remain_days);
            const [unlockResult,]=await connection.query("update wallet_lock_balance w set w.balance=w.balance-unfreeze_amount,w.remain_days=w.remain_days-1,realse_amount=realse_amount+unfreeze_amount where w.balance>=unfreeze_amount and w.remain_days>0 and wallet_address=?",[lockrecord.wallet_address]);
            if (unlockResult.affectedRows===0){
                continue;
            }
            const [claimbalance,]=await connection.query("select * from wallet_claim_balance where wallet_address=?",[lockrecord.wallet_address]);
            if (claimbalance.length==0){
                await connection.query("insert into wallet_claim_balance(balance,wallet_address) values(?,?)",[lockrecord.unfreeze_amount,lockrecord.wallet_address]);
            }else {
                await connection.query("update wallet_claim_balance  set balance=balance+? where wallet_address=?",[lockrecord.unfreeze_amount,lockrecord.wallet_address]);
            }
            await connection.query("insert into wallet_unlock_record(wallet_address,amount,unlock_day) VALUES(?,?,?)",[lockrecord.wallet_address,lockrecord.unfreeze_amount,lockrecord.remain_days]);
        }
        // await connection.commit();
    }catch (err){
        console.log("unlock token error,",err);
        // await connection.rollback();
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }
}

async function claimToken(walletAddress,nonce,exiprets){
    let connection;
    try {
        connection=await getConnection();
        await connection.beginTransaction();
        const [wbs,]=await connection.query("select * from wallet_claim_balance  where balance>0 and wallet_address=?",[walletAddress]);
        if (wbs.length>0){
            const wb=wbs[0];
            const balance=wb.balance;
            const [updateResult,]=await connection.query("update wallet_claim_balance b set b.balance=b.balance-?,freeze=freeze+? where wallet_address=? and balance>=?",[balance,balance,walletAddress,balance]);
            if (updateResult.affectedRows===0){
                await connection.rollback();
                console.log("rollback update balance,wallet:",walletAddress);
                return {amount:0};
            }
            const [insertResult,]=await connection.query("insert into wallet_claim_record(wallet_address,amount,nonce,expire_at) VALUES(?,?,?,?)",[walletAddress,balance,nonce,exiprets]);
            console.log(insertResult);
            if (insertResult.affectedRows===0){
                await connection.rollback();
                console.log("rollback insert claim record,wallet:",walletAddress);
                return {amount:0};
            }
            // await connection.rollback();
            // console.log("updateResult:",updateResult," insertResult:",insertResult);
            await connection.commit();
            console.log("wallet:",walletAddress," claim:",balance);
            const recordId=insertResult.insertId;
            return {amount:balance,recordId:recordId};
        }
    }catch (err){
        await connection.rollback();
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }
    return {amount:0};
}

async function confirmClaimResult(){
    let connection;
    try {
        connection=await getConnection();
        // await connection.beginTransaction();
        const beforeTs=Date.now()-1000*60*5;
        const [crs,]=await connection.query("select * from wallet_claim_record where expire_at<? and result=0",[beforeTs]);
        console.log("expire claim records:",crs.length);
        for(const cr of crs){
            const walletAddress=cr.wallet_address;
            const amount=cr.amount;
            const web3 = new Web3(new Web3.providers.HttpProvider(claimConfig.rpc));
            const contractAddress = claimConfig.contract;
            const claimRewardContract = new web3.eth.Contract(claimConfig.abi, contractAddress);
            // console.log("wallet:",walletAddress,"db nonce:",cr.nonce);
            //let nonce = await claimRewardContract.methods.nonces(walletAddress).call();
            const recordId=cr.id;
            const claimAddress=await claimRewardContract.methods.claimedRecord(recordId).call();
            console.log("claimAddress:",claimAddress,"recordId:",recordId);
            if (claimAddress.toLowerCase()===walletAddress.toLowerCase()){
                console.log("claim success,wallet:",walletAddress," amount:",amount," recordId:",recordId);
                await connection.query("update wallet_claim_balance b set freeze=freeze-?,claimed=claimed+? where wallet_address=? and freeze>=?",[amount,amount,walletAddress,amount]);
                await connection.query("update wallet_claim_record set result=1 where result=0 and wallet_address=? and id=?",[walletAddress,recordId]);
            }else if (claimAddress==="0x0000000000000000000000000000000000000000"){
                console.log("claim expire,wallet:",walletAddress," amount:",amount," recordId:",recordId);
                await connection.query("update wallet_claim_balance b set b.balance=b.balance+?,freeze=freeze-? where wallet_address=? and freeze>=?",[amount,amount,walletAddress,amount]);
                await connection.query("update wallet_claim_record set result=2 where result=0 and wallet_address=? and id=?",[walletAddress,recordId]);
            }else {
                console.log("claimAddress error:",claimAddress," recordId:",recordId)
            }
            // console.log("wallet:",walletAddress," nonce:",nonce);
        }
        // await connection.commit();
    }catch (err){
        console.log("confirmClaimResult error:",err)
        // await connection.rollback();
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }
}
