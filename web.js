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

