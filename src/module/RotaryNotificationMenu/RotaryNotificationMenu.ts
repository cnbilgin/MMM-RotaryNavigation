import { RotaryNotification } from "../IRotaryMenu";
import { RotaryCircularMenu } from "../RotaryCircularMenu";

type NotificationEvent = "next" | "prev" | "shortPress" | "longPress" | "press";
type NotificationEventOption = {
  notification?: string;
  close?: boolean;
};
type NotificationMenuOptions = {
  events: Record<NotificationEvent, NotificationEventOption>;
  target: string;
};

export type ShowHideEvent = {
  target: string;
};

export class RotaryNotificationMenu extends RotaryCircularMenu<NotificationMenuOptions> {
  constructor(protected module: any) {
    super(module);

    this.dom = this.createDom();
  }

  createDom() {
    const dom = this.dom;
    dom.classList.add("rn-notification-menu");

    return dom;
  }

  handleNotification(eventName: NotificationEvent) {
    if (!this.options || !(eventName in this.options.events)) return;

    const event = this.options.events[eventName];
    if (event.notification) {
      this.module.sendNotification(event.notification, {
        target: this.options.target
      });

      this.setInfo(eventName);
    }

    if (event.close) this.hide();
  }

  onHide(callback: (event: ShowHideEvent) => void): void {
    this._appendEvent("hide", callback);
  }

  onShow(callback: (event: ShowHideEvent) => void): void {
    this._appendEvent("show", callback);
  }

  rotaryNotificationReceived(notification: RotaryNotification): void {
    switch (notification) {
      case "ROTARY_PREV":
        this.handleNotification("next");
        break;

      case "ROTARY_NEXT":
        this.handleNotification("prev");
        break;

      case "ROTARY_PRESS":
        this.handleNotification("press");
        break;

      case "ROTARY_LONG_PRESS":
        this.handleNotification("longPress");
        break;

      case "ROTARY_SHORT_PRESS":
        this.handleNotification("shortPress");
        break;

      default:
        return;
    }
  }

  infoTimeoutId: number | undefined = undefined;
  setInfo(text: string) {
    const title = this.dom.querySelector(".rn-menu-title");
    if (!title) return;

    const cleanup = () => {
      title.innerHTML = "";
      title.classList.remove("rn-notify-slowHide");
    };

    cleanup();
    clearTimeout(this.infoTimeoutId);

    //re-trigger animation
    title.scrollBy(0, 0);
    title.classList.add("rn-notify-slowHide");
    title.innerHTML = text;

    this.infoTimeoutId = setTimeout(() => {
      cleanup();
    }, 1500);
  }
}
