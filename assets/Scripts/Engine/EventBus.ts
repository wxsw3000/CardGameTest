/**
 * @file EventBus.ts
 * @description A simple, global event bus for decoupled communication between game systems.
 */

// A type for the callback function that listeners will use.
type EventCallback = (data?: any) => void;

/**
 * @class EventBus
 * @description A singleton class that allows for subscribing to, unsubscribing from,
 *              and dispatching events throughout the application.
 */
export class EventBus {
    private static instance: EventBus;
    private listeners: { [event: string]: EventCallback[] } = {};

    private constructor() {
        // Private constructor to ensure singleton pattern
    }

    /**
     * @method getInstance
     * @description Gets the singleton instance of the EventBus.
     * @returns {EventBus} The singleton instance.
     */
    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    /**
     * @method on
     * @description Subscribes a callback function to a specific event.
     * @param event The name of the event to subscribe to.
     * @param callback The function to execute when the event is dispatched.
     */
    public on(event: string, callback: EventCallback): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * @method off
     * @description Unsubscribes a callback function from a specific event.
     * @param event The name of the event to unsubscribe from.
     * @param callback The callback function to remove.
     */
    public off(event: string, callback: EventCallback): void {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== callback
        );
    }

    /**
     * @method dispatch
     * @description Dispatches an event, calling all subscribed callbacks with the provided data.
     * @param event The name of the event to dispatch.
     * @param data Optional data to pass to the event listeners.
     */
    public dispatch(event: string, data?: any): void {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event].forEach((listener) => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in event listener for [${event}]:`, error);
            }
        });
    }
}

/**
 * A list of common game events. Using constants helps avoid typos.
 */
export const GameEvents = {
    // Game State Events
    GAME_START: 'game:start',
    TURN_START: 'game:turn_start',
    PHASE_CHANGED: 'game:phase_changed',
    GAME_OVER: 'game:game_over',

    // Player Action Events (used to signal intent to the engine)
    PLAYER_ACTION: 'player:action',

    // Game Logic Events (dispatched by the engine)
    CARD_PLAYED: 'card:played',
    CARD_DIED: 'card:died',
    DAMAGE_DEALT: 'combat:damage_dealt',
    
    // UI Events (dispatched from Cocos to notify the app)
    UI_BUTTON_CLICK: 'ui:button_click',
};
