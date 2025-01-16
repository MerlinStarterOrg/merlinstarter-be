// placeholder
import Web3 from 'web3';
import {getConnection, releaseConnection} from "../db.js";
import {ethers} from "ethers";
import {CronJob} from "cron";

let web3;
let provider;
const contractAddress = '0xCbE00442243F01cB70D87ea7Ed5045B830F8ccDB'; // placeholder
const wsUrl = 'wss://bsc-mainnet.rpcfast.com/ws?api_key=kY4GucHPC1X1z9TA8KCVZs7TuTnr6ZDijsbMoqjC7lBh0vBWuHoYjAEPN3wKpjy8'; // placeholder
const contractABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "Exit",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "reward",
                "type": "uint256"
            }
        ],
        "name": "RewardAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "stakeType",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "Staked",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "_MaxTotalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "_totalLast",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "_totalReward",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "_totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "addWhiteAccount",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "ith",
                "type": "uint256"
            }
        ],
        "name": "exit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "stakeType",
                "type": "uint256"
            }
        ],
        "name": "getAPR",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "stakeType",
                "type": "uint256"
            }
        ],
        "name": "getMustStakeTime",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "getParameters",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "apr",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "dt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "stakeAmount",
                "type": "uint256"
            }
        ],
        "name": "getRewardAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "stakeType",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "stakeAmount",
                "type": "uint256"
            }
        ],
        "name": "getRewardForDuration",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "getStakeData",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "stakeType",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "stakeTime",
                "type": "uint256"
            }
        ],
        "name": "getStakeDt",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "ith",
                "type": "uint256"
            }
        ],
        "name": "getWhiteAccountIth",
        "outputs": [
            {
                "internalType": "address",
                "name": "WhiteAddress",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getWhiteAccountNum",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "isWhiteContract",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mAPRBase",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mDt",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mFundAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mStakeTypeMax",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mStartTime",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "maxStakeNumPerAdress",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mbOpenAPR",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "removeWhiteAccount",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "tDt",
                "type": "uint256"
            }
        ],
        "name": "setDt",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "tMaxTotalSupply",
                "type": "uint256"
            }
        ],
        "name": "setMaxTotalSupply",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_stakingToken",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "tDt",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "tMaxTotalSupply",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "bOpenAPR",
                "type": "bool"
            }
        ],
        "name": "setParameters",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "tStart",
                "type": "bool"
            }
        ],
        "name": "setStart",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_stakingToken",
                "type": "address"
            }
        ],
        "name": "setTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "stakeType",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "stake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "stakeAllNum",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "fromId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "toId",
                "type": "uint256"
            }
        ],
        "name": "stakeInfos",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "addrArr",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "timeArr",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "amountList",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "stakeTypeArr",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "bExitArr",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "stakeNum",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "ith",
                "type": "uint256"
            }
        ],
        "name": "stakeTimeAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "stakingToken",
        "outputs": [
            {
                "internalType": "contract IERC20",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "start",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "tokenAddr",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdrawToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "stateMutability": "payable",
        "type": "receive"
    }
];

function createWeb3() {

    provider = new Web3.providers.WebsocketProvider(wsUrl);

    provider.on('connect', () => {
        console.log('Web3 WS Connected');
    });

    provider.on('error', e => reconnect(e));
    provider.on('end', e => reconnect(e));

    return new Web3(provider);
}
function createWeb3ForHttp() {

    provider = new Web3.providers.HttpProvider("https://rpc.merlinchain.io");

    return new Web3(provider);
}
function reconnect(e) {
    console.log('WS Error', e);
    console.log('Attempting to reconnect...');
    web3.setProvider(createWeb3().currentProvider);
    subscribeToEvents(); // placeholder
}

function subscribeToEvents() {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    contract.events.Staked({
        fromBlock: '37969623'
    }, function (error, event) {
        if (error) {
            console.log(error);
        } else {
            console.log(event);
        }
    }).on('error', console.error);
}

async function  fetchPastEvents() {
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    const connection=await getConnection();
    try{
        const latestNum=await getLatestBlockNum();
        const fromBlock = await getBlocknum(connection)+1; // placeholder
        if (fromBlock>latestNum){
            console.log("fromBlock>latestNum: ",fromBlock," 》 ",latestNum);
            return;
        }
        let toBlock = fromBlock+1024; // placeholder
        if (toBlock>latestNum){
            console.log("toBlock>latestNum: ",toBlock," 》 ",latestNum);
            toBlock=latestNum;
        }
        console.log("from block:",fromBlock," to block:",toBlock);
        contract.getPastEvents('Staked', {
            fromBlock: fromBlock,
            toBlock: toBlock
        }).then(async events => {
            // console.log('Past events:', events);
            for (const event of events) {
                await handlEvent(connection, event);
            }
        }).catch(console.error);
        const sql="INSERT INTO `airdrop`.`staking_logs` (`block_num`,`tx_hash`) VALUES (?,?)";
        await connection.query(sql,[toBlock,toBlock]);
    }finally {
        if (connection){
            releaseConnection(connection);
        }
    }
}
async function handlEvent(connection,event){
    const { user, stakeType, amount } = event.returnValues;
    console.log(`User Address: ${user}`);
    console.log(`Stake Type: ${stakeType}`);
    console.log(`Amount: ${amount}`);
    console.log("blockNum:",event.blockNumber);
    console.log("txHash:",event.transactionHash);
    const amountDecimal=ethers.formatUnits(amount);
    let mticket = (12 + Number(stakeType)) * Number(stakeType) * amountDecimal / 3328;
    if (Number(stakeType)===0){
        mticket=(15.626 * amountDecimal) / 10000
    }
    // console.log(`amountDecimal: ${amountDecimal}`);
    // console.log(`mticket: ${mticket.toFixed(4)}`);
    const sql="INSERT INTO `airdrop`.`staking_logs` (`wallet_address`,  `block_num`, `amount`, `stake_type`, `tx_hash`,  `mticket`) VALUES (?,?,?,?,?,?)";
    await connection.query(sql,[user,event.blockNumber,amountDecimal,stakeType,event.transactionHash,mticket.toFixed(4)]);
    await connection.query("update users set mticket=mticket+? where wallet_address=?",[mticket.toFixed(4),user]);
}
async function getBlocknum(connection){
   const [results,]=await connection.query("select MAX(block_num) block_num from staking_logs");
   if (results[0].block_num){
       console.log("db blocknum:",results)
       return results[0].block_num;
   }
   return 10029360;
}

async function getLatestBlockNum(){
    const latestNum=await web3.eth.getBlockNumber();
    return latestNum;
}
function start() {
    web3 = createWeb3();
    subscribeToEvents();
}

// function fetch() {
//     web3 = createWeb3ForHttp();
//     fetchPastEvents();
// }
// start();
// fetch();

web3 = createWeb3ForHttp();

const job = new CronJob('*/10 * * * * *', async function() {
    await fetchPastEvents();
}, null, true, 'Asia/Shanghai');

job.start();
