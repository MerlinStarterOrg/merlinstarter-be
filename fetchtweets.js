import moment from 'moment';
import { TwitterApi } from 'twitter-api-v2';
import { twitterFetchClient } from './twitterClient.js';
import { twitter_id, twitter_user_name } from './config.js';
import { getConnection, releaseConnection } from './db.js';
import { client } from './redisClient.js';

async function fetchTweets(userId) {
    const poolConnection = await getConnection();
    try {
        const hasTweets = await hasTweetsInDatabase(poolConnection);
    // console.log("hasTweets:",hasTweets);
    let params = { exclude: 'replies', "tweet.fields": "created_at" };
    if (hasTweets) {
        const sinceId = await getLatestTweetId(poolConnection);
        console.log("fetch tweets sinceId:", sinceId);
        params.since_id = sinceId;
    } else {
        // placeholder
        const today = moment().startOf('day').toISOString();
        console.log("start time:", today)
        params.start_time = today;
    }

    const tweets = await twitterFetchClient.v2.userTimeline(userId, params);
    const responseData = tweets.data;
    if (!Array.isArray(responseData.data)) {
        console.log("no new tweet ");
        return;
    }
    for (const tweet of responseData.data) {
        console.log("Created At:", tweet.created_at);
        console.log("Text:", tweet.text);
        console.log("ID:", tweet.id);
        const formattedDateTime = moment(tweet.created_at).format('YYYY-MM-DD HH:mm:ss'); // placeholder
        const insertRewardRecordSql = 'INSERT INTO tweets (tweet_id, content, twitter_id,twitter_username,tweet_publish_time) VALUES (?, ?, ?,?,?)';
        await poolConnection.query(insertRewardRecordSql, [tweet.id, tweet.text, userId, twitter_user_name, formattedDateTime]);
    }
    }catch(error){
        const rateLimit = error.rateLimit;
        if (rateLimit) {
            console.log("rateLimit::", rateLimit);
            const remaining = rateLimit.remaining;
            if (remaining == 0) {
                await client.set("ratelimit_reset", rateLimit.reset);
                const remain=getSleepTime(rateLimit.reset);
                if(remain>0){
                   console.log("fetchTweets wait rate limit,remain: ",remain)
                   await sleep(remain);
                   console.log("fetchTweets go on");
                   await fetchTweets(userId);
                }
            }
        }else{
            console.log("fetchTweets 异常",error)
        }
        // console.error("fetch tweets error:", error.data)
    }finally{
        if(poolConnection){
            releaseConnection(poolConnection);
        }
    }
    
    // {
    //     data: [
    //       {
    //         created_at: '2024-01-28T11:08:54.000Z',
    //         text: '🟠 Orange Pill: Stay in the ordinary crypto world.\n' +
    //           '\n' +
    //           '🔵 Blue Pill: Dive into the extraordinary unity of #BRC20 and @SuiNetwork with #BitSui Crypto Bridge\n' +
    //           '\n' +
    //           '🟠 or 🔵 ?\n' +
    //           '\n' +
    //           '#CryptoBridge #Bitcoin #Sui $SSBT',
    //         id: '1751562992674869301',
    //         edit_history_tweet_ids: [Array]
    //       }
    //     ],
    //     meta: {
    //       result_count: 1,
    //       newest_id: '1751562992674869301',
    //       oldest_id: '1751562992674869301'
    //     }
    //   }
}

async function hasTweetsInDatabase(connection) {
    const checkSql = 'select count(1) count from tweets ';
    const [resultRows,] = await connection.query(checkSql, []);
    const count = resultRows[0].count;
    // console.log("Count:", count);
    return count > 0;
}

async function getLatestTweetId(connection) {
    const sql = 'select tweet_id from tweets ORDER BY tweet_publish_time desc limit 1';
    const [resultRows,] = await connection.query(sql, []);
    const tweet_id = resultRows[0].tweet_id;
    return tweet_id;
}

