import {Store} from 'redux';
import {each, find} from 'lodash';
import createClient, {IBerryMarketCap, ITickerData} from 'berrymarketcap';
import {IBackgroundCore} from 'Core/Declarations/Service';
import {AbstractController} from "Background/Service/AbstractController";
import {IStore} from 'Core/Declarations/Store';
import {CoinAction} from 'Core/Actions/Reducer';
import {coinList, CoinInterface, TickerInterface, FiatSymbol} from 'Core/Coins';
import {TickerEvent} from "Core/Actions/Controller";

const tickerTimeout = 3 * 60 * 1000;

export class TickerController extends AbstractController {

    tickerObserverTimeout;
    coinMarkerCapClient: IBerryMarketCap;

    public constructor(app: IBackgroundCore, store: Store<IStore>) {
        super(app, store);

        this.coinMarkerCapClient = createClient({timeout: 10000});

        this.extractTickers();
        this.tickerObserverTimeout = setInterval(this.extractTickers, tickerTimeout);

        this.bindEventListener(TickerEvent.ChangeCurrentFiat, this.changeCurrentFiat);
    }

    public get alias(): string {
        return 'TICKER';
    }

    protected extractTickers = () => {
        const {currentFiatKey = FiatSymbol.USDollar} = this.getState().Coin;
        const requestOptions = {convert: currentFiatKey.toUpperCase()};

        const onSuccess = (data: ITickerData[]) => {
            const payloadTickers: TickerInterface[] = [];

            each(coinList, (coin: CoinInterface) => {
                const coinTicker: ITickerData = find(data, ((tick: ITickerData) => tick.symbol === coin.getKey()) as any);
                if (!coinTicker) return;

                payloadTickers.push({
                    key: coin.getKey(),
                    priceBtc: parseFloat(coinTicker.price_btc),
                    priceFiat: parseFloat(coinTicker[`price_${currentFiatKey.toLowerCase()}`])
                } as TickerInterface);
            });

            this.dispatchStore(CoinAction.SetTickers, {
                tickers: payloadTickers
            });
        };

        this.coinMarkerCapClient
            .getTickers(requestOptions)
            .then(onSuccess);
    };

    /**
     * Action
     *
     * @param request
     * @returns {any}
     */
    public changeCurrentFiat: EventHandlerType = (request: any): any => {
        this.dispatchStore(CoinAction.SetCurrentFiat, {
            fiatKey: request.fiat
        });

        this.extractTickers();
    };
}
