import express from 'express';

import {checkHasJoinTgGroup, mage_tg_group_id, merlin_tg_group_id} from "./telegram.js";
import {checkHasJoinDcServer} from "./discordService.js";
import {delay, isAuthenticated, sendResponse} from "./base_router.js";
import {
    addMageUser,
    follow_mage_twitter,
    follow_merlin_twitter,
    MageBindingTwittet,
    mageCheck,
    MageInfo, post_mage_tweet, setMageBindSteps, setMageBindStepsFinal
} from "./mage_airdrop_service.js";
const mageRouter = express();

mageRouter.get('/mage_check_wallet', isAuthenticated, async (req, res) => {
    try {
        const inviteCode=req.query.code;
        const result= await  mageCheck(req.session.wallet.addr);
        if(result){
            await addMageUser(req.session.wallet.addr,inviteCode);
            return sendResponse(res, 200, 200, "success",true);
        }else {
            const message="Not eligible for the draw; requires wallet holdings or Merlin's Seal staking of over 0.00001 BTC";
            return sendResponse(res, 500, 500, message,false);
        }
    } catch (err) {
        console.error("/mage_check_wallet:", err);
        sendResponse(res, 500, 500, err);
    }
});

mageRouter.get('/mage_info', isAuthenticated, async (req, res) => {
    try {
        let  result=await MageInfo(req.session.wallet.addr);
        if (!result){
            result={};
        }
        return sendResponse(res, 200, 200, "success",result);
    } catch (err) {
        console.error("/mage_info:", err);
        sendResponse(res, 500, 500, err);
    }
});

mageRouter.get('/mage_bind', isAuthenticated, async (req, res) => {
    try {
        const result=await MageBindingTwittet(req.session.user.userId, req.session.wallet.addr);
        return sendResponse(res, 200, 200, "success",result);
    } catch (err) {
        console.error("/mage_bind:", err);
        sendResponse(res, 500, 500, err);
    }
});

mageRouter.get('/mage_follow_merlin_twitter', isAuthenticated, async (req, res) => {
    try {
        await follow_merlin_twitter(req.session.wallet.addr);
        await delay(5000);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/mage_follow_merlin_twitter:", err);
        sendResponse(res, 500, 500, err);
    }
});

mageRouter.get('/mage_follow_mage_twitter', isAuthenticated, async (req, res) => {
    try {
        await follow_mage_twitter(req.session.wallet.addr);
        // const result=await checkHasJoinTgGroup( req.session.wallet.addr, merlin_tg_group_id);
        // if (result===2){
        //     const dccheck=await checkHasJoinDcServer(req.session.wallet.addr,"1204999197582163988");
        //     if (dccheck===1){
        //         await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;","step5;step6-1;")
        //     }else if (dccheck===2){
        //         await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;","step5;step6;")
        //     }else {
        //         await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;step5;");
        //     }
        // }else if (result===1){
        //     await setMerlinswapBindSteps(req.session.wallet.addr,"step1;step2;step3;step4;","step5-1;")
        // }
        await delay(5000);
        return sendResponse(res, 200, 200, "success");
    } catch (err) {
        console.error("/mage_follow_mage_twitter:", err);
        sendResponse(res, 500, 500, err);
    }
});
mageRouter.get('/mage_check_join_merlin_tg_group', isAuthenticated, async (req, res) => {
    try {
        const result=await checkHasJoinTgGroup(req.session.wallet.addr, merlin_tg_group_id);
        if (result===2){
            await setMageBindStepsFinal(req.session.wallet.addr,"step1;step2;step3;step4;step5-1;","step1;step2;step3;step4;step5;step6-1;");
            return sendResponse(res,200,200,"success",true);
        }else {
            return sendResponse(res,200,200,"success",false);
        }
    } catch (err) {
        console.error('/mage_check_join_merlin_tg_group error ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    }
});

mageRouter.get('/mage_check_join_mage_tg_group', isAuthenticated, async (req, res) => {
    try {
        // console.log("mage_check_join_mage_tg_group wallet:",req.session.wallet);
        const result=await checkHasJoinTgGroup(req.session.wallet.addr, mage_tg_group_id);
        if (result===2){
            await setMageBindStepsFinal(req.session.wallet.addr,"step1;step2;step3;step4;step5;step6-1;","step1;step2;step3;step4;step5;step6;");
            return sendResponse(res,200,200,"success",true);
        }else {
            return sendResponse(res,200,200,"success",false);
        }
    } catch (err) {
        console.error('/mage_check_join_mage_tg_group error ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    }
});
mageRouter.get('/mage_post_tweet', isAuthenticated, async (req, res) => {
    try {
        await post_mage_tweet(req.session.wallet.addr);
        await delay(5000);
        return sendResponse(res,200,200,"success",true);
    } catch (err) {
        console.error('/mage_post_tweet error ', err);
        sendResponse(res, 500, 500, "Please join the group.");
    }
})

export {mageRouter}