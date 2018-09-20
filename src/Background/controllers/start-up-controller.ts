import {Store} from 'redux';

import {IStore, IWelcomeStore} from 'Core/Declarations/Store';
import {StartUpEvent} from 'Core/Actions/Controller';
import {GlobalAction, WelcomeAction, KeyringAction} from 'Core/Actions/Reducer';
import {generateSeedVault} from 'Core/Service/SeedVault';
import {AbstractController} from 'Background/service/abstract-controller'
import {KeyringController, WalletController} from "Background/controllers";

export class StartUpController extends AbstractController {
    
    public constructor(app: BgController.IBackgroundCore, store: Store<IStore>) {
        super(app, store);

        this.bindEventListener(StartUpEvent.Prepare, this.prepare);
    }

    public get alias(): string {
        return 'START_UP';
    }

    private validateWelcome(welcome: IWelcomeStore) {
        if (!welcome.seed) {
            throw new Error('Seed must be set in Welcome!');
        }

        if (!welcome.coins) {
            throw new Error('Coins must be set in Welcome!');
        }

        if (!welcome.passcode) {
            throw new Error('Passcode must be set in Welcome!');
        }
    }

    /**
     * @returns {any}
     */
    private prepare: EventHandlerType = (): any => {

        const {Welcome, Global} = this.getState();

        if (Global.walletReady) {
            return {
                message: "Wallet Manager already prepared"
            };
        }

        this.validateWelcome(Welcome);

        const keyringController: KeyringController = this.getApp().get("KEYRING") as KeyringController;
        const walletController: WalletController = this.getApp().get("WALLET") as WalletController;

        const seedWords = Welcome.seed.split(' ');

        const seedVault = generateSeedVault(seedWords, Welcome.passcode);

        this.dispatchStore(KeyringAction.SetSeedVault, {
            vault: seedVault.getVaultData()
        });

        keyringController.setVault(seedVault.getVaultData());
        keyringController.setPassword(Welcome.passcode);
        Welcome.coins.forEach((coin) => {
            walletController.activateWallet(coin);
        });

        this.dispatchStore(GlobalAction.WalletReady);
        this.dispatchStore(WelcomeAction.Clear);

        return {
            message: "Wallet Manager successful prepared"
        };
    }
}
