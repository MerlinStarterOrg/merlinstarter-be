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

