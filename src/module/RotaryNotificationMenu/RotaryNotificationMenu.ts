import { SetActiveMenu } from "./../Module";
import { RotaryNotification } from "../IRotaryMenu";
import { RotaryMenu } from "../RotaryMenu";

type NotificationEvent = "next" | "prev" | "shortPress" | "longPress" | "press";
type NotificationEventOption = {
  notification?: string;
  close?: boolean;
};
type NotificationMenuOptions = {
  events: Record<NotificationEvent, NotificationEventOption>;
  targetModuleId?: string;
};

export type ShowHideEvent = {
  targetModuleId: string;
};

export type RotaryNotificationPayload = {
  identifier: string;
};

export type RotarySendNotification = (
  notification: string,
  payload?: RotaryNotificationPayload
) => void;

export type RotaryNotificationOptions = {
  setActiveMenu: SetActiveMenu;
  sendNotification: RotarySendNotification;
};

export class RotaryNotificationMenu extends RotaryMenu<NotificationMenuOptions> {
  sendNotification: RotarySendNotification;
  constructor(options: RotaryNotificationOptions) {
    super(options.setActiveMenu);

    this.sendNotification = options.sendNotification;
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
      const payload =
        this.options?.targetModuleId !== undefined
          ? {
              identifier: this.options.targetModuleId
            }
          : undefined;
      this.sendNotification(event.notification, payload);

      this.setInfo(eventName);
    }

    if (event.close) this.hide();
  }

  onHide(callback: (event: ShowHideEvent) => void): void {
    this.appendEvent("hide", callback);
  }

  onShow(callback: (event: ShowHideEvent) => void): void {
    this.appendEvent("show", callback);
  }

  rotaryNotificationReceived(notification: RotaryNotification): void {
    super.rotaryNotificationReceived(notification);
    switch (notification) {
      case "ROTARY_LEFT":
        this.handleNotification("prev");
        break;
      case "ROTARY_RIGHT":
        this.handleNotification("next");
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
