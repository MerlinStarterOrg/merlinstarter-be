
import { twitterFetchClient } from './twitterClient.js';
import { client } from './redisClient.js';
// placeholder
async function getUserInfo(username) {
    try {
        // placeholder
        const user = await twitterFetchClient.v2.userByUsername(username);
        console.log(user);
        // let score=4000;
        // const added=await client.hGet("scores_added",user.data.id);
        // if(added){
        //     const addpts=parseInt(added,10);
        //     console.log("addpts",addpts);
        //     score=score+addpts;
        // }
        // await client.hSet("scores_added",user.data.id,score);
    } catch (error) {
        console.error('Error fetching user information:', error);
    }
}

async function batchFetch() {
    const usernames = [
        'youzi2021'
    ];
    for (const username of usernames) {
        await getUserInfo(username);
    }
}

batchFetch();


