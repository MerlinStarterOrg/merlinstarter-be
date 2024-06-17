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
