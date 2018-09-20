import { each, debounce } from 'lodash';
import BigNumber from 'bignumber.js';
import { Coin, Wallet } from '@berrywallet/core';
import { Coins, createDebugger, Actions } from 'Core';
import { WalletController } from 'Background/controllers';
import { sendNotification, TransactionNotification } from 'Core/Extension/NotificationManager';

const updateBlockTimeout = 20 * 60 * 1000;

export class WalletManager {
    protected wdProvider: Wallet.Provider.WDProvider;

    protected debug;
    protected coin: Coins.CoinInterface;
    protected controller: WalletController;
    protected updaterTimeoutIndex;

    protected lastConnectionCheck: Date;

    /**
     * @param {CoinInterface} coin
     * @param {WDProvider} wdProvider
     * @param {WalletController} walletController
     */
    public constructor(wdProvider: Wallet.Provider.WDProvider,
                       coin: Coins.CoinInterface,
                       walletController: WalletController) {

        this.coin = coin;
        this.wdProvider = wdProvider;
        this.controller = walletController;

        this.debug = createDebugger('WM:' + this.coin.getUnit());

        this.mapEventsToWallet();

        wdProvider.getNetworkProvider().onNewBlock(this.updateBlockInfo);
        wdProvider.getNetworkProvider().getTracker().onConnect(() => {
            if (this.lastConnectionCheck) {
                const currentTime = new Date().getTime();
                if (currentTime - this.lastConnectionCheck.getTime() > updateBlockTimeout) {
                    this.updateWalletData();
                }
            }

            this.lastConnectionCheck = new Date();
        });

        wdProvider.on('tx:new', async (tx: Wallet.Entity.WalletTransaction) => {
            const balance = this.wdProvider.balance;

            this.debug(`Balance ${this.coin.getName()}`, JSON.parse(JSON.stringify(this.wdProvider.balance)), tx);

            const amount = Wallet.calculateTxBalance(balance, tx.txid);

            if (amount > 0) {
                const notificationId: string = await sendNotification(
                    new TransactionNotification(this.coin, tx, amount),
                );
                this.debug('Showed Notification with ID:' + notificationId);
            }
        });

        this.setUpdateTimeout();
    }

    public getWallet(): Wallet.Provider.WDProvider {
        return this.wdProvider;
    }

    public updateBlockInfo = (block: Wallet.Entity.Block) => {
        this.controller.dispatchStore(Actions.Reducer.CoinAction.SetBlockHeight, {
            coinKey: this.coin.getKey(),
            blockHeight: block.height,
        });
    };

    protected putNewTx(tx: Wallet.Entity.WalletTransaction): void {
        this.wdProvider.tx.add(tx);
    }

    protected mapEventsToWallet() {
        const walletDataSaver = debounce(() => {
            const actionPayload = {
                walletCoinKey: this.coin.getKey(),
                walletData: this.wdProvider.getData(),
            };

            this.controller.dispatchStore(Actions.Reducer.WalletAction.SetWalletData, actionPayload);
            this.setUnconfirmedTxTracking();
        }, 300);

        this.wdProvider.onChange(walletDataSaver);

        const trackAddress: string[] = this.wdProvider.address.list().map(addr => addr.address);
        const networkProvider = this.wdProvider.getNetworkProvider();
        networkProvider.onAddrsTx(trackAddress, (tx) => this.putNewTx(tx));

        this.setUnconfirmedTxTracking();
    }

    /**
     * @param {string} address
     * @param {number} value
     * @param {FeeTypes} fee
     *
     * @returns {Promise<WalletTransaction>}
     */
    public sendTransaction = async (address: string,
                                    value: BigNumber,
                                    fee: Coin.FeeTypes = Coin.FeeTypes.Medium): Promise<Wallet.Entity.WalletTransaction> => {

        const bufferSeed = this.controller.getSeed();

        const privateWallet = this.wdProvider.getPrivate(bufferSeed);
        const parsedAddress = Coin.parseAddressByCoin(this.wdProvider.getData().coin, address);

        let transaction;
        try {
            transaction = await privateWallet.createTransaction(parsedAddress, value, fee);
        } catch (error) {
            this.debug('Error on create transaction', error);

            throw new Error('Error on create transaction');
        }

        try {
            const txid: string = await privateWallet.broadcastTransaction(transaction);

            const walletTx = Wallet.coinTxToWalletTx(txid, transaction, this.coin.getCoreCoin());
            this.putNewTx(walletTx);

            return walletTx;
        } catch (error) {
            this.debug('Error on send transaction', error);

            throw new Error('Error on send transaction');
        }
    };

    /**
     * @param {string} address
     * @param {number} value
     * @param {FeeTypes} fee
     * @returns {Promise<BigNumber>}
     */
    public calculateFee = (address: string, value: number, fee: Coin.FeeTypes = Coin.FeeTypes.Medium) => {
        const bufferSeed = this.controller.getSeed();

        if (!address) {
            throw new Error('Enter address');
        }

        const privateWallet = this.wdProvider.getPrivate(bufferSeed);
        let parsedAddress = null;

        if (address) {
            try {
                parsedAddress = Coin.parseAddressByCoin(this.wdProvider.getData().coin, address);
            } catch (error) {
                this.debug('Parsing address error', error);
            }
        }

        if (!parsedAddress) {
            throw new Error('Invalid address');
        }

        return privateWallet.calculateFee(new BigNumber(value), parsedAddress, fee);
    };

    public destruct(): void {
        if (this.wdProvider) {
            this.wdProvider.destruct();
        }
    }

    protected setUnconfirmedTxTracking(): void {
        const tracker = this.wdProvider.getNetworkProvider().getTracker();

        tracker.removeAllListeners('tx.*');

        each(this.wdProvider.tx.unconfirmedList(), (utx) => {
            tracker.onTransactionConfirm(utx.txid, (tx) => this.putNewTx(tx));
        });
    }

    protected updateWalletData = (): void => {
        try {
            this.wdProvider.getUpdater().update();
        } catch (error) {
            this.debug('Updating WD error', error);
        }
    };

    protected setUpdateTimeout = (): void => {
        if (this.updaterTimeoutIndex) {
            clearTimeout(this.updaterTimeoutIndex);
        }

        this.updaterTimeoutIndex = setInterval(this.updateWalletData, 15 * 60 * 1000);
    };

    public getPrivateKey(walletAddress: Wallet.Entity.WalletAddress): string {
        const bufferSeed = this.controller.getSeed();
        const privateWallet = this.wdProvider.getPrivate(bufferSeed);
        const addressNode = privateWallet.deriveAddressNode(walletAddress);

        return addressNode.getPrivateKey().toString();
    }
}
