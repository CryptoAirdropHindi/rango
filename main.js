import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import { createAndSendTransaction } from './transactions.js';
import { privateKey, address, amount, bridgeFrom, bridgeTo } from './config.js';
import log from "./utils/logger.js";
import banner from "./utils/banner.js";

const rangoId = randomUUID()
const reffCode = '4a624ab5-16ff-4f96-90b7-ab00ddfc342c';
const baseUrl = 'https://api-edge.rango.exchange';

const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8,zh-CN;q=0.7,zh-TW;q=0.6,zh;q=0.5',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Origin': 'https://app.rango.exchange',
    'Referer': 'https://app.rango.exchange/',
    'Sec-CH-UA': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'x-rango-id': rangoId,
};

// Function to make the "confirm" request
async function fetchConfirm(requestId) {
    const confirmPayload = {
        requestId,
        selectedWallets: {
            BASE: address,
            ARBITRUM: address,
            POLYGON: address,
            ZKSYNC: address,
            OPTIMISM: address,
            LINEA: address,
            MODE: address,
            SCROLL: address,
            BLAST: address,
        },
    };

    const confirmResponse = await fetch(`${baseUrl}/routing/confirm?apiKey=${reffCode}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(confirmPayload),
    });

    if (!confirmResponse.ok) {
        throw new Error(`Confirm Request Failed: ${confirmResponse.status}`);
    }

    return await confirmResponse.json();
}

// Function to make the "create" request
async function fetchCreate(requestId) {
    const createPayload = {
        requestId,
        step: 1,
        userSettings: {
            slippage: "1",
        },
        validations: {
            balance: true,
            fee: true,
            approve: true,
        },
    };

    const createResponse = await fetch(`${baseUrl}/tx/create?apiKey=${reffCode}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(createPayload),
    });

    if (!createResponse.ok) {
        throw new Error(`Create Request Failed: ${createResponse.status}`);
    }

    return await createResponse.json();
};

async function fetchBests(amount, networkFrom, networkTo) {
    const bestsPayload = {
        amount,
        affiliateRef: "z9gOuF",
        from: {
            address: null,
            blockchain: networkFrom,
            symbol: "ETH",
        },
        to: {
            address: null,
            blockchain: networkTo,
            symbol: "ETH",
        },
        selectedWallets: {},
        slippage: "1",
        swapperGroups: [],
        swappersGroupsExclude: true,
    };

    const bestsResponse = await fetch(`${baseUrl}/routing/bests?apiKey=${reffCode}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bestsPayload),
    });

    if (!bestsResponse.ok) {
        throw new Error(`fetch Bests Request Failed: ${bestsResponse.status}`);
    }

    return await bestsResponse.json();
}

// Function to make the "fetc status tx" request
async function fetchStatusTx(requestId, txId) {
    const createPayload = {
        requestId,
        txId,
        "step": 1
    }

    const createResponse = await fetch(`${baseUrl}/tx/check-status?apiKey=${reffCode}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(createPayload),
    });

    if (!createResponse.ok) {
        throw new Error(`Create Request Failed: ${createResponse.status}`);
    }

    return await createResponse.json();
}

// Function to make the "fetch balance" request
async function fetchBalance(network, address) {

    const createResponse = await fetch(`${baseUrl}/wallets/details?apiKey=${reffCode}&address=${network}.${address}`, {
        method: 'GET',
        headers: headers,
    });

    if (!createResponse.ok) {
        throw new Error(`Create Request Failed: ${createResponse.status}`);
    }

    return await createResponse.json();
}

async function executeTransaction(amount, networkFrom, networkTo) {
    try {
        // Step 1: Fetch best routing options
        const bestsData = await fetchBests(amount, networkFrom, networkTo);
        const requestId = bestsData.results[0].requestId;
        log.info(`Creating Bridge Request using ID: ${requestId}`);
        log.info(`Bridge Max Output Amount: ${bestsData.results[0].outputAmount}`);

        // Step 2: Confirm the transaction
        await fetchConfirm(requestId);

        // Step 3: Create the transaction
        const createData = await fetchCreate(requestId);

        const { blockChain, data, to, gasPrice, gasLimit, value } = createData.transaction;

        // Send the transaction
        const txId = await createAndSendTransaction(data, value, gasLimit, gasPrice, to, privateKey, blockChain);
        let statusTx = await fetchStatusTx(requestId, txId);

        log.info(`Checking Bridge Status : ${statusTx.status}`)
        while (statusTx.status !== "success") {
            statusTx = await fetchStatusTx(requestId, txId);

            if (statusTx.status === "success") {
                log.info(`Transaction ID: ${requestId} has been successfully executed.`);
                const explorerUrl = statusTx.explorerUrl;
                const inboundExp = explorerUrl[0].url
                const outboundExp = explorerUrl[1] ? explorerUrl[1].url : null
                log.info(`Block Explorer inbound : ${inboundExp}`);
                log.info(`Block Explorer outbound: ${outboundExp}`);
            } else if (statusTx.status === 'running') {
                log.warn(`Transaction ID: ${requestId} is still pending.`);
            } else if (statusTx.status === 'failed') {
                log.error(`Transaction ID: ${requestId} has failed.`);
                break;
            } else {
                log.error(`Transaction ID: ${requestId} has error.`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        // Step 4: Fetch the balance
        await fetchBalance(networkTo, address);
        await fetchBalance(networkFrom, address);

    } catch (error) {
        log.error(`Error: ${error.message}`);
    }
}

async function main() {
    log.warn(banner)
    while (true) {
        const randomNumber = Math.floor(Math.random() * (60 - 10 + 1)) + 10;
        log.info(`=== Bridge Transaction from ${bridgeFrom} to ${bridgeTo} value ${amount} ===`);
        await executeTransaction(amount, bridgeFrom, bridgeTo);
        log.info(`=== Santuy, Cooldown ${randomNumber} Seconds before continue! ===`);
        await new Promise(resolve => setTimeout(resolve, randomNumber * 1000));

        log.info(`=== Bridge Transaction from ${bridgeTo} to ${bridgeFrom} value ${amount} ===`);
        await executeTransaction(amount, bridgeTo, bridgeFrom);
        log.info(`=== Santuy, Cooldown ${randomNumber} Seconds before continue! ===`);
        await new Promise(resolve => setTimeout(resolve, randomNumber * 1000));
    }
};

process.on('SIGINT', () => {
    log.warn("Exiting Program...");
    process.exit(0);
});

// run
main()