async function getLikingUsersOfTweet(tweetId) {
    const paginationToken = await client.hGet("tweet_liking_next_token", tweetId)
    console.log("getLikingUsersOfTweet ", tweetId, " current token ", paginationToken);
    let params = paginationToken ? { pagination_token: paginationToken } : {};
    // const size = await client.sCard("tweet_liking_users_" + tweetId);
    // if (size < 100) {
    // placeholder
    //     params = {};
    // }
    params["user.fields"] = "id,name,username"; // placeholder
    params.max_results = 100;
    // console.log("params:", params);
    try {
        const response = await twitterFetchClient.v2.get(`tweets/${tweetId}/liking_users`, params);
        if (!Array.isArray(response.data)) {
            console.log("not liking update ", tweetId,"response :",response);
            await client.hDel("tweet_liking_next_token", tweetId);
            return;
        }

        for (const user of response.data) {
            const userId = user.id;
            // const username=user.username;
            const rediskey = "user_liking_" + userId;
            await client.sAdd(rediskey, tweetId);
            await client.sAdd("tweet_liking_users_" + tweetId, userId);
            // console.log(username,"user liking::",);  
        }
        const next_token = response.meta.next_token;
        if (next_token) {
            console.log("getLikingUsersOfTweet ", tweetId, " next token ", next_token);
            await client.hSet("tweet_liking_next_token", tweetId, next_token);
            await getLikingUsersOfTweet(tweetId);
        }
    } catch (error) {
        // console.error('Error fetching liking users:', error.data);
        // throw error;
        const rateLimit = error.rateLimit;
        if (rateLimit) {
            console.log("rateLimit::", rateLimit);
            const remaining = rateLimit.remaining;
            if (remaining == 0) {
                await client.set("ratelimit_reset", rateLimit.reset);
                const remain=getSleepTime(rateLimit.reset);
                if(remain>0){
                   console.log("getLikingUsersOfTweet wait rate limit,tweetId:",tweetId," remain:",remain)
                   await sleep(remain);
                   console.log("getLikingUsersOfTweet go on");
                   await getLikingUsersOfTweet(tweetId);
                }
            }
        }else{
            console.log("getLikingUsersOfTweet异常：",error);
        }
    }
}

async function getRetweetedUsersOfTweet(tweetId) {
    const paginationToken = await client.hGet("tweet_re_next_token", tweetId)
    console.log("getRetweetedUsersOfTweet ", tweetId, " current token ", paginationToken);
    let params = paginationToken ? { pagination_token: paginationToken } : {};
    // const size = await client.sCard("tweet_re_users_" + tweetId);
    // if (size < 100) {
    // placeholder
    //     params = {};
    // }
    params["user.fields"] = "id,name,username"; // placeholder
    params.max_results = 100;
    console.log("params:", params);
    try {
        const response = await twitterFetchClient.v2.get(`tweets/${tweetId}/retweeted_by`, params);
        if (!Array.isArray(response.data)) {
            console.log("not retweet update ", tweetId,"response :",response);
            await client.hDel("tweet_re_next_token", tweetId);
            return;
        }

        for (const user of response.data) {
            const userId = user.id;
            // const username=user.username;
            const rediskey = "user_retweet_" + userId;
            await client.sAdd(rediskey, tweetId);
            await client.sAdd("tweet_re_users_" + tweetId, userId);
            // console.log(username,"user liking::",);  
        }
        const next_token = response.meta.next_token;
        if (next_token) {
            console.log("getRetweetedUsersOfTweet ", tweetId, " next token ", next_token);
            await client.hSet("tweet_re_next_token", tweetId, next_token);
            await getRetweetedUsersOfTweet(tweetId);
        }
    } catch (error) {
        // console.error('Error getRetweetedUsersOfTweet:', error.data);
        // throw error;
        const rateLimit = error.rateLimit;
        if (rateLimit) {
            console.log("rateLimit::", rateLimit);
            const remaining = rateLimit.remaining;
            if (remaining == 0) {
                await client.set("ratelimit_reset", rateLimit.reset);
                const remain=getSleepTime(rateLimit.reset);
                if(remain>0){
                   console.log("getRetweetedUsersOfTweet wait rate limit,tweetId:",tweetId," remain:",remain)
                   await sleep(remain);
                   console.log("getRetweetedUsersOfTweet go on");
                   await getRetweetedUsersOfTweet(tweetId);
                }
            }
        }else{
            console.log("getRetweetedUsersOfTweet异常：",error);
        }
    }
}

