import Web3 from 'web3';
import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { client } from './redisClient.js';
import cors from 'cors';
import {validate } from 'email-validator';

console.log("start app...")
const app = express();
app.use(express.json());

app.use(cors({
    origin: ['https://webmi.pro/', 'https://www.webmi.pro/','https://webmi.pro', 'https://www.webmi.pro','http://webmi.pro', 'http://www.webmi.pro/','http://webmi.pro/','http://preview.webmi.pro/','http://preview.webmi.pro','https://preview.webmi.pro/','https://preview.webmi.pro','https://preview.bridgem.io/','https://preview.bridgem.io'], // placeholder
    credentials: true // placeholder
}));


// placeholder
app.use(session({
    store: new RedisStore({ client: client }),
    secret: 'yourSecret', // placeholder
    saveUninitialized: false,
    resave: false,
    name: 'webmioauth', // placeholder
    cookie: {
        domain: 'webmi.pro',
        maxAge: 3600000 // placeholder
    }
}));

// placeholder
const sendResponse = (res, httpcode, code, message, data = null) => {
    try {
        res.status(httpcode).json({ code, message, data });
    } catch (error) {
        console.error("sendResponse Error", error);
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
const web3 = new Web3();

function generateRandomNumber(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return result;
}
  
app.post('/login', async (req, res) => {
    try {
        console.log("req.originalUrl: ",req.originalUrl);
        let { signature, address } = req.body;
        const message = 'Welcome to webmi:\n' + address
        const signingAddress = web3.eth.accounts.recover(message, signature);
        const valid = signingAddress.toLowerCase() === address.toLowerCase();
        if (valid) {
            let profile = await client.hGet("user_profile", address.toString());
            if(!profile){
                profile={};
                // const userId = crypto.randomBytes(16).toString('hex');
                const random12Digits = generateRandomNumber(12);
                profile.userId=random12Digits;
                profile.address=address;
                await client.hSet("user_profile", address.toString(),JSON.stringify(profile));
            }
            req.session.user = { address };

            const data = { "address": address };
            sendResponse(res, 200, 200, 'Login successful.', data);
        } else {
            sendResponse(res, 401, 401, 'Invalid signature.');
        }

    } catch (error) {
        console.log(error)
        sendResponse(res, 500, 500, 'Error verifying signature.');
    }
});

app.post('/editProfile', isAuthenticated, async (req, res) => {
    try {
        let { userName, email } = req.body;
        const address = req.session.user.address;
        let profile = await client.hGet("user_profile", address.toString());
        profile=JSON.parse(profile);
        if (userName) {
            profile.userName = userName;
        }
        if (email) {
            profile.email = email;
        }
        await client.hSet("user_profile", address.toString(), JSON.stringify(profile))
        sendResponse(res, 200, 200, 'successful.', profile);
    } catch (error) {
        console.log(error)
        sendResponse(res, 500, 500, 'Error verifying signature.');
    }
});

app.get('/getProfile', isAuthenticated, async (req, res) => {
    try {
        const address = req.session.user.address;
        const profile = await client.hGet("user_profile", address.toString());
        console.log("profile: ",profile);
        sendResponse(res, 200, 200, 'successful.', JSON.parse(profile));
    } catch (error) {
        console.log(error)
        sendResponse(res, 500, 500, 'Error verifying signature.');
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

app.get('/submit_email',async (req, res) => {
    try {
        const email = req.query.email;
        if(email &&  validate(email)){
            await client.sAdd("bridge_subscribe",email);
        }else {
            sendResponse(res, 600, 600, 'err0r');
        }
        sendResponse(res, 200, 200, 'success');
    } catch (error) {
        console.error("logout",error);
        sendResponse(res, 500, 500, 'err0r');
    }
});
// const address="Ox11"
// let profile = await client.hGet("user_profile", address.toString());
// if(!profile){
//     profile={};
//     const userId = crypto.randomBytes(16).toString('hex');
//     profile.userId=userId;
//     profile.address=address;
//     await client.hSet("user_profile", address.toString(),JSON.stringify(profile));
//     console.log("set profile");
// }


const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
