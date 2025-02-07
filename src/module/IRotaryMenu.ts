export type RotaryNotification =
  | "ROTARY_PREV"
  | "ROTARY_NEXT"
  | "ROTARY_PRESS"
  | "ROTARY_SHORT_PRESS"
  | "ROTARY_LONG_PRESS";
export interface IRotaryMenu {
  show(): void;
  hide(): void;

  rotaryNotificationReceived(notification: RotaryNotification): void;
}
