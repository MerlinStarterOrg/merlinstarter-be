import {client} from './redisClient.js';
import { twitterFetchClient ,rateLimitPlugin} from './twitterClient.js';

async function testCount(userId){
    const likingKey="user_liking_"+userId.toString();
    const rekey="user_retweet_"+userId.toString();
    const quotekey="user_quote_"+userId.toString();
    const likingSize=await client.sCard(likingKey);
    const reSize=await client.sCard(rekey);
    const quoteSize=await client.sCard(quotekey);
    console.log(likingSize," == ",reSize," == ",quoteSize);
}

async function testTweetCount(tweet_id){
    const likingKey="tweet_liking_users_"+tweet_id;
    const rekey="tweet_re_users_"+tweet_id;
    const quotekey="tweet_quote_users_"+tweet_id;
    const likingSize=await client.sCard(likingKey);
    const reSize=await client.sCard(rekey);
    const quoteSize=await client.sCard(quotekey);
    console.log("likingSize=",likingSize," reSize= ",reSize," quoteSize= ",quoteSize);
}

async function getLikingUsersOfTweet(tweetId) {
    const paginationToken=await client.hGet("tweet_liking_next_token",tweetId)
    console.log("getLikingUsersOfTweet ",tweetId," current token ",paginationToken);
    let params = paginationToken ? { pagination_token: paginationToken } : {};
    const size= await client.sCard("tweet_liking_users_"+tweetId);
    if(size<100){
        console.log("不用分页查询，数量小于100：",size);
        params={};
    }
    params["user.fields"] = "id,name,username"; // placeholder
    params.max_results=100;
    console.log("params:",params);
    try {
        const response = await twitterFetchClient.v2.get(`tweets/${tweetId}/liking_users`, params);
        const limit=await rateLimitPlugin.v2.getRateLimit("/2/tweets/:id/liking_users","GET");
        console.log("limit ",limit);
        console.log("response ",response);
        if(!Array.isArray(response.data)){
            console.log("not liking update ",tweetId);   
            return; 
        }

