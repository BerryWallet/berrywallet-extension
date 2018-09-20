import { Store } from 'redux';
import { IStore } from 'Core/Declarations/Store';
import { Reducer, Controller } from 'Core/Actions';
import { AbstractController } from 'Background/service/abstract-controller';

export class OptionController extends AbstractController {

    /**
     * @param {IBackgroundCore} app
     * @param {Store<IStore>} store
     */
    public constructor(app: BgController.IBackgroundCore, store: Store<IStore>) {
        super(app, store);

        this.bindEventListener(Controller.OptionEvent.SetFee, this.setFee);
    }

    public get alias(): string {
        return 'OPTION';
    }

    /**
     * @param request
     * @returns {any}
     */
    private setFee: EventHandlerType = (request: any): any => {

        const { fee } = request;

        this.dispatchStore(Reducer.OptionAction.SetFee, { fee: fee });

        return {
            success: true,
        };
    };
}
