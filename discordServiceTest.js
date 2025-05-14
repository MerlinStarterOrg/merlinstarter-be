import{ Client, GatewayIntentBits } from "discord.js";

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


async function checkDiscordMembers(discord_id){
    const guild = await discord.guilds.fetch('1185043742902718624');
    // const guild = await discord.guilds.fetch('1217149058955874365');
    const members = await guild.members.fetch();
    for (const m of members) {
        console.log(m[1].user.id);
        console.log(m[1].user.username);
        if (m[1].user.id===discord_id){
            console.log("已加入discord userName:",m[1].user.username);
        }
    }
}
await initDiscordClient();
await checkDiscordMembers();
// await checkDiscordMembers("966718811359281212")
// await discordCallback("l6Kq4tsxwo4cFLk9KEByllTAMtOLNp")
