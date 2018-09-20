import { wrapStore } from 'react-chrome-redux';
import { debounce } from 'lodash';
import { store, stateStorage } from 'Core/Store';
import { STORE_KEY } from 'Core/Constant';

import firebase from 'firebase';
import 'firebase/messaging';

// const DEFAULT_SW_PATH = '/firebase-messaging-sw.js';
// const DEFAULT_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

import {
    BackgroundCore,
    GlobalController,
    OptionController,
    StartUpController,
    TickerController,
    WalletController,
    KeyringController,
    ExchangeController,
} from 'Background/controllers';

export const initializeBackgroundApplication = (): void => {
    wrapStore(store, {
        portName: STORE_KEY,
    });

    registerFirebaseApp();

    const backgroundCore = new BackgroundCore(store);

    backgroundCore.registerController(KeyringController);
    backgroundCore.registerController(OptionController);
    backgroundCore.registerController(StartUpController);
    backgroundCore.registerController(TickerController);
    backgroundCore.registerController(WalletController);
    backgroundCore.registerController(GlobalController);
    backgroundCore.registerController(ExchangeController);

    const updateStoreListener = () => {
        const actualState = stateStorage.getState();
        actualState.data = store.getState();

        stateStorage.putState(actualState);
    };

    store.subscribe(debounce(updateStoreListener, 200));
};


async function registerFirebaseApp(): Promise<void> {
    if (!navigator && !('serviceWorker' in navigator)) {
        return;
    }

    try {
        firebase.initializeApp({
            apiKey: "AIzaSyAMhLAPjiAjUUdoxXLaJtgHlEC9WB8wWZY",
            authDomain: "berrywallet-spreader.firebaseapp.com",
            databaseURL: "https://berrywallet-spreader.firebaseio.com",
            projectId: "berrywallet-spreader",
            storageBucket: "berrywallet-spreader.appspot.com",
            messagingSenderId: "508872957744",
        });
        console.log('1');


        const messaging = firebase.messaging();
        console.log('2');

        const currentToken: string = await messaging.getToken();
        console.log('3');

        console.log('Push token!', currentToken);
    } catch (error) {
        console.error(error);
    }
}
