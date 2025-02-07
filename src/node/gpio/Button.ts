import {
  deinit_gpio,
  GPIO_EDGE_BOTH,
  GPIO_MODE_INPUT_PULLUP,
  watch_gpio
} from "@iiot2k/gpiox";

export type ButtonEvent = "press" | "shortPress" | "longPress";
export type ButtonEventCallback = () => void;

export class Button {
  PIN: number;
  eventList: Partial<Record<ButtonEvent, ButtonEventCallback[]>> = {};
  state = {
    active: false,
    lastChange: 0
  };
  constructor(pin: number) {
    this.PIN = pin;

    this._registerListener();
  }

  cleanup() {
    deinit_gpio(this.PIN);
  }

  _appendEvent(eventType: ButtonEvent, callback: ButtonEventCallback) {
    this.eventList[eventType] = this.eventList[eventType] || [];

    this.eventList[eventType].push(callback);
  }
  _triggerEvent(eventType: ButtonEvent) {
    if (!this.eventList[eventType] || this.eventList[eventType].length === 0)
      return;

    this.eventList[eventType].forEach((eventCallback) => {
      eventCallback();
    });
  }

  _registerListener() {
    watch_gpio(
      this.PIN,
      GPIO_MODE_INPUT_PULLUP,
      0,
      GPIO_EDGE_BOTH,
      (btnState: number) => {
        const now = Date.now();
        if (!btnState) {
          this._triggerEvent("press");

          if (now - this.state.lastChange > 600)
            this._triggerEvent("longPress");
          else this._triggerEvent("shortPress");
        }

        this.state = {
          active: Boolean(btnState),
          lastChange: now
        };
      }
    );
  }

  onPress(callback: ButtonEventCallback) {
    this._appendEvent("press", callback);
  }

  onShortPress(callback: ButtonEventCallback) {
    this._appendEvent("shortPress", callback);
  }

  onLongPress(callback: ButtonEventCallback) {
    this._appendEvent("longPress", callback);
  }
}
