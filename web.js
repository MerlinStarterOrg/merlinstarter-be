// server.js
import express from 'express';
import { twitterClient } from './twitterClient.js';
import { twitter_id, twitter_user_name, twitter_app_key, twitter_app_secret } from './config.js';
import { client } from './redisClient.js';
import { TwitterApi } from 'twitter-api-v2';
import session from 'express-session';
import RedisStore from 'connect-redis';
import cors from 'cors';
import { service } from './service.js';
import bitcore from 'bitcore-lib';
import Web3 from 'web3';
import { ethers, AbiCoder } from 'ethers';
import { keccak256 } from 'web3-utils';
import e from 'express';
import {
    follow_merlin_twitter,
    follow_mineral_twitter,
    mineralBindingTwittet,
    mineralCheckWallet,
    mineralInfo
} from "./mineralservice.js";
import {checkDiscordMembers, checkHasJoinDcServer, discordCallback, getDiscordOauthUrl} from "./discordService.js";
import {checkHasJoinTgGroup, checkTgGroup, merlin_tg_group_id, mineral_tg_group_id} from "./telegram.js";
import {getConnection, releaseConnection} from "./db.js";
import {
    addMerlinswapUser,
    checkStarters, merlin_swap_follow_merlin_swap_twitter,
    merlin_swap_follow_merlin_twitter, merlin_swap_post_tweet,
    merlinSwapBindingTwittet,
    merlinswapCheck,
    merlinSwapInfo, setMerlinswapBindSteps, setMerlinswapBindStepsFinal
} from "./merlinswapservice.js";
import {claimSign} from "./sbt/mstartairdrop.js";
import {mageRouter} from "./mage_airdrop.js";
import {delay, isAuthenticated, sendResponse} from "./base_router.js";

const app = express();
const port = 9000;

app.use(express.json());
app.use(cors({
    origin: ['http://merlinstarter.com','https://merlinstarter.com', 'https://preview.merlinstarter.com', 'https://airdrop.merlinstarter.com','https://www.merlinstarter.com',"https://predrop.merlinstarter.com"], // placeholder
    methods: ['GET', 'POST'],
    credentials: true // placeholder
}));

// placeholder
app.use(session({
    store: new RedisStore({ client: client }),
    secret: 'airdrop_merlin', // placeholder
    saveUninitialized: false,
    resave: false,
    name: 'merlin', // placeholder
    cookie: {
        domain: 'merlinstarter.com',
        maxAge: 3600000 // placeholder
    }
}));

app.use("/mage",mageRouter);




const getClientIp = (req) => {
    var ip = req.headers['x-forwarded-for'] ||
        req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress || '';
    if(ip.split(',').length>0){
        ip = ip.split(',')[0]
    }
    ip = ip.substr(ip.lastIndexOf(':')+1,ip.length);
    return ip;  
};



