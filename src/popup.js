import './polyfill';
import 'style/popup.scss';

import React from 'react';
import { render } from 'react-dom';
import { PopupApplication } from 'Popup/index.tsx';
import { Analitics } from 'Popup/Service';

const trackException = (exception) => {
    try {
        Analitics.exception(exception);
    } catch (error) {
        console.log('Error on send exception to GA!');
    }
};

const onContentLoaded = () => {
    let ComponentElement = document.getElementById('popup-application');

    try {
        render(<PopupApplication />, ComponentElement);
    } catch (exception) {
        ComponentElement.innerHTML = 'Something wrong!';
        console.error(
            "\n Error in React component:\n ------------------------------ \n",
            exception
        );

        trackException(exception);
    }
};

document.addEventListener('DOMContentLoaded', onContentLoaded);

