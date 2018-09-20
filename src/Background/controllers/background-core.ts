import { Dictionary, merge, find } from 'lodash';
import Extberry from 'extberry';
import { Store } from 'redux';
import { EventEmitter } from 'events';
import { createDebugger } from 'Core';
import { IStore } from 'Core/Declarations/Store';

const debug = createDebugger('BACKGROUND_EVENT');

export class BackgroundCore extends EventEmitter implements BgController.IBackgroundCore {
    public store: Store<IStore>;
    public controllers: BgController.IController[] = [];
    public eventHandlers: Dictionary<EventHandlerType> = {} as Dictionary<EventHandlerType>;

    /**
     * @param {Store<IStore>} store
     */
    public constructor(store: Store<IStore>) {
        super();

        this.store = store;
        Extberry.runtime.onMessage.addListener(this.generateEventListener());
    }

    /**
     * @param {ControllerConstructorType<T extends IController>} controller
     */
    public registerController<T extends BgController.IController>(controller: BgController.ControllerConstructorType<T>) {
        const newController: T = new controller(this, this.store);
        this.controllers.push(newController);

        this.eventHandlers = merge(this.eventHandlers, newController.getEventListeners());
    }

    /**
     * @param {string} alias
     * @returns {IController}
     */
    public get(alias: string): BgController.IController {
        const controller: BgController.IController
            = find(this.controllers, { alias: alias }) as BgController.IController;

        if (!controller) {
            throw Error(`Service '${alias}' has not registered!`);
        }

        return controller;
    }

    /**
     * @returns {EventListenerType}
     */
    public generateEventListener(): EventListenerType {
        return (request: IRuntimeRequest, sender: any, sendResponse): boolean => {
            const eventHandler: EventHandlerType = this.eventHandlers[request.type];

            debug(request.type, request.payload);

            if (!eventHandler) {
                return;
            }

            const onError = (error: Error) => {
                sendResponse({
                    error: {
                        message: error.message,
                        code: 'code' in error ? error['code'] : undefined,
                        name: error.name,
                        stack: error.stack,
                    },
                });
            };

            try {
                const onSuccess = (data) => {
                    sendResponse({ data: data });
                };

                const response = eventHandler(request.payload, sender);
                if (response instanceof Promise) {
                    response.then(onSuccess, onError).catch(onError);
                } else {
                    onSuccess(response);
                }
            } catch (error) {
                onError(error);
            }

            /**
             * SERIOUSLY??????????
             * I HAVE TO RETURN THIS FUCKED VALUE TO SAY: That I have many async responses???
             */
            return true;
        };
    }
}
