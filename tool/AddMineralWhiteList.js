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

        // placeholder
        if(cell) {
            await connection.query("update mineral_users m set m.is_draw=1,m.points=2 where wallet_address= ? ",[cell.v]);
            console.log(cell.v+"---",rowNum);
        }
    }
}

// placeholder
const filePath = './mner_walletlist.xlsx';
await readFirstColumnOfFirstSheet(filePath);
