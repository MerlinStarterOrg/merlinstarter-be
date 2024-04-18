import {setBindStepsFinal} from "./mineralservice.js";
import TelegramBot from 'node-telegram-bot-api';
import {client} from "./redisClient.js";
import {getConnection, releaseConnection} from "./db.js";
const tg_token = "7086300464:AAEJAoWM2ls62pq7X4Wr1wuWu3n3Zu9DRSc";
const merlin_tg_group_id = "-1002063662758";
const mineral_tg_group_id = "-1002053889474";
const mage_tg_group_id = "-1001700043887";
let bot;
async function initBot(){
    bot = new TelegramBot(tg_token);
}
const checkTgGroup = async (connection, addr, groupId, checkSteps, newSteps) => {
    const [resultRows,] = await connection.query("select * from mineral_users where wallet_address = ?", [addr]);
    if (resultRows.length === 0) {
        return false;
    }
    if (resultRows[0].telegram_id) {
        const memberRow = await bot.getChatMember(groupId, resultRows[0].telegram_id);
        if (memberRow.user && Number(memberRow.user.id) === Number(resultRows[0].telegram_id)) {
            const stepResult = await setBindStepsFinal(addr, checkSteps, newSteps);
            const key="join_tg_groups_"+addr;
            await client.sAdd(key,groupId);
            return true;
        }
    }
    return false;
};

