import { getConnection, releaseConnection } from "./db.js";

async function fixSteps() {
    const connection = await getConnection();
    let page = 0;
    const perPage = 10000;
    while(true) {
        const [userRows, ] = await connection.query("select * from users where is_claimed = 1 and steps != 'step1;step2;step3;step4;step5;' limit ?,?", [page * perPage, perPage]);
        if (userRows.length == 0) {
            break;
        }
        for (const user of userRows) {
            if (Number(user.is_claimed) === 1) {
                console.log("update users set steps = 'step1;step2;step3;step4;step5;' where wallet_address = '" + user.wallet_address + "' and is_claimed = 1");
                await connection.query("update users set steps = 'step1;step2;step3;step4;step5;' where wallet_address = ? and is_claimed = 1", [user.wallet_address]);
            }
        }
        page ++;
    }
    releaseConnection(connection);
}

fixSteps();
