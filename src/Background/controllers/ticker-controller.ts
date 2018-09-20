import { Store } from 'redux';
import { each, find } from 'lodash';
import createClient, { IBerryMarketCap, ITickerData } from 'berrymarketcap';
import { AbstractController } from "Background/service/abstract-controller";
import { IStore } from 'Core/Declarations/Store';
import { CoinAction } from 'Core/Actions/Reducer';
import { coinList, CoinInterface, TickerData, FiatSymbol } from 'Core/Coins';
import { TickerEvent } from 'Core/Actions/Controller';

const tickerTimeout = 3 * 60 * 1000;

export class TickerController extends AbstractController {

    protected tickerObserverTimeout;
    protected coinMarkerCapClient: IBerryMarketCap;

    public constructor(app: BgController.IBackgroundCore, store: Store<IStore>) {
        super(app, store);

        this.coinMarkerCapClient = createClient({ timeout: 10000 });

        this.extractTickers();
        this.tickerObserverTimeout = setInterval(this.extractTickers, tickerTimeout);

        this.bindEventListener(TickerEvent.ChangeCurrentFiat, this.changeCurrentFiat);
    }

    public get alias(): string {
        return 'TICKER';
    }

    protected extractTickers = async () => {
        const { currentFiatKey = FiatSymbol.USDollar } = this.getState().Coin;
        const requestOptions = { convert: currentFiatKey.toUpperCase() };

        const data: ITickerData[] = await this.coinMarkerCapClient.getTickers(requestOptions);

        const payloadTickers: TickerData[] = [];

        each(coinList, (coin: CoinInterface) => {
            const coinTicker: ITickerData = find(data, ((tick: ITickerData) => tick.symbol === coin.getKey()) as any);
            if (!coinTicker) return;

            payloadTickers.push({
                key: coin.getKey(),
                priceBtc: parseFloat(coinTicker.price_btc),
                priceUsd: parseFloat(coinTicker.price_usd),
                priceFiat: parseFloat(coinTicker[`price_${currentFiatKey.toLowerCase()}`]),
            } as TickerData);
        });

        this.dispatchStore(CoinAction.SetTickers, {
            tickers: payloadTickers,
        });
    };

    public changeCurrentFiat: EventHandlerType = (request: any): any => {
        this.dispatchStore(CoinAction.SetCurrentFiat, {
            fiatKey: request.fiat,
        });

        this.extractTickers();
    };
}
