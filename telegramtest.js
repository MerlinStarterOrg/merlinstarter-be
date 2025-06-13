import {setBindStepsFinal} from "./mineralservice.js";
import TelegramBot from 'node-telegram-bot-api';
const tg_token = "7086300464:AAEJAoWM2ls62pq7X4Wr1wuWu3n3Zu9DRSc";
const merlin_tg_group_id = "-1002063662758";
const mineral_tg_group_id = "-1002053889474";
let bot;
async function initBot(){
    bot = new TelegramBot(tg_token);
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const checkTgGroup = async (groupId,telegram_id) => {
    const memberRow = await bot.getChatMember(groupId, telegram_id);
    if (memberRow.user && Number(memberRow.user.id) === Number(telegram_id)) {
        console.log("checkTgGroup success");
    }else {
        console.log("不在群")
    }
};
async function getBotUpdate(){
    console.log("getBotUpdate....");
    while (true){
        const botupdatemsg= await bot.getUpdates();
        for (let i=0;i<botupdatemsg.length;i++){
            console.log("botupdatemsg:",botupdatemsg[i]);
        }
        await delay(2000)
    }
}
await initBot();
// await getBotUpdate();
await checkTgGroup(mineral_tg_group_id,"2061179087")
