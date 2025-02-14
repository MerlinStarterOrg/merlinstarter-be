import bitcore from 'bitcore-lib';
import Web3  from 'web3';
import { ethers,AbiCoder } from 'ethers';
import { keccak256 } from 'web3-utils';
import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import {createClient}  from 'redis';
import cors from 'cors';
import {config,claimErc1155Abi,claimRewardsAbi} from './config.js';
import {claimReward} from './claimRewardsService.js'; 

//const RedisStore = connectRedis(session);
console.log("start app...")

// placeholder
const redisClient =  createClient({url:"redis://127.0.0.1:6379"});
await redisClient.connect();
console.log("redisClient:"+redisClient.isOpen);
redisClient.on('connect', () => {
    console.log('Redis client connecting');
});

// placeholder
redisClient.on('ready', () => {
    console.log('Redis client connected');
});
redisClient.on('error', function(err) {
    console.log('Redis error: ' + err);
});
// placeholder
redisClient.on('end', () => {
    console.log('Redis client disconnected');
});

const app = express();
app.use(express.json());

app.use(cors({
    origin: ['https://bitland.zone', 'https://preview.bitland.zone','https://www.bitland.zone'], // placeholder
    credentials: true // placeholder
}));


// placeholder
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'yourSecret', // placeholder
    saveUninitialized: false,
    resave: false,
    name: 'brc420check', // placeholder
    cookie: {
        domain: 'bitland.zone',
        maxAge: 3600000 // placeholder
    }
}));

// placeholder
const sendResponse = (res, httpcode,code, message, data = null) => {
    try {
        res.status(httpcode).json({ code, message, data });
    } catch (error) {
        console.error("sendResponse Error",error);
    }
};

// placeholder
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        next(); // placeholder
    } else {
        sendResponse(res, 401, 'Unauthorized: No session available.');
    }
};

app.post('/verify',async (req, res) => {
    let { publicKey, text, sig,btc_address } = req.body;

    try {
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
            sendResponse(res, 401, 401,'Invalid signature.');
        }

        btc_address = btc_address || "";

        const hasbitaxe=await redisClient.hExists("bitaxe420_token_holders",btc_address);   
        console.log("btc address:"+btc_address+" hasbitaxe:"+hasbitaxe); 
        if(!hasbitaxe){
            sendResponse(res, 200, 701,'Sorry, there is no BitAxe420 in your wallet.');  
            return; 
        }
        const valid = bitcore.crypto.ECDSA.verify(hash, signature, pubkeyInSig);
        if(valid){
            req.session.user = { valid };
            sendResponse(res, 200, 200,'Login successful.');
        }else{
            sendResponse(res, 401, 401,'Invalid signature.');
        }
        
    } catch (error) {
        console.log(error)
        sendResponse(res, 500, 500,'Error verifying signature.');
    }
});

app.get('/claim', isAuthenticated,async (req, res) => {
    //  const userAddress = req.session.user.address;
   try {
     const web3 = new Web3(new Web3.providers.HttpProvider(config.rpc.url));
 
     // placeholder
     const contractAddress = config.claimErc1155.contract;
     const claimAccount = req.query.address;
 
     const claimBitAxe1155 = new web3.eth.Contract(claimErc1155Abi, contractAddress);
 
     const bitAxe1155 = new web3.eth.Contract(config.bitAxe1155.abi, config.bitAxe1155.contract);
     let balance=await bitAxe1155.methods.balanceOf(claimAccount,1).call();
     console.log("address:"+claimAccount+" bitaxe balance:"+balance);
 
     balance=Number(balance);
     if(balance>0){
         sendResponse(res,200,702,"has claim")
         return;
     }
      // placeholder
      let nonce = await claimBitAxe1155.methods.nonces(claimAccount).call();
      nonce = Number(nonce);
      // placeholder
      const chainId = await web3.eth.getChainId();
      console.log("chain id:"+chainId)
      const deadline=parseInt(Date.now() / 1000) + 3600; // placeholder
      console.log("deadline::"+deadline)
      // placeholder
      const message = {
          to: claimAccount, // placeholder
          id: 1,       // NFT ID
          amount: 1,  // placeholder
          nonce: nonce,    // Nonce
          deadline: deadline
      };
      console.log("message: "+JSON.stringify(message))
      // placeholder
      const abiCoder = AbiCoder.defaultAbiCoder();
      // placeholder
     
      // const DOMAIN_SEPARATOR = "0xca1664004bb7b39c0fec1ed876ca84c8a46eebc1374145d86eeb2215460709da";
      const DOMAIN_SEPARATOR = keccak256(
          abiCoder.encode(
              ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
              [config.claimErc1155.DOMAIN_TYPEHASH,config.claimErc1155.DOMAIN, keccak256('1'), chainId, contractAddress]
          )
      );
      console.log("DOMAIN_SEPARATOR::"+DOMAIN_SEPARATOR)
  
      // placeholder
      const CLAIM_TYPEHASH = config.claimErc1155.CLAIM_TYPEHASH;
      console.log("CLAIM_TYPEHASH:: "+CLAIM_TYPEHASH)
      const params=keccak256(
          abiCoder.encode(
              ['bytes32', 'address', 'uint256', 'uint256', 'uint256', 'uint256'],
              [CLAIM_TYPEHASH, message.to, message.id, message.amount, message.nonce, message.deadline]
          )
      )
      const digest = keccak256(
          ethers.solidityPacked(
              ['string', 'bytes32', 'bytes32'],
              [
                  '\x19\x01',
                  DOMAIN_SEPARATOR,
                  params
              ]
          )
      );
      console.log("digest:: "+digest)
 
      const signingKey = new ethers.SigningKey(config.claimErc1155.singer);
      const signature = signingKey.sign(digest);
      console.log("sinatrue:"+JSON.stringify({v:signature.v,r:signature.r,s:signature.s}))
      // placeholder
      const recoveredAddress=ethers.recoverAddress(digest,signature);         
      console.log("recoveredAddress::"+recoveredAddress);
      // placeholder
      const claimData = claimBitAxe1155.methods.claim(message, [signature.v], [signature.r], [signature.s]).encodeABI();
      // placeholder
      console.log('Encoded claim function call:', claimData);
      sendResponse(res,200,200,"success",{"claimdata":claimData,address:claimAccount,contractAddress:contractAddress});
   } catch (error) {
     console.error("claim bitaxe1155 error:",error)
     sendResponse(res,500,500,"error");
   }
});

