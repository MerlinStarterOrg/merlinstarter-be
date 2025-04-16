import { twitterClient, twitterFetchClient } from './twitterClient.js';
import { twitter_id, twitter_user_name } from './config.js';
import { getConnection, releaseConnection } from './db.js';

async function syncFollowers() {
    console.log(twitterFetchClient.v2);
    const result = await twitterFetchClient.v2.followers(twitter_id);
    console.log(result);
    try {
        const connection = await getConnection();
        const [dbFollowers, ] = await connection.query("select * from twitter_follows where account_id = ?", [twitter_id]);
        let dbfs = {};
        for (const dbf of dbFollowers) {
            dbfs[dbf.twitter_id] = dbf.twitter_username;
        }
        const [dbTwitterIds, ] = await connection.query("select twitter_id, twitter_username from users");
        for (const dtId of dbTwitterIds) {
            if (dbfs.hasOwnProperty[dtId.twitter_id]) {
                continue;
            }
            const result = await twitterFetchClient.v2.get(`/users/${twitter_id}/followed_lists`);
            if (result.data.following === true) {
                await connection.query("insert into twitter_follows(account_id, account_name, twitter_username, twitter_id) values(?, ?, ?, ?);", [twitter_id, twitter_user_name, dtId.twitter_username, dtId.twitter_id]);
            }
        }
        releaseConnection(releaseConnection);
      } catch (error) {
        releaseConnection(releaseConnection);
        console.log(error);
      }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function cron() {
    const condi = true;
    while(condi) {
        syncFollowers();
        await sleep(60 * 1000);
    }

}

await cron();

export { syncFollowers };
