import { IRotaryMenu, RotaryNotification } from "./IRotaryMenu";
import { SetActiveMenu } from "./Module";
type RotaryMenuEvent = "show" | "hide";
type RotaryMenuEventCallback = (event?: any) => void;

const AUTO_HIDE_SECONDS = 5 * 1000;
export class RotaryMenu<T = undefined> implements IRotaryMenu {
  options?: T;
  dom: HTMLDivElement;
  eventList: Partial<Record<RotaryMenuEvent, RotaryMenuEventCallback[]>> = {};
  constructor(protected setActiveMenu: SetActiveMenu) {
    this.dom = this.createBaseDom();
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

  show(options?: T) {
    this.options = options;
    this.autoHideTimeout();

    this.dom.classList.add("show");
    this.triggerEvent("show", this.options);
  }
  hide(): void {
    this.dom.classList.remove("show");
    clearInterval(this.autoHideTimeoutId);

    this.triggerEvent("hide", this.options);
  }
  rotaryNotificationReceived(notification: RotaryNotification): void {
    this.autoHideTimeout();
  }

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
      this.setActiveMenu(null);
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