app.get('/claim_reards',async (req, res) => {
  try {
    const claimAccount = req.query.address;
    if (!claimAccount) {
        // placeholder
        return sendResponse(res, 400, 400, "Invalid address");
    }
    const web3 = new Web3(new Web3.providers.HttpProvider(config.rpc.url));
    const contractAddress = config.claimRewards.contract;
    const claimRewardContract = new web3.eth.Contract(claimRewardsAbi, contractAddress);
    // placeholder
    let nonce = await claimRewardContract.methods.nonces(claimAccount).call();
    nonce = Number(nonce);
    const chainId =  await web3.eth.getChainId();
    const result = await claimReward(claimAccount, nonce);
    if(result==0){
        sendResponse(res, 200, 501, "no balance");
        return;
    }
    const claimData = await generateClaimData(result, nonce,claimAccount, chainId,claimRewardContract);

    sendResponse(res, 200, 200, "success", { "claimdata":claimData,address:claimAccount,contractAddress:contractAddress });
} catch (error) {
    console.error("claim reward error:", error);
    sendResponse(res, 500, 500, "Error");
}
});

async function generateClaimData(result,nonce, claimAccount, chainId,claimRewardContract) {
    const amount = ethers.parseUnits(result, 18); 
    const deadline = parseInt(Date.now() / 1000) + 3600; // placeholder
    const message = {
        erc20Token: config.rewardContractAddress,
        to: claimAccount,
        amount: amount,
        nonce: nonce, // placeholder
        deadline: deadline
    };

    // placeholder
    const abiCoder = AbiCoder.defaultAbiCoder();

    // placeholder
    const DOMAIN_TYPEHASH = config.claimRewards.DOMAIN_TYPEHASH;
    const DOMAIN_SEPARATOR = keccak256(
        abiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [DOMAIN_TYPEHASH,config.claimRewards.DOMAIN, keccak256('1'), chainId, config.claimRewards.contract]
        )
    );

    // placeholder
    const CLAIM_TYPEHASH = config.claimRewards.CLAIM_TYPEHASH;
    const digest = keccak256(
        ethers.solidityPacked(
            ['string', 'bytes32', 'bytes32'],
            [
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(
                    abiCoder.encode(
                        ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                        [CLAIM_TYPEHASH, message.erc20Token, message.to, message.amount, message.nonce, message.deadline]
                    )
                )
            ]
        )
    );

    const signingKey = new ethers.SigningKey(config.claimRewards.singer);
    const signature = signingKey.sign(digest);
    console.log("sinatrue:"+JSON.stringify({v:signature.v,r:signature.r,s:signature.s}))
    // placeholder
    const recoveredAddress=ethers.recoverAddress(digest,signature);         
    console.log("recoveredAddress::"+recoveredAddress);
    // placeholder
    const claimData = claimRewardContract.methods.claim(message, [signature.v], [signature.r], [signature.s]).encodeABI();

    return claimData;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
