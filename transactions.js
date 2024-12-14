import { ethers } from "ethers";
import log from "./utils/logger.js";

export async function createAndSendTransaction(hexData, value, gasLimit, gasPrice, recipient, privateKey, network) {
    const RPC_URLS = {
        BASE: "https://base.llamarpc.com",
        ARBITRUM: "https://arbitrum.llamarpc.com",
        LINEA: "https://linea.drpc.org",
        BLAST: "https://blast-rpc.publicnode.com",
        POLYGON: "https://polygon.llamarpc.com",
        ZKSYNC: "https://mainnet.era.zksync.io",
        OPTIMISM: "https://optimism.llamarpc.com",
        MODE: "https://mainnet.mode.network",
        SCROLL: "https://scroll-mainnet-public.unifra.io"
    };
    const RPC_URL = RPC_URLS[network];
    // Initialize a provider 
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const wallet = new ethers.Wallet(privateKey, provider);

    // Transaction details 
    const transactionDetails = {
        to: recipient,
        data: hexData,
        value,
        gasLimit,
        gasPrice
    };

    if (transactionDetails.nonce) {
        transactionDetails.nonce = transactionDetails.nonce;
    }

    try {
        // Sign and send the transaction
        const txResponse = await wallet.sendTransaction(transactionDetails);
        log.info(`Transaction sent! Hash: ${txResponse.hash}`);

        // Wait for the transaction to be mined
        const txReceipt = await txResponse.wait();
        log.info(`Transaction mined! Block Number: ${txReceipt.blockNumber}`);

        return txResponse.hash;
    } catch (error) {
        log.error("Error sending transaction:", error);
        return null;
    }

}
