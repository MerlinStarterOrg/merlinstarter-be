import {database} from './config.js';
import mysql from 'mysql2/promise';

const pool = mysql.createPool(database);

async function getConnection() {
    // placeholder
    // placeholder
    const poolConnection = await pool.getConnection();
    // placeholder
    return poolConnection;
}

function releaseConnection(poolConnection) {
    // pool.releaseConnection(poolConnection);
    // placeholder
    poolConnection.release();
    // pool.releaseConnection(poolConnection)
    // placeholder
}

async function query(sql, params) {
    const [results, ] = await pool.execute(sql, params);
    return results;
}

export {getConnection,query,releaseConnection}
