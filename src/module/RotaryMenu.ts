import { IRotaryMenu, RotaryNotification } from "./IRotaryMenu";
type RotaryMenuEvent = "show" | "hide";
type RotaryMenuEventCallback = (event?: any) => void;

const AUTO_HIDE_SECONDS = 5 * 1000;

export type RotaryMenuClose = () => void;
export type RotaryMenuOperations = {
  close: () => {};
};
export class RotaryMenu<
  T extends {},
  P extends RotaryMenuOperations = RotaryMenuOperations
> implements IRotaryMenu
{
  operations: P;
  config?: T;
  dom: HTMLDivElement;
  eventList: Partial<Record<RotaryMenuEvent, RotaryMenuEventCallback[]>> = {};
  constructor(operations: P) {
    this.dom = this.createBaseDom();
    this.operations = operations;
  }

  createBaseDom() {
    const dom = document.createElement("div");
    dom.className = "rn-menu";

    const title = document.createElement("div");
    title.className = "rn-menu-title";

    dom.append(title);

    return dom;
  }
  getDom() {
    return this.dom;
  }

  show(config?: T) {
    this.config = config;
    this.autoHideTimeout();

    this.dom.classList.add("show");
    this.triggerEvent("show", this.config);
  }
  hide(): void {
    this.dom.classList.remove("show");
    clearInterval(this.autoHideTimeoutId);

    this.triggerEvent("hide", this.config);
  }
  rotaryNotificationReceived(notification: RotaryNotification): void {
    this.autoHideTimeout();
  }

  notificationReceived(notification: string, payload: any): void {}

  onShow(callback: RotaryMenuEventCallback) {
    this.appendEvent("show", callback);
  }
  onHide(callback: RotaryMenuEventCallback) {
    this.appendEvent("hide", callback);
  }

  protected autoHideTimeoutId: number | undefined = undefined;
  protected autoHideTimeout() {
    clearTimeout(this.autoHideTimeoutId);

    this.autoHideTimeoutId = setTimeout(() => {
      this.operations.close();
    }, AUTO_HIDE_SECONDS);
  }

  protected appendEvent(
    eventType: RotaryMenuEvent,
    callback: RotaryMenuEventCallback
  ) {
    this.eventList[eventType] = this.eventList[eventType] || [];

    this.eventList[eventType].push(callback);
  }

  protected triggerEvent(eventType: RotaryMenuEvent, event?: T) {
    if (!this.eventList[eventType] || this.eventList[eventType].length === 0)
      return;

    this.eventList[eventType].forEach((eventCallback) => {
      eventCallback(event);
    });
  }
}
