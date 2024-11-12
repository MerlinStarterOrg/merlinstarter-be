import XLSX from "xlsx"
import {client} from "./redisClient.js";
import {getConnection} from "./db.js";

async function readFirstColumnOfFirstSheet(filePath) {
    // placeholder
    const workbook = XLSX.readFile(filePath);

    // placeholder
    const firstSheetName = workbook.SheetNames[0];

    // placeholder
    const worksheet = workbook.Sheets[firstSheetName];

    // placeholder
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    let connection=await getConnection();
    // placeholder
    for(let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
        // placeholder
        const cellAddress = {c: 0, r: rowNum};

        // placeholder
        const cellRef = XLSX.utils.encode_cell(cellAddress);

        // placeholder
        const cell = worksheet[cellRef];

        const amount = {c: 1, r: rowNum};

        // placeholder
        const amountRef = XLSX.utils.encode_cell(amount);

        // placeholder
        const amountcell = worksheet[amountRef];

        // placeholder
        if(cell) {
            const [rows]=await connection.execute("update users u set u.stars=u.stars+? where u.wallet_address=? ",[amountcell.v,cell.v]);
            if (rows.affectedRows===1){
                console.log("add success:",cell.v+"---",amountcell.v);
            }else {
                console.log("user not register:",cell.v+"---",amountcell.v);
            }
        }
    }
}

async function  testAddstarts(){
    let connection=await getConnection();
    const [rows]=await connection.execute("update users u set u.stars=u.stars+? where u.wallet_address=? ",[100,'10xA9C8f281f6e89F501972A4dE47eCC29eDE9D0b12']);
    console.log(rows.affectedRows===1);
}
// placeholder
const filePath = './.xlsx';
await readFirstColumnOfFirstSheet(filePath);
// await testAddstarts();
