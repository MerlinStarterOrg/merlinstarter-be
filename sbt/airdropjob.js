import { CronJob } from 'cron';
import {confirmClaimResult, unlockToken} from "./mstartairdrop.js";

const job = new CronJob('0 */1 * * * *', async function() {
    await confirmClaimResult();
}, null, true, 'Asia/Shanghai');

job.start();

const unlockJob = new CronJob('0 30 19 * * *', async function() {
    await unlockToken();
}, null, true, 'Asia/Shanghai');
unlockJob.start();

