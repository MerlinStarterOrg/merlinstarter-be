import XLSX from "xlsx"
import {getConnection} from "../db.js";
import {ethers} from "ethers";

async function readFirstColumnOfFirstSheet(filePath) {
    // placeholder
    const workbook = XLSX.readFile(filePath);

    // placeholder
    const firstSheetName = workbook.SheetNames[0];

    // placeholder
    const worksheet = workbook.Sheets[firstSheetName];

    // placeholder
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const start=Date.now();
    let connection=await getConnection();
    // placeholder
    for(let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
        // placeholder
        const cellAddress = {c: 0, r: rowNum};

        // placeholder
        const cellRef = XLSX.utils.encode_cell(cellAddress);

        // placeholder
        const cell = worksheet[cellRef];

        // placeholder
        const c2 = {c: 1, r: rowNum};

        // placeholder
        const c2Ref = XLSX.utils.encode_cell(c2);

        // placeholder
        const c2Content = worksheet[c2Ref];

        // placeholder
        if(cell) {
            const address=cell.v;
            // if (ethers.isAddress(address)) {
            //     console.log(address);
            //     await connection.query("insert into mner_collect(wallet,pri) values(?,?)",[address,"b"]);
            // } else {
            // placeholder
            // }
            const days=30;
            const totalAmount=c2Content.v;
            const unfreezeAmount=parseFloat((totalAmount/days).toFixed(4));
            console.log(address," == ",totalAmount," ",unfreezeAmount);
            await connection.query("insert into wallet_lock_balance(wallet_address,balance,unfreeze_amount,total_amount,remain_days) values(?,?,?,?,?)",[address,totalAmount,unfreezeAmount,totalAmount,days]);
            // await connection.query("insert into mner_collect(wallet,pri) values(?,?)",[address,c2Content.v]);
            // await connection.query("insert into spellbook_wallet_staking(address) values(?)",[cell.v]);
        }
    }
    console.log("finish。。。。。cost:",Date.now()-start);
}

async function  testAddstarts(){
    let connection=await getConnection();
    const [rows]=await connection.execute("update users u set u.stars=u.stars+? where u.wallet_address=? ",[100,'10xA9C8f281f6e89F501972A4dE47eCC29eDE9D0b12']);
    console.log(rows.affectedRows===1);
}
// placeholder
const filePath = './tool/AirDrop.xlsx';
await readFirstColumnOfFirstSheet(filePath);
// await testAddstarts();
