import axios from 'axios';
import{ Client, GatewayIntentBits } from "discord.js";
import {getConnection, releaseConnection} from "./db.js";
import {setBindSteps, setBindStepsFinal} from "./mineralservice.js";
import {client} from "./redisClient.js";
// const CLIENT_ID = '1217111281106944111'
// const CLIENT_SECRET = '5KoM0eF8SMv3AdKqTF8d1AggQv1B4dls'
const CLIENT_ID = '1217331191892541502'
const CLIENT_SECRET = 'process.env.DISCORD_CLIENT_SECRET'
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_API_URL = 'https://discord.com/api/users/@me'
const REDIRECT_URI="https://discord.com/oauth2/authorize?client_id=1217331191892541502&response_type=code&redirect_uri=https%3A%2F%2Fdiscord.merlinstarter.com%2Fdiscord_callback&scope=identify"//"https://discord.com/oauth2/authorize?client_id=1217111281106944111&response_type=code&redirect_uri=https%3A%2F%2Fdiscord.merlinstarter.com%2Fdiscord_callback&scope=identify"

let discord;

async function initDiscordClient(){
    discord = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            // placeholder
        ]
    });
    await discord.login(process.env.DISCORD_BOT_TOKEN);
}
function getDiscordOauthUrl(){
    return REDIRECT_URI;
}

async function discordCallback(code,walletAddress){
    let connection;
    try {
        connection=await getConnection();
        // placeholder
        const tokenResponse = await axios.post(DISCORD_TOKEN_URL, new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: "https://discord.merlinstarter.com/discord_callback"
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // placeholder
        const userResponse = await axios.get(DISCORD_API_URL, {
            headers: {
                Authorization: `Bearer ${tokenResponse.data.access_token}`
            }
        });

        /* placeholder */

















        // placeholder
        // console.log("discord user_info:",userResponse.data)
        if (userResponse.data.id){
            const userDiscordId=userResponse.data.id;
            const username=userResponse.data.username;
            const [discordBinds, ] = await connection.query("select * from user_tg_discord where discord_id=? and wallet_address!=?", [userDiscordId,walletAddress]);
            if (discordBinds.length>0){
                console.log("discord has been bind,dc name:",username," dc id:",userDiscordId,"by wallet:",discordBinds[0].wallet_address," new walletAddress:",walletAddress);
                return 1
            }
            const [walletBindRows, ] = await connection.query("select * from user_tg_discord where wallet_address=?", [walletAddress]);
            if (walletBindRows.length === 0) {
                await connection.query("insert into user_tg_discord(wallet_address,discord_id,discord_username) values(?,?,?)",[walletAddress,userDiscordId,username]);
            } else if(!walletBindRows[0].discord_id){
                await connection.query("update user_tg_discord set discord_id=?,discord_username=? where wallet_address=?",[userDiscordId,username,walletAddress]);
            }
            // await connection.query("update mineral_users set discord_id=?,discord_username=?,steps='step1;step2;step3;step4;step5-1;' where wallet_address=?", [userDiscordId,username,walletAddress]);
        }
    } catch (error) {
        console.error('Failed to exchange Discord code for token:', error);
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }

}

async function checkDiscordMembers(walletAddress){
    let connection;
    try{
        connection=await getConnection();
        const [resultRows,] = await connection.query("select * from mineral_users where wallet_address = ?", [walletAddress]);
        if (resultRows.length===0){
            return false;
        }
        const guild = await discord.guilds.fetch('1185043742902718624');
        const members = await guild.members.fetch();
        for (const m of members) {
            // console.log(m[1].user.id);
            // console.log(m[1].user.username);
            if (m[1].user.id===resultRows[0].discord_id){
                console.log("已加入discord userName:",m[1].user.username);
                await setBindStepsFinal(walletAddress,"step1;step2;step3;step4;step5-1;","step1;step2;step3;step4;step5;")
                return true;
            }
        }
        return false;
    }finally {
        if (connection){
            releaseConnection(connection)
        }
    }
}

async function checkHasJoinDcServer( addr, serverId) {
    let connection;
    try{
        connection=await getConnection();
        const key="join_dc_servers_"+addr;
        const hasJoin=await client.sIsMember(key,serverId);
        if (hasJoin){
            return 2;
        }
        const [resultRows,] = await connection.query("select * from user_tg_discord where wallet_address = ?", [addr]);
        if (resultRows.length === 0) {
            return -1;
        }
        if (resultRows[0].discord_id) {
            const guild = await discord.guilds.fetch(serverId);
            const members = await guild.members.fetch();
            for (const m of members) {
                // console.log(m[1].user.id);
                // console.log(m[1].user.username);
                if (m[1].user.id===resultRows[0].discord_id){
                    console.log("已加入discord userName:",m[1].user.username);
                    await client.sAdd(key,serverId);
                    return 2;
                }
            }
            return 1;
        }else {
            return 0;
        }
    }finally {
        if (connection){
            releaseConnection(connection);
        }
    }

}

await initDiscordClient();
// await checkDiscordMembers("966718811359281212")
// await discordCallback("l6Kq4tsxwo4cFLk9KEByllTAMtOLNp")
export {getDiscordOauthUrl,discordCallback,checkDiscordMembers,checkHasJoinDcServer}