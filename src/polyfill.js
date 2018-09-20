// window.Buffer = require('buffer').Buffer;
// window.SafeBuffer = require('safe-buffer').Buffer;
import { mapExtberryToGlobalChrome } from 'extberry';

mapExtberryToGlobalChrome();

import BigNumber from 'bignumber.js';

BigNumber.config({ ERRORS: false });

const debugProvider = require('debug');
debugProvider.enable("berry:*");
