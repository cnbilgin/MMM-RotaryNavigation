import { IRotaryMenu, RotaryNotification } from "./IRotaryMenu";
type RotaryCircularMenuEvent = "show" | "hide";
type RotaryCircularMenuEventCallback = (event?: any) => void;

export class RotaryCircularMenu<T = undefined> implements IRotaryMenu {
  options?: T;
  dom: HTMLDivElement;
  eventList: Partial<
    Record<RotaryCircularMenuEvent, RotaryCircularMenuEventCallback[]>
  > = {};
  constructor(protected module: any) {
    this.dom = this.createBaseDom();
  }

  show(options?: T) {
    this.options = options;

    this.dom.classList.add("show");
    this._triggerEvent("show", this.options);
  }
  hide(): void {
    this.dom.classList.remove("show");
    this._triggerEvent("hide", this.options);
  }

  onShow(callback: RotaryCircularMenuEventCallback) {
    this._appendEvent("show", callback);
  }
  onHide(callback: RotaryCircularMenuEventCallback) {
    this._appendEvent("hide", callback);
  }
  rotaryNotificationReceived(notification: RotaryNotification): void {}

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

  _appendEvent(
    eventType: RotaryCircularMenuEvent,
    callback: RotaryCircularMenuEventCallback
  ) {
    this.eventList[eventType] = this.eventList[eventType] || [];

    this.eventList[eventType].push(callback);
  }

  _triggerEvent(eventType: RotaryCircularMenuEvent, event?: T) {
    if (!this.eventList[eventType] || this.eventList[eventType].length === 0)
      return;

    this.eventList[eventType].forEach((eventCallback) => {
      eventCallback(event);
    });
  }
}