async function getQuoteTweetsOfTweet(tweetId) {
    const paginationToken = await client.hGet("tweet_quote_next_token", tweetId)
    console.log("getQuoteTweetsOfTweet ", tweetId, " current token ", paginationToken);
    let params = paginationToken ? { pagination_token: paginationToken } : {};
    // const size = await client.sCard("tweet_quote_users_" + tweetId);
    // if (size < 100) {
    // placeholder
    //     params = {};
    // }
    params["tweet.fields"] = "author_id"; // placeholder
    params.max_results = 100;
    // const lastFetchedTweetId=await client.hGet("quote_lastFetchedTweetId",tweetId)
    // if (lastFetchedTweetId) {
    //     params.since_id = lastFetchedTweetId;
    // }
    console.log("params:", params);
    try {
        const response = await twitterFetchClient.v2.get(`tweets/${tweetId}/quote_tweets`, params);
        // console.log("quote response:",response);
        if (!Array.isArray(response.data)) {
            console.log("not quote update ", tweetId,"response :",response);
            await client.hDel("tweet_quote_next_token", tweetId);
            return;
        }

        const latestTweetId = response.data.length > 0 ? response.data[0].id : null;
        if (latestTweetId) {
            console.log("quote Latest Tweet ID:", latestTweetId);
            await client.hSet("quote_lastFetchedTweetId", tweetId, latestTweetId);
        }

        for (const tweet of response.data) {
            const userId = tweet.author_id;
            // const username=user.username;
            const rediskey = "user_quote_" + userId;
            await client.sAdd(rediskey, tweetId);
            await client.sAdd("tweet_quote_users_" + tweetId, userId);
            // console.log(username,"user liking::",);  
        }
        const next_token = response.meta.next_token;
        if (next_token) {
            console.log("getQuoteTweetsOfTweet ", tweetId, " next token ", next_token);
            await client.hSet("tweet_quote_next_token", tweetId, next_token);
            await getQuoteTweetsOfTweet(tweetId);
        }
    } catch (error) {
        // console.error('Error getRetweetedUsersOfTweet:', error.data);
        // throw error;
        const rateLimit = error.rateLimit;
        if (rateLimit) {
            console.log("rateLimit::", rateLimit);
            const remaining = rateLimit.remaining;
            if (remaining == 0) {
                await client.set("ratelimit_reset", rateLimit.reset);
                const remain=getSleepTime(rateLimit.reset);
                if(remain>0){
                   console.log("getQuoteTweetsOfTweet wait rate limit,tweetId:",tweetId," remain:",remain)
                   await sleep(remain);
                   console.log("getQuoteTweetsOfTweet go on");
                   await getQuoteTweetsOfTweet(tweetId);
                }
            }
        }else{
            console.log("getQuoteTweetsOfTweet 异常：",error);
        }
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function queryInteractions() {
    const condi=true;
    while(condi){
        let connection;
        try{
            connection = await getConnection();
            const ids = await queryTweetsRecent12Hours(connection);
            if (!Array.isArray(ids)) {
                console.log("not tweet update ");
                continue;
            }
            // placeholder
            await fetchTweets(twitter_id);
            await sleep(10000);
            // let ratelimit_reset = await client.get("ratelimit_reset");
            // if (ratelimit_reset) {
            //     ratelimit_reset = parseInt(ratelimit_reset, 10) * 1000;
            //     const currentTime = Date.now();
            // placeholder
            //     if (currentTime < ratelimit_reset) {
            //         const remain = ratelimit_reset - currentTime;
            // placeholder
            //         await sleep(remain);
            // placeholder
            //     }
                
            // }
      
            for (const id of ids) {
                try {
                    let ratelimit_reset = await client.get("ratelimit_reset");
                    if (ratelimit_reset) {
                        ratelimit_reset = parseInt(ratelimit_reset, 10) * 1000;
                        const currentTime = Date.now();
                        if (currentTime < ratelimit_reset) {
                            const remain = ratelimit_reset - currentTime;
                            console.log("限制范围内，休眠：", remain);
                            await sleep(remain);
                            console.log("休眠结束");
                        }
                      
                    }
                    const tweet_id = id.tweet_id;
                    // placeholder
                    await getLikingUsersOfTweet(tweet_id);
                    await sleep(10000);
                    console.log("------------------------------------------------------")
                    await getRetweetedUsersOfTweet(tweet_id);
                    await sleep(10000);
                    console.log("------------------------------------------------------")
                    await getQuoteTweetsOfTweet(tweet_id);
                    await sleep(10000);
                    console.log("------------------------------------------------------")
                } catch (error) {
                    const rateLimit = error.rateLimit;
                    if (rateLimit) {
                        console.log("rateLimit::", rateLimit);
                        const remaining = rateLimit.remaining;
                        if (remaining == 0) {
                            await client.set("ratelimit_reset", rateLimit.reset);
                        }
                    }
                    console.error("queryInteractions error:", error.data)
                } 
            }
         
        }catch(error){
            console.log(error);
            await sleep(10000);
        }finally {
            if (connection) {
                releaseConnection(connection);
            }
        }
    }

}



async function queryTweetsRecent12Hours(connection) {
    const sql = "SELECT * FROM tweets WHERE tweet_publish_time > NOW() - INTERVAL 24 HOUR and content not like 'RT %'";
    const [resultRows,] = await connection.query(sql, []);
    return resultRows;
}

function getSleepTime(resetTime){
    const currentTime = Date.now();
    const remain = resetTime*1000 - currentTime;
    return remain;
}

async function testApiResponse(){
    const tweetId="1765658643352187350";
    const paginationToken = await client.hGet("tweet_liking_next_token_", tweetId)
    console.log("getLikingUsersOfTweet ", tweetId, " current token ", paginationToken);
    let params = paginationToken ? { pagination_token: paginationToken } : {};
    // const size = await client.sCard("tweet_liking_users_" + tweetId);
    // if (size < 100) {
    // placeholder
    //     params = {};
    // }
    params["user.fields"] = "id,name,username"; // placeholder
    params.max_results = 100;
    console.log("params:", params);
    try {
        const response = await twitterFetchClient.v2.get(`tweets/${tweetId}/liking_users`, params);
        if (!Array.isArray(response.data)) {
            console.log("not liking update ", tweetId,"response :",response);
            return;
        }

        for (const user of response.data) {
            const userId = user.id;
            // const username=user.username;
            const rediskey = "user_liking_" + userId;
            await client.sAdd(rediskey, tweetId);
            await client.sAdd("tweet_liking_users_" + tweetId, userId);
            // console.log(username,"user liking::",);  
        }
        const next_token = response.meta.next_token;
        if (next_token) {
            console.log("getLikingUsersOfTweet ", tweetId, " has next token ", next_token);
            await client.hSet("tweet_liking_next_token_", tweetId, next_token);
            await testApiResponse();
        }
    } catch (error) {
        // console.error('Error fetching liking users:', error.data);
        // throw error;
        const rateLimit = error.rateLimit;
        if (rateLimit) {
            console.log("rateLimit::", rateLimit);
            const remaining = rateLimit.remaining;
            if (remaining == 0) {
                await client.set("ratelimit_reset", rateLimit.reset);
                const remain=getSleepTime(rateLimit.reset);
                if(remain>0){
                   console.log("getLikingUsersOfTweet wait rate limit,tweetId:",tweetId," remain:",remain)
                   await sleep(remain);
                   console.log("getLikingUsersOfTweet go on");
                   await testApiResponse();
                }
            }
        }else{
            console.log("getLikingUsersOfTweet异常：",error);
        }
    }
    console.log("finish ...")
}
// await fetchTweets(twitter_id);
// await getLikingUsersOfTweet("1751804010506719298");
// await getRetweetedUsersOfTweet("1751804010506719298");
// await getQuoteTweetsOfTweet("1751804010506719298");
// const data=await queryTweetsRecent12Hours(await getConnection());
// console.log("data:",data);
await queryInteractions();
// await testCount();
// await testApiResponse();


export { getLatestTweetId, fetchTweets, queryInteractions };