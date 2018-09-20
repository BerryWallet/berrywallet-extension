import { Wallet } from '@berrywallet/core';
import { Coins, createDebugger, Actions, Wallet as CoreWallet } from 'Core';
import { NeedPasswordError } from 'Background/Errors';
import { WalletController } from 'Background/controllers';
import { WalletManager } from './';

export interface IWalletManagerGenerator {

    generate(): Promise<WalletManager>;
}

export class WalletManagerGenerator implements IWalletManagerGenerator {

    protected coin: Coins.CoinInterface;
    protected controller: WalletController;
    protected debug;

    /**
     * @param {CoinInterface} coin
     * @param {WalletController} controller
     */
    public constructor(coin: Coins.CoinInterface, controller: WalletController) {
        this.coin = coin;
        this.controller = controller;
        this.debug = createDebugger(`WD_Generator: ${this.coin.getUnit()}`);
    }

    public async generate(): Promise<WalletManager> {

        this.debug(`Creating WalletManager for coin: ${this.coin.getKey()}`);
        const wdFromStorage: Wallet.Provider.WDProvider | undefined = await this.extractWDFromStorage();

        if (wdFromStorage) {
            return this.buildWalletManager(wdFromStorage);
        }

        this.debug(`Start generation for coin: ${this.coin.getKey()}`);

        let wdGenerator: Wallet.Generator.WDGeneratorInterface = null;
        try {
            const seed = this.controller.getSeed();
            wdGenerator = CoreWallet.createWDGenerator(this.coin, seed);
        } catch (error) {
            this.debug('Error on data generating', error);
            if (error instanceof NeedPasswordError) {
                // @TODO Need some code
            }

            throw error;
        }

        const wdProvider: Wallet.Provider.WDProvider = await wdGenerator.fill();

        const actionPayload = {
            walletCoinKey: this.coin.getKey(),
            walletData: wdProvider.getData(),
        };

        this.controller.dispatchStore(Actions.Reducer.WalletAction.Activate, actionPayload);
        this.controller.stopWalletLoading(this.coin);

        return this.buildWalletManager(wdProvider);
    }

    protected async extractWDFromStorage(): Promise<Wallet.Provider.WDProvider | undefined> {
        this.debug(`Start extracting WD from storage for coin: ${this.coin.getKey()}`);

        let iCoinWallet,
            walletData: Wallet.Entity.WalletData = null;

        try {
            iCoinWallet = this.controller.getWalletData(this.coin.getKey());
            walletData = iCoinWallet.walletData;
        } catch (error) {
            this.debug('Extracting error', error);

            return;
        }

        if (!walletData) {
            return;
        }

        const wdProvider = new Wallet.Provider.WDProvider(walletData);
        this.controller.startWalletLoading(this.coin);
        wdProvider.getUpdater().update().then(() => {
            this.controller.stopWalletLoading(this.coin);
        });

        return wdProvider;
    }

    protected buildWalletManager = (wdProvider: Wallet.Provider.WDProvider): WalletManager => {
        return new WalletManager(wdProvider, this.coin, this.controller);
    };
}
