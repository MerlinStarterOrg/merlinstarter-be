import TelegramBot from 'node-telegram-bot-api';
import { getConnection, releaseConnection } from './db.js';
import { client } from './redisClient.js';
import {tg_token} from "./telegram.js";

// {
//     message_id: 3,
//     from: {
//       id: 2126270532,
//       is_bot: false,
//       first_name: 'Jsame',
//       language_code: 'zh-hans'
//     },
//     chat: { id: 2126270532, first_name: 'Jsame', type: 'private' },
//     date: 1710255724,
//     text: '/start 123',
//     entities: [ { offset: 0, length: 6, type: 'bot_command' } ]
// }

const bot = new TelegramBot(tg_token, { polling: true });
// const connection = await getConnection();

bot.on('message', async (msg) => {
    let connection;
    try {
        connection = await getConnection();
        const TelegramUserId = msg.chat.id.toString();
        const hasBind = await client.sIsMember("bind_tg_id", TelegramUserId);
        const TelegramUserName = msg.chat.first_name;
        if (!msg.text){
            return;
        }
        const code = msg.text.replace("/start ", "");
        const [codeRows, ] = await connection.query("select wallet_address from users where invite_code = ?", [code]);
        if (codeRows.length === 0) {
            return;
        }
        console.log(`tg id: ${TelegramUserId}, tg username: ${TelegramUserName},new bind walletAddress: ${codeRows[0].wallet_address}`);
        // if (hasBind) {
        //     console.log("telegram has been linked:",TelegramUserId," wallet:",code);
        //     // bot.sendMessage(TelegramUserId, "Your telegram has been linked.");
        // } else {
        //     const addr = codeRows[0].wallet_address;
        //     console.log(`tg id: ${TelegramUserId}, addr: ${addr}`);
        //     const [walletBindRows, ] = await connection.query("select * from user_tg_discord where wallet_address=?", [addr]);
        //     if (walletBindRows.length === 0) {
        //         // bot.sendMessage(TelegramUserId, "Register your wallet first.");
        //         await connection.query("insert into user_tg_discord(wallet_address,telegram_id,telegram_username) values(?,?,?)",[addr,TelegramUserId,TelegramUserName]);
        //     } else if(!walletBindRows[0].telegram_id){
        //         await connection.query("update user_tg_discord set telegram_id=?,telegram_username=? where wallet_address=?",[TelegramUserId,TelegramUserName,addr]);
        //         // await connection.query("update mineral_users set telegram_id = ?, telegram_username = ?,steps='step1;step2;step3;step4;step5;step6-1;' where wallet_address = ?", [TelegramUserId, TelegramUserName, addr]);
        //         // await client.sAdd("bind_tg_id", TelegramUserId);
        //         // bot.sendMessage(TelegramUserId, `Hi ${TelegramUserName}, bind your wallet success.Have fun.`);
        //     }
        // }
        const addr = codeRows[0].wallet_address;
        console.log(`tg id: ${TelegramUserId}, addr: ${addr}`);
        const [walletBindRows, ] = await connection.query("select * from user_tg_discord where wallet_address=?", [addr]);
        if (walletBindRows.length === 0) {
            // bot.sendMessage(TelegramUserId, "Register your wallet first.");
            await connection.query("insert into user_tg_discord(wallet_address,telegram_id,telegram_username) values(?,?,?)",[addr,TelegramUserId,TelegramUserName]);
        } else if(!walletBindRows[0].telegram_id){
            await connection.query("update user_tg_discord set telegram_id=?,telegram_username=? where wallet_address=?",[TelegramUserId,TelegramUserName,addr]);
            // await connection.query("update mineral_users set telegram_id = ?, telegram_username = ?,steps='step1;step2;step3;step4;step5;step6-1;' where wallet_address = ?", [TelegramUserId, TelegramUserName, addr]);
            // await client.sAdd("bind_tg_id", TelegramUserId);
            // bot.sendMessage(TelegramUserId, `Hi ${TelegramUserName}, bind your wallet success.Have fun.`);
        }
    } catch (err) {
        console.log(err);
    } finally {
        if (connection){
            releaseConnection(connection);
        }
    }
});
