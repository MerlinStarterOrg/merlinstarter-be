import { TwitterApi } from 'twitter-api-v2';
import { TwitterApiRateLimitPlugin }  from '@twitter-api-v2/plugin-rate-limit';
import { twitter_app_key, twitter_app_secret, twitter_app_access_token, twitter_app_access_secret } from './config.js';
const twitterClient = new TwitterApi({
  appKey: twitter_app_key,
  appSecret: twitter_app_secret,
  accessToken: twitter_app_access_token,
  accessSecret: twitter_app_access_secret,
});
const rateLimitPlugin = new TwitterApiRateLimitPlugin()
const twitterFetchClient = new TwitterApi({
    appKey: twitter_app_key,
    appSecret: twitter_app_secret,
    accessToken: twitter_app_access_token,
    accessSecret: twitter_app_access_secret,

    // appKey: "twitter_app_key",
    // appSecret: "twitter_app_secret",
    // accessToken: "twitter_app_access_token",
    // accessSecret: twitter_app_access_secret,
},{plugins: [rateLimitPlugin]});


export {twitterClient,twitterFetchClient,rateLimitPlugin};