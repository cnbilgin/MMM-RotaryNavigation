export type RotaryNotification =
  | "ROTARY_LEFT"
  | "ROTARY_RIGHT"
  | "ROTARY_PRESS"
  | "ROTARY_SHORT_PRESS"
  | "ROTARY_LONG_PRESS";

export interface IRotaryMenu {
  show(): void;
  hide(): void;

  rotaryNotificationReceived(notification: RotaryNotification): void;
  notificationReceived?(notification: string, payload: any): void
}
