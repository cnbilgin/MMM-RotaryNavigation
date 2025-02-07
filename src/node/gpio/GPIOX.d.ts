declare module "@iiot2k/gpiox" {
  export const GPIO_MODE_INPUT_NOPULL: 0;
  export const GPIO_MODE_INPUT_PULLDOWN: 1;
  export const GPIO_MODE_INPUT_PULLUP: 2;
  export const GPIO_MODE_OUTPUT: 3;
  export const GPIO_MODE_OUTPUT_SOURCE: 4;
  export const GPIO_MODE_OUTPUT_SINK: 5;
  export const GPIO_MODE_PWM: 6;
  export const GPIO_MODE_PWM_REALTIME: 7;
  export const GPIO_MODE_COUNTER_NOPULL: 8;
  export const GPIO_MODE_COUNTER_PULLDOWN: 9;
  export const GPIO_MODE_COUNTER_PULLUP: 10;
  export const GPIO_MODE_SENSOR: 11;

  export declare const GPIO_EDGE_RISING: 0;
  export declare const GPIO_EDGE_FALLING: 1;
  export declare const GPIO_EDGE_BOTH: 2;

  type WatchGpioCallback = (state: number, edge: GpioEdge, pin: number) => void;

  export declare function watch_gpio(
    pin: number,
    mode: GpioMode,
    debounce: number,
    edge: GpioEdge,
    callback: WatchGpioCallback
  ): number | undefined;

  export declare function init_gpio(
    pin: number,
    mode: GpioMode,
    debounce: number
  ): boolean;
  export declare function deinit_gpio(pin: number): boolean | undefined;

  export declare function get_gpio(pin: number): boolean | undefined;
}
