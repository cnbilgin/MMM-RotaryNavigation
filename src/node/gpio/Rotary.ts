import {
  deinit_gpio,
  get_gpio,
  GPIO_EDGE_BOTH,
  GPIO_MODE_INPUT_PULLUP,
  init_gpio,
  watch_gpio
} from "@iiot2k/gpiox";
import { Button, ButtonEventCallback } from "./Button.js";

export type RotaryPins = {
  SW: number;
  CLK: number;
  DT: number;
};

export type RotaryEvent =
  | "press"
  | "longPress"
  | "shortPress"
  | "turn"
  | "turnLeft"
  | "turnRight";
export type RotaryEventCallback = ButtonEventCallback | ((e: any) => void);

export class Rotary {
  pins;
  button;
  eventList: Partial<Record<RotaryEvent, RotaryEventCallback[]>> = {};
  constructor({ SW, CLK, DT }: RotaryPins) {
    this.pins = {
      SW,
      CLK,
      DT
    };

    init_gpio(DT, 0 as any, 100);
    this.button = new Button(SW);
    this._registerListener();
  }

  cleanup() {
    deinit_gpio(this.pins.CLK);
    deinit_gpio(this.pins.DT);
    this.button.cleanup();
  }

  _appendEvent(eventType: RotaryEvent, callback: RotaryEventCallback) {
    this.eventList[eventType] = this.eventList[eventType] || [];

    this.eventList[eventType].push(callback);
  }
  _triggerEvent(eventType: RotaryEvent, event?: any) {
    if (!this.eventList[eventType] || this.eventList[eventType].length === 0)
      return;

    this.eventList[eventType].forEach((eventCallback) => {
      eventCallback(event);
    });
  }

  _registerListener() {
    watch_gpio(
      this.pins.CLK,
      GPIO_MODE_INPUT_PULLUP,
      400,
      GPIO_EDGE_BOTH,
      (state: number) => {
        if (state === 1) {
          const dtValue = get_gpio(this.pins.DT);
          const direction = dtValue ? "left" : "right";
          this._triggerEvent("turn", { direction });
          this._triggerEvent(direction === "left" ? "turnLeft" : "turnRight");
        }
      }
    );

    this.button.onPress(() => {
      this._triggerEvent("press");
    });

    this.button.onShortPress(() => {
      this._triggerEvent("shortPress");
    });

    this.button.onLongPress(() => {
      this._triggerEvent("longPress");
    });
  }

  onTurn(callback: RotaryEventCallback) {
    this._appendEvent("turn", callback);
  }

  onTurnLeft(callback: RotaryEventCallback) {
    this._appendEvent("turnLeft", callback);
  }
  onTurnRight(callback: RotaryEventCallback) {
    this._appendEvent("turnRight", callback);
  }
  onPress(callback: RotaryEventCallback) {
    this._appendEvent("press", callback);
  }
  onShortPress(callback: RotaryEventCallback) {
    this._appendEvent("shortPress", callback);
  }
  onLongPress(callback: RotaryEventCallback) {
    this._appendEvent("longPress", callback);
  }
}
