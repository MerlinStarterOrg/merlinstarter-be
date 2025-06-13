import { getConnection, releaseConnection } from "./db.js";
import { client } from './redisClient.js';
import {claimConfig, twitter_id} from './config.js';
import Web3 from 'web3';

const whiteAddrs = ["0xAcc3C2906EC7E2834Ad9cc7a4a8ca0e3DbAd9c16", "0xA9C8f281f6e89F501972A4dE47eCC29eDE9D0b12"];
const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc.merlinchain.io/"));

class Service {
    async getLatestTweetId(connection) {
        const sql = 'select tweet_id from tweets ORDER BY tweet_publish_time desc limit 1';
        const [resultRows,] = await connection.query(sql, []);
        const tweet_id = resultRows[0].tweet_id;
        return tweet_id;
    }

    async hasPledgeRecord(addr) {
        if (whiteAddrs.indexOf(addr) != -1) {
            return true;
        }
        let connection;
        try{
            connection = await getConnection();
            const [pledgeDataCount, ] = await connection.query("select wallet_address from pledge_data where wallet_address = ?", [addr]);
            if (pledgeDataCount.length == 0) {
                
                return false;
            }
            return true;
        }finally{
            if (connection) {
                releaseConnection(connection);
            }
        }
    }

    async addUser(addr,btc_address) {
        let connection;
        try{
            connection = await getConnection();
            // placeholder
            const hasregister=await client.sIsMember("wallet_register",addr)
            if(hasregister){
                // placeholder
                return true;
            }
            // placeholder
            const [resultRows, ] = await connection.query("select * from users where wallet_address = ?", [addr]);
            
            if (resultRows.length > 0) {
                client.sAdd("wallet_register",addr)
                // placeholder
                if(resultRows[0].twitter_id){
                    client.sAdd("binded_twitter_ids",resultRows[0].twitter_id)
                }
                return true;
            }
            // placeholder
            // placeholder
            if (btc_address){
                await connection.query("insert into users(wallet_address,btc_address) values(?,?)", [addr,btc_address]);
            }else {
                await connection.query("insert into users(wallet_address) values(?)", [addr]);
            }
            client.sAdd("wallet_register",addr)
            // placeholder
            return true;
        }catch(err){
            //console.log("addUser Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
    }

    // placeholder
    async addCodeRelation(addr, code) {
        let connection; 
        try{
            connection = await getConnection();
            // placeholder
            const [resultRows, ] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                return false;
            }
            if (typeof(code) == 'string' && code.length != 0) {
                const [codeRows, ] = await connection.query("select id from users where invite_code = ?", [code]);
                if (codeRows.length == 0) {
                    return false;
                }
                let inviteId = codeRows[0].id;
                await connection.query("update users set invite_id = ? where wallet_address = ?", [inviteId, addr]);
                return true;
            }
            return false;
        }catch(err){
            //console.log("addCodeRelation Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
        
    }

    async registerWallet(addr, signature) {
        try{
            // placeholder
            if (addr.length == 0) {
                return "the wallet addr is empty";
            }
            //console.log("registerWallet-wallet address:", addr);
            //console.log("registerWallet-signature:", signature);
            // placeholder
            const message = 'Welcome to MerlinStarter:\n' + addr;
            const signingAddress = web3.eth.accounts.recover(message, signature);
            //console.log("registerWallet-signingAddress:", signingAddress);
            const valid = signingAddress.toLowerCase() === addr.toLowerCase();
            if (!valid) {
                return "Invalid signature.";
            }
            return await this.addUser(addr);
        }catch(err){
            //console.log("registerWallet Error",err)
        }
    }

    // placeholder
    async checkWallet(addr, code) {
        let connection; 
        try{
            connection = await getConnection();
            if (addr.length == 0) {
                return "the wallet addr is empty";
            }
            //console.log("checkWallet-wallet address:", addr);
            const hasPledgeRecord=await this.hasPledgeRecord(addr);
            //console.log("hasPledgeRecord check:",addr," result::",hasPledgeRecord)
            if (hasPledgeRecord === false) {
                // placeholder
                let balance = await web3.eth.getBalance(addr);
                // placeholder
                balance = web3.utils.fromWei(balance, 'ether');
                //console.log(`checkWallet-The balance of ${addr} is: ${balance} BTC`);
                if(balance < 0.0001) {
                    //console.log("checkWallet-balance too small: ", balance);
                    return "You are ineligible for this event.  Please earn points through the following activities.";
                }
            } else {
                //console.log("checkWallet-has pledge record:", addr);
            }
            const [resultRows, ] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                return false;
            }
            if (Number(resultRows[0].is_claimed) == 1) {
                return false;
            }
            if (typeof(resultRows[0].steps) == 'string') {
                if (resultRows[0].steps.length != 0) {
                    return false;
                }
            }
            await connection.query("update users set steps = 'step1;' where wallet_address = ?", [addr]);
            await this.addCodeRelation(addr, code);
            return true;
        }catch(err){
            //console.log("checkWallet Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
    }

    async bind(twitterId, addr) {
        // placeholder
        if (addr.length == 0 || twitterId.length == 0) {
            return "the param is empty";
        }
        //console.log("bind-wallet address:", addr);
        //console.log("bind-twitter id:", twitterId);
        // placeholder
        let connection;
        try{
            const hasBind=await client.sIsMember("binded_twitter_ids",twitterId);
            if(hasBind){
                // placeholder
                return {"message":"Your Twitter id has been linked."};
            }

            connection = await getConnection();
            const [resultRows,] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                return "please register wallet address first";
            }

            if(resultRows[0].twitter_id){
                client.sAdd("binded_twitter_ids",twitterId)
            }
            if (typeof(resultRows[0].twitter_id) == 'string') {
                if (resultRows[0].twitter_id.length != 0) {
                    return "the wallet address has been binded";
                }
            }

            // placeholder
            const [twitterBindRows,] = await connection.query("select * from users where twitter_id = ?", [twitterId]);
            if (twitterBindRows.length > 0 && twitterBindRows[0].wallet_address!=addr) {
                client.sAdd("binded_twitter_ids",twitterId);
                // placeholder
                return {"message":"Your Twitter id has been linked."};
            }

            // placeholder
            const twitter_info_str = await client.hGet("userprofile", twitterId);
            const twitter_info = JSON.parse(twitter_info_str);
            await connection.query("update users set twitter_id = ?, steps = ?, twitter_username = ? where wallet_address = ?", [twitterId, resultRows[0].steps + 'step2;', twitter_info.name, addr]);
            client.sAdd("binded_twitter_ids",twitterId);
            return true;
        }catch(err){
            //console.log("bind Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
        return false
    }

    async info(addr) {
        let connection;
        try{
            connection = await getConnection();
            const [resultRows,] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length===0){
                console.log("wallet not register:",addr);
                return {};
            }
            let is_claimed = '';
            if (Number(resultRows[0].is_claimed) === 1) {
                is_claimed = 'claimed;';
            }
            const result={
                'user_id': resultRows[0].id,
                'twitter_id': resultRows[0].twitter_id,
                'twitter_username': resultRows[0].twitter_username,
                'stars': resultRows[0].stars,
                "steps": resultRows[0].steps + is_claimed,
                "mticket":resultRows[0].mticket
            };
            result.totalAirdrop=0;
            result.totalRealse=0;
            result.balance=0;
            result.freeze=0;
            result.claimed=0;
            const [lbs,]=await connection.query("select * from wallet_lock_balance where wallet_address=?",[addr]);
            if (lbs.length>0){
                const lb=lbs[0];
                result.totalAirdrop=lb.total_amount;
                result.totalRealse=lb.realse_amount;
            }
            const [cbs,]=await connection.query("select * from wallet_claim_balance where wallet_address=?",[addr]);
            if (cbs.length>0){
                const cb=cbs[0];
                result.balance=cb.balance;
                result.freeze=cb.freeze;
                result.claimed=cb.claimed;
                // console.log("wallet:",addr," cbs:",cbs);
            }
            result.startClaim = Date.now() >= claimConfig.claimStartTimestamp;
            return result;
        }catch(err){
            console.log("query start airdrop info error,",err);
            //console.log("info Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
        return {};
    }

    async checkFollow(addr) {
        if (addr.length == 0) {
            return "the param is empty";
        }
        //console.log("checkFollow-addr:", addr);
        let connection; 
        try{
            connection = await getConnection();
            // placeholder
            const [resultRows,] = await connection.query("select * from users where wallet_address = ? and steps ='step1;step2;'", [addr]);
            if (resultRows.length == 0) {
                return "Please complete the first 2 steps";
            }
            if (Number(resultRows[0].is_claimed) == 1) {
                return 'claimed';
            }
            await connection.query("update users set steps = ? where wallet_address = ?", [resultRows[0].steps + 'step3;', addr]);
            releaseConnection(connection);
            return true;
        }catch(err){
            //console.log("checkFollow Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
       
    }

    async checkShare(addr) {
        if (addr.length == 0) {
            return "the param is empty";
        }
        //console.log("checkFollow-addr:", addr);
        let connection; 
        try{
            connection = await getConnection();
            // placeholder
            const [resultRows,] = await connection.query("select * from users where wallet_address = ? and steps ='step1;step2;step3;'", [addr]);
            if (resultRows.length == 0) {
                return "Please complete the first 3 steps";
            }
            // const redisKey = "user_quote_" + twitterId;
            // const tweetId = await this.getLatestTweetId(connection);
            // //console.log('redis key:', redisKey);
            // //console.log('tweet id:', tweetId);
            // const result = await client.sIsMember(redisKey, tweetId);
            // if (!result) {
            //     releaseConnection(connection);
            //     return "Please share";
            // }
            if (Number(resultRows[0].is_claimed) == 1) {
                return 'claimed';
            }
            await connection.query("update users set steps = ? where wallet_address = ?", [resultRows[0].steps + 'step4;', addr]);
            releaseConnection(connection);
            return true;
        }catch(err){
            //console.log("checkShare Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
    }

    async connectTelegram(addr) {
        if (addr.length == 0) {
            return "the wallet addr is empty";
        }
        //console.log("checkFollow-wallet address:", addr);
        // placeholder
        let connection; 
        try{
            connection = await getConnection();
            const [resultRows,] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                return "the wallet was not registerd";
            }
            if (Number(resultRows[0].is_claimed) == 1) {
                return 'claimed';
            }
            if (resultRows[0].steps != "step1;step2;step3;step4;") {
                return "Please complete the first 4 steps";
            }
            await connection.query("update users set steps = ? where wallet_address = ?", [resultRows[0].steps + "step5;", addr]);
            return true;
        }catch(err){
            //console.log("connectTelegram Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
    }

    async checkRetweet(addr) {
        if (addr.length == 0) {
            return "the param is empty";
        }
        //console.log("checkFollow-addr:", addr);
        let connection; 
        try{
            connection = await getConnection();
            const [resultRows,] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                releaseConnection(connection);
                return "the wallet was not registerd";
            }
            if (typeof(resultRows[0].twitter_id) != 'string') {
                return "twitter info not found";
            }
            if (resultRows[0].twitter_id.length == 0) {
                
                return "twitter info not found";
            }
            let twitterId = resultRows[0].twitter_id;
            const lastTweetId = await this.getLatestTweetId(connection);
            const retweetKey = "user_retweet_" + twitterId;
            const hasRetweet = await client.sIsMember(retweetKey, lastTweetId);
            const likeKey = "user_liking_" + twitterId;
            const hasLike = await client.sIsMember(likeKey, lastTweetId);
            const quoteKey = "user_quote_" + twitterId;
            const hasQuote = await client.sIsMember(quoteKey, lastTweetId);
            if (!hasRetweet && !hasLike && !hasQuote) {
                return "please retweet, like or quote";
            }
            // placeholder
            if (hasRetweet || hasLike) {
                if (Number(resultRows[0].is_shared) === 0) {
                    await connection.query("update users set stars = ?, is_shared = 1 where wallet_address = ?", [Number(resultRows[0].stars) + 20, addr]);
                }
            }
            // placeholder
            if (hasQuote) {
                if (Number(resultRows[0].is_retweet_like) === 0) {
                    await connection.query("update users set stars = ?, is_retweet_like = 1 where wallet_address = ?", [Number(resultRows[0].stars) + 30, addr]);
                }
            }
            return true;
        }catch(err){
            //console.log("checkRetweet Error",err)
        }finally{
           if(connection){
            releaseConnection(connection);
           }
        }
    }

    async generateCode(addr) {
        if (addr.length == 0) {
            return "the wallet addr is empty";
        }
        //console.log("generateCode-wallet address:", addr);
        // placeholder
        let connection; 
        try{
            connection = await getConnection();
            const [resultRows,] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                return "the wallet was not registerd";
            }
            // placeholder
            if (typeof(resultRows[0].invite_code) == 'string') {
                if (resultRows[0].invite_code.length != 0) {
                    return resultRows[0].invite_code;
                }
            }
            // placeholder
            let code = Date.now().toString(36)
            code += Math.random().toString(36).substr(2)
            await connection.query("update users set invite_code = ? where wallet_address = ?", [code, addr]);
            return code;
        }catch(err){
            //console.log("generatecode Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
    }

    async claimStars(addr) {
        if (addr.length == 0) {
            return "the wallet addr is empty";
        }
        //console.log("claimStars-wallet address:", addr);
        // placeholder
        let connection; 

        try{
            connection = await getConnection();
            const [resultRows,] = await connection.query("select * from users where wallet_address = ?", [addr]);
            if (resultRows.length == 0) {
                return "the wallet was not registerd";
            }
            if (Number(resultRows[0].is_claimed) === 1) {
                return "the wallet has been claimed before";
            }
            // placeholder
            if (resultRows[0].steps != "step1;step2;step3;step4;step5;") {
                return "can not claim stars";
            }
            // placeholder
            const [pledgeDataRows,] = await connection.query("select * from pledge_data where wallet_address = ?", [addr]);
            let stars = 0;
            if (pledgeDataRows.length > 0) {
                stars = pledgeDataRows[0].stars;
            }
            // placeholder
            if (Number(stars) == 0) {
                stars = 100;
            }
            await connection.query("update users set stars = ?, is_claimed = 1 where wallet_address = ?", [Number(resultRows[0].stars) + Number(stars), addr]);
            // placeholder
            if (resultRows[0].invite_id) {
                let inviteId = resultRows[0].invite_id;
                const [inviteUserRows, ] = await connection.query("select stars from users where id = ?", [inviteId]);
                if (inviteUserRows.length != 0) {
                    await connection.query("update users set stars = ? where id = ?", [Number(inviteUserRows[0].stars) + 800, inviteId]);
                }
            }
            //console.log("claimStars-addr:", addr, "stars:", stars);
            return stars;
        }catch(err){
            //console.log("claimStars Error",err)
        }finally{
            if(connection){
                releaseConnection(connection);
            }
        }
    }
}

const service = new Service();

export {service};
