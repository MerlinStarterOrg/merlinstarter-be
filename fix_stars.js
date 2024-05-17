
async function fixStars() {
    const connection = await getConnection();
    let page = 0;
    const perPage = 1000;
    const nopledgeStars = 100;
    while(true) {
        const [userRows, ] = await connection.query("select * from users limit ?,?", [page * perPage, perPage]);
        if (userRows.length == 0) {
            break;
        }
        for (const user of userRows) {
            let claimedStars = nopledgeStars;
            if (Number(user.is_claimed) == 0) {
                claimedStars = 0;
            } else {
                const [pldegeRows, ] = await connection.query("select stars from pledge_data where wallet_address = ?", [user.wallet_address]);
                if (pldegeRows.length != 0) {
                    claimedStars = pldegeRows[0].stars;
                }
            }
            const [inviteRows, ] = await connection.query("select count(1) as count from users where invite_id = ?", [user.Id]);
            let inviteStars = 0;
            if (inviteRows.length != 0) {
                inviteStars = inviteRows[0].count * 800;
            }
            let activityStars = 0;
            if (Number(user.is_shared) == 1) {
                activityStars += 20;
            }
            if (Number(user.is_retweet_like) == 1) {
                activityStars += 30;
            }
            console.log("user id: ", user.Id, ", claimed stars: ", claimedStars, ", invite stars: ", inviteStars, ", activity stars: ", activityStars);
            let allStars = claimedStars + inviteStars + activityStars;
            // await connection.query("update users set stars = ?, claimed_stars = ?, invite_stars = ?, activity_stars = ?", [allStars, claimedStars, inviteStars, activityStars]);
        }
        page ++;
    }
}