// placeholder
app.get('/wallet_register', (req ,res) => {
    try {
        const addr = req.query.addr;
        // console.log("/wallet_register:ip: ", getClientIp(req), "addr: ", addr);
        service.registerWallet(addr, req.query.sign).then((result) => {
            if (typeof(result) == 'string') {
                console.log("/wallet_register:", result);
                sendResponse(res, 500, 500, result);
            } else {
                req.session.wallet = { addr };
                sendResponse(res, 200, 200, "success", 1);
            }
        });
    } catch (err) {
        console.error("/wallet_register:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.post('/btc_login', async (req, res) => {
    let { publicKey, text, sig, btc_address, eth_address } = req.body;
    try {
        // console.log("/btc_login:ip: ", getClientIp(req), "addr: ", eth_address);
        // console.log('/btc_login:', 'etc address:', eth_address);
        if (eth_address.length == 0) {
            sendResponse(res, 401, 401,'eth address is empty.');
        }
        const message = new bitcore.Message(text);
        var signature = bitcore.crypto.Signature.fromCompact(Buffer.from(sig, 'base64'));
        var hash = message.magicHash();

        var ecdsa = new bitcore.crypto.ECDSA();
        ecdsa.hashbuf = hash;
        ecdsa.sig = signature;

        const pubkeyInSig = ecdsa.toPublicKey();

        const pubkeyInSigString = new bitcore.PublicKey(
            Object.assign({}, pubkeyInSig.toObject(), { compressed: true })
        ).toString();

        if (pubkeyInSigString !== publicKey) {
            console.log('/btc_login:', 'invaild_sign', pubkeyInSigString, publicKey);
            sendResponse(res, 401, 401, 'Invalid signature.');
        }

        eth_address = eth_address || "";

        const valid = bitcore.crypto.ECDSA.verify(hash, signature, pubkeyInSig);
        if(valid){
            await service.addUser(eth_address,btc_address);
            req.session.wallet = {};
            req.session.wallet.addr = eth_address;
            sendResponse(res, 200, 200,'Login successful.');
        }else{
            sendResponse(res, 401, 401,'Invalid signature.');
        }
    } catch (error) {
        console.log('/btc_login:' , error);
        sendResponse(res, 500, 500,'Error verifying signature.');
    }
});

// placeholder
app.get('/check_wallet', isAuthenticated, async (req, res) => {
    try {
        // console.log("/check_wallet:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.checkWallet(req.session.wallet.addr, req.query.code).then((result) => {
            if (typeof(result) == 'string') {
                // console.log('/check_wallet:', result);
                sendResponse(res, 500, 500, result);
            } else {
                sendResponse(res, 200, 200, "success", result);
            }
        });
    } catch (err) {
        console.error("/check_wallet:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/oauthUrl', async (req, res) => {
    try {
        const { url, oauth_token, oauth_token_secret } = await twitterClient.generateAuthLink("https://xauth.merlinstarter.com/callback");
        // placeholder
        client.set("oauth_token:" + oauth_token, oauth_token_secret, "EX", 300);
        // placeholder
        const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`;
        sendResponse(res, 200, 200, "success", { authUrl });
    } catch (error) {
        console.error('Error generating auth link:', error);
        sendResponse(res, 500, 500, 'get oauthUrl error');
    }
});

app.get('/callback', async (req, res) => {
    const oauthToken = req.query.oauth_token;
    const oauthVerifier = req.query.oauth_verifier;
    // console.log('/callback:', "oauthToken ", oauthToken, " oauthVerifier ", oauthVerifier);
    if (!oauthToken || !oauthVerifier) {
        return res.status(400).send('Missing required parameters');
    }
    let connection;
    try {
        connection=await getConnection();
        const oauthTokenSecret = await client.get("oauth_token:" + oauthToken);
        // console.log("/callback:", "oauthTokenSecret ", oauthTokenSecret);
        const twitterClient = new TwitterApi({
            appKey: twitter_app_key,
            appSecret: twitter_app_secret,
            accessToken:oauthToken,
            accessSecret:oauthTokenSecret
          });
        // placeholder
        const { accessToken, accessSecret } = await twitterClient.login(oauthVerifier);
        // placeholder
        const userClient = new TwitterApi({
            appKey: twitter_app_key,
            appSecret: twitter_app_secret,
            accessToken,
            accessSecret,
        });
        // placeholder
        const userInfo = await userClient.v1.verifyCredentials();
        // {
        //     id: 1751825501986160600,
        //     id_str: '1751825501986160640',
        //     name: 'Jackson',
        //     screen_name: 'Jackson76928643',
        //     location: '',
        //     description: '',
        // }
        const userId = userInfo.id_str;
        const [users,]=await connection.query("select wallet_address from users u where u.twitter_id=?",[userId]);
        if (users.length>0){
            console.log("twitter has been bind: ",userInfo.screen_name)
            const message="The account is already bound by "+users[0].wallet_address+" and cannot be re-bound."
            const redirectUrl="https://merlinstarter.com/twitter?message="+message;
            return res.redirect(302, redirectUrl);
        }
        // console.log("/callback: login twitter userInfo:", userInfo);
        client.hSet("userprofile",userId,JSON.stringify(userInfo));
        req.session.user = { userId };
        const redirectUrl="https://merlinstarter.com/twitter?message=success";
        return res.redirect(302, redirectUrl);
    } catch (error) {
        console.error('/callback: Error during Twitter OAuth callback:', error);
        sendResponse(res, 500, 500, 'error');
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }
});

// placeholder
app.get('/info', isAuthenticated, async (req, res) => {
    try {
        // console.log("/info:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.info(req.session.wallet.addr).then((result) => {
            sendResponse(res, 200, 200, "success", result);
        });
    } catch (err) {
        console.error("/info:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get('/bind', isAuthenticated, (req, res) => {
    try {
        // console.log("/bind:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.bind(req.session.user.userId, req.session.wallet.addr).then((result) => {
            if(typeof result === "object"){
              return sendResponse(res, 500, 500,  result.message, null);
            }
            // console.log('/bind:', result);
            sendResponse(res, 200, 200, "success", result);
        });
    } catch (err) {
        console.error("/bind:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get('/follow', isAuthenticated, (req, res) => {
    try {
        // console.log("/follow:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.checkFollow(req.session.wallet.addr).then(async (result) => {
            // console.log('/follow:', result);
            await delay(5000);
            sendResponse(res, 200, 200, "success", result);
        });
    } catch (err) {
        console.error('/follow:', err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get('/share', isAuthenticated, (req, res) => {
    try {
        // console.log("/share:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.checkShare(req.session.wallet.addr).then(async (result) => {
            // console.log('/share:', result);
            await delay(5000);
            sendResponse(res, 200, 200, "success", result);
        });
    } catch (err) {
        console.error('/share:', err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get("/connect_telegram", isAuthenticated, (req, res) => {
    try {
        // console.log("/connect_telegram:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.connectTelegram(req.session.wallet.addr).then(async (result) => {
            await delay(5000);
            // console.log('/connect_telegram:', result);
            sendResponse(res, 200, 200, "success", result);
        });
    } catch (err) {
        console.error("/connect_telegram:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get("/get_code", isAuthenticated, (req, res) => {
    try {
        // console.log("/get_code:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.generateCode(req.session.wallet.addr).then((code) => {
            // console.log('/get_code:', code);
            sendResponse(res, 200, 200, "success", code);
        });
    } catch (err) {
        console.error("/get_code:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get("/claim_stars", isAuthenticated, (req, res) => {
    try {
        // console.log("/claim_stars:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.claimStars(req.session.wallet.addr).then((stars) => {
            // console.log('/claim_stars:', stars);
            sendResponse(res, 200, 200, "success", stars);
        });
    } catch (err) {
        console.error("/claim_stars:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get('/share_like', isAuthenticated, (req, res) => {
    try {
        // console.log("/share_like:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        service.checkRetweet(req.session.wallet.addr).then((result) => {
            console.log('/share_like:', result);
            sendResponse(res, 200, 200, "success", result);
        });
    } catch (err) {
        console.error("/share_like:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/mineral_check_wallet', isAuthenticated, async (req, res) => {
    try {
        // console.log("/mineral_check_wallet:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        const result= await  mineralCheckWallet(req.session.wallet.addr, req.query.code);
        if(result){
           return sendResponse(res, 200, 200, "success",true);
        }else {
            const message="You are ineligible for this event. Please make sure that your merlin wallet has more than 0.01 $BTC or 100 $Voya";
            return sendResponse(res, 500, 500, message,false);
        }
    } catch (err) {
        console.error("/mineral_check_wallet:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/mineral_info', isAuthenticated, async (req, res) => {
    try {
        // console.log("/mineral_info:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        let  result=await mineralInfo(req.session.wallet.addr);
        if (!result){
            result={};
        }
        return sendResponse(res, 200, 200, "success",result);
    } catch (err) {
        console.error("/mineral_info:", err);
        sendResponse(res, 500, 500, err);
    }
});

// placeholder
app.get('/mineral_bind', isAuthenticated, async (req, res) => {
    try {
        // console.log("/mineral_bind:ip: ", getClientIp(req), "addr: ", req.session.wallet.addr);
        await mineralBindingTwittet(req.session.user.userId, req.session.wallet.addr);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/mineral_bind:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/follow_merlin_twitter', isAuthenticated, async (req, res) => {
    try {
        await follow_merlin_twitter(req.session.wallet.addr);
        await delay(5000);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/follow_merlin_twitter:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/follow_mineral_twitter', isAuthenticated, async (req, res) => {
    try {
        await follow_mineral_twitter(req.session.wallet.addr);
        await delay(5000);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/follow_mineral_twitter:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/get_discord_oauth_url', isAuthenticated, async (req, res) => {
    try {
        const url=getDiscordOauthUrl();
        return sendResponse(res, 200, 200, "success",url);
    } catch (err) {
        console.error("/get_discord_oauth_url error:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/discord_callback', async (req, res) => {
    try {
        const oauthCode=req.query.code;
        if (req.session.wallet){
            const walletAddr=req.session.wallet.addr;
            // console.log("discord callback,code:",oauthCode," walletAddr:",walletAddr);
           const result=await discordCallback(oauthCode,walletAddr);
           if (result===1){
               const redirectUrl="https://merlinstarter.com/twitter?message=The account is already bound and cannot be re-bound.";
               return res.redirect(302, redirectUrl);
           }
        }
        const redirectUrl="https://merlinstarter.com/twitter?message=success";
        return res.redirect(302, redirectUrl);
        // return sendResponse(res, 200, 200, "success",url);
    } catch (err) {
        console.error("/discord_callback error:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/verify_discord_join',isAuthenticated, async (req, res) => {
    try {
        const walletAddr=req.session.wallet.addr;
        const result=await checkDiscordMembers(walletAddr);
        return sendResponse(res, 200, 200, "success",result);
    } catch (err) {
        console.error("/verify_discord_join error:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/get_tg_bot_url', isAuthenticated, async (req, res) => {
    try {
        const addr = req.session.wallet.addr;
        const code = await service.generateCode(addr);
        if (code.length != 0) {
            return sendResponse(res, 200, 200,"success", `https://t.me/MStarterBot?start=${code}`);
        }
       return  sendResponse(res, 401, 401, "Empty code");
    } catch (err) {
        console.error('/get_tg_bot_url= ', err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/check_merlin_tg_group', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result=await checkTgGroup(connection, req.session.wallet.addr, merlin_tg_group_id, "step1;step2;step3;step4;step5;step6-1;", "step1;step2;step3;step4;step5;step6;step7-1;");
        return sendResponse(res,200,200,"success",result);
    } catch (err) {
        console.error('/check_merlin_tg_group= ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    } finally {
        if (connection) {
            releaseConnection(connection);
        }
    }
});

app.get('/check_mineral_tg_group', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result= await checkTgGroup(connection, req.session.wallet.addr, mineral_tg_group_id, "step1;step2;step3;step4;step5;step6;step7-1;", "step1;step2;step3;step4;step5;step6;step7;claimed;");
        return sendResponse(res,200,200,"success",result);
    } catch (err) {
        console.error('/check_mineral_tg_group= ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    } finally {
        if (connection) {
            releaseConnection(connection);
        }
    }
});

app.get('/logout', (req, res) => {
    try {
        if (req.session) {
          // placeholder
          req.session.destroy((err) => {
            if (err) {
                sendResponse(res, 500, 500, 'err0r');
            } else {
                sendResponse(res, 200, 200, 'success');
            }
          });
        } else {
            sendResponse(res, 200, 200, 'success');
        }
    } catch (error) {
        console.error("logout",error);
        sendResponse(res, 500, 500, 'err0r');
    }
  });

app.get('/swap_check_wallet', isAuthenticated, async (req, res) => {
    try {
        const inviteCode=req.query.code;
        const result= await  merlinswapCheck(req.session.wallet.addr);
        if(result){
            const starterCheck=await checkStarters(req.session.wallet.addr);
            if (starterCheck){
                await addMerlinswapUser(req.session.wallet.addr,inviteCode);
                return sendResponse(res, 200, 200, "success",true);
            }else {
                const message="You need to have at least 500 Star Points to claim. Go to the Star Airdrop page to claim.";
                return sendResponse(res, 500, 500, message,false);
            }
        }else {
            const message="Not eligible for the draw; requires wallet holdings or Merlin's Seal staking of over 0.01 BTC";
            return sendResponse(res, 500, 500, message,false);
        }

    } catch (err) {
        console.error("/merlin_swap_check_wallet:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/swap_info', isAuthenticated, async (req, res) => {
    try {
        let  result=await merlinSwapInfo(req.session.wallet.addr);
        if (!result){
            result={};
        }
        return sendResponse(res, 200, 200, "success",result);
    } catch (err) {
        console.error("/merlin_swap_info:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/swap_bind', isAuthenticated, async (req, res) => {
    try {
        await merlinSwapBindingTwittet(req.session.user.userId, req.session.wallet.addr);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/mineral_bind:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/swap_follow_merlin_twitter', isAuthenticated, async (req, res) => {
    try {
        await merlin_swap_follow_merlin_twitter(req.session.wallet.addr);
        await delay(5000);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/follow_merlin_twitter:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/swap_follow_swap_twitter', isAuthenticated, async (req, res) => {
    try {
        await merlin_swap_follow_merlin_swap_twitter(req.session.wallet.addr);
        const result=await checkHasJoinTgGroup( req.session.wallet.addr, merlin_tg_group_id);
        if (result===2){
            const dccheck=await checkHasJoinDcServer(req.session.wallet.addr,"1204999197582163988");
            if (dccheck===1){
                await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;","step5;step6-1;")
            }else if (dccheck===2){
                await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;","step5;step6;")
            }else {
                await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;step5;");
            }
        }else if (result===1){
            await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;","step5-1;")
        }
        await delay(5000);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/follow_mineral_twitter:", err);
        sendResponse(res, 500, 500, err);
    }
});

app.get('/swap_check_tg_group', isAuthenticated, async (req, res) => {
    try {
        const result=await checkHasJoinTgGroup(req.session.wallet.addr, merlin_tg_group_id);
        if (result===2){
            const dccheck=await checkHasJoinDcServer(req.session.wallet.addr,"1204999197582163988");
            if (dccheck===1){
                await setMerlinswapBindStepsFinal(req.session.wallet.addr,"step1;step2;step3;step4;step5-1;","step1;step2;step3;step4;step5;step6-1;");
            }else {
                await setMerlinswapBindStepsFinal(req.session.wallet.addr,"step1;step2;step3;step4;step5-1;","step1;step2;step3;step4;step5;");
            }
            return sendResponse(res,200,200,"success",true);
        }else {
            return sendResponse(res,200,200,"success",false);
        }
    } catch (err) {
        console.error('/merlin_swap_check_tg_group error ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    }
});

app.get('/swap_check_dc_group', isAuthenticated, async (req, res) => {
    try {
        const dccheck=await checkHasJoinDcServer(req.session.wallet.addr,"1204999197582163988");
        if (dccheck===2){
            await setMerlinswapBindStepsFinal(req.session.wallet.addr,"step1;step2;step3;step4;step5;step6-1;","step1;step2;step3;step4;step5;step6;");
            return sendResponse(res,200,200,"success",true);
        }else {
            return sendResponse(res,200,200,"success",false);
        }
    } catch (err) {
        console.error('/merlin_swap_check_dc_group error ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    }
});

app.get('/swap_post_tweet', isAuthenticated, async (req, res) => {
    try {
        await merlin_swap_post_tweet(req.session.wallet.addr);
        return sendResponse(res,200,200,"success",true);
    } catch (err) {
        console.error('/merlin_swap_post_tweet error ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    }
})

app.get('/nft_ab_check', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection=await getConnection();
        const [result,]=await connection.query("select * from nft_ab_list where wallet_address=?",[req.session.wallet.addr])
        let re=0;
        if (result.length>0){
            re=result[0].ab;
        }
        return sendResponse(res,200,200,"success",re);
    } catch (err) {
        console.error('/nft_ab_check error ', err);
        sendResponse(res, 500, 500, "system error");
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }
})

app.get('/claim_mstart', isAuthenticated, async (req, res) => {
    try {
        const walletAddress=req.session.wallet.addr;
        console.log("wallet claim:",walletAddress);
        const result=await claimSign(walletAddress);
        sendResponse(res, 200, 200, "success", result);
    } catch (err) {
        console.error("/info:", err);
        sendResponse(res, 500, 500, err);
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
