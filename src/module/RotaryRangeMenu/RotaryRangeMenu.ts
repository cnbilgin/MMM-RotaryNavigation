import { RotaryNotification } from "../IRotaryMenu";
import { RotaryMenu, RotaryMenuOperations } from "../RotaryMenu";

type RangeMenuOptions = {
  min: number;
  max: number;
  step: number;
};
type RangeMenuNotifications = {
  requestValue: string,
  value: string,
  set: string
}
type RangeMenuConfig = {
  options: RangeMenuOptions;
  notifications: RangeMenuNotifications
};

type RangeMenuOperations = RotaryMenuOperations & {
  sendNotification: (notification: string, payload?: any) => void;
}

export class RotaryRangeMenu extends RotaryMenu<RangeMenuConfig, RangeMenuOperations> {
  constructor(operations: RangeMenuOperations) {
    super(operations);
    this.dom = this.createDom();
  }

  createDom() {
    const dom = this.dom;
    dom.classList.add("rn-range-menu");

    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-container";

    const progressValue = document.createElement("div");
    progressValue.className = "progress-value";
    progressContainer.append(progressValue);

    const progressText = document.createElement("div");
    progressText.className = "progress-text";
    progressContainer.append(progressText);

    dom.append(progressContainer);
    return dom;
  }

  value: number | null = null;
  changeValue(value: number) {
    if (!this.config) return;

    const { min, max } = this.config.options;

    const newValue = Math.max(Math.min((this.value || 0 ) + value, max), min);

    this.value = newValue;
    this.render();
  }

  render() {
    const valueDom = this.dom.querySelector(".progress-value");
    const textDom = this.dom.querySelector(".progress-text");
    if (!this.config || !valueDom || !textDom) return;

    const { min, max } = this.config.options;

    let rotation = -180;
    if(this.value != null) {
      const rate = (this.value - min) / (max - min);
      rotation = rate * 180 - 180;
    }
  

    (valueDom as HTMLDivElement).style.transform = `rotate(${rotation}deg)`;
    textDom.innerHTML = this.value?.toString() || "";
  }

  rotaryNotificationReceived(notification: RotaryNotification): void {
    super.rotaryNotificationReceived(notification);
    switch (notification) {
      case "ROTARY_LEFT":
        this.changeValue(-1 * (this.config?.options.step || 1));
        break;
      case "ROTARY_RIGHT":
        this.changeValue(this.config?.options.step || 1);
        break;

      case "ROTARY_PRESS":
        this.sendValue();
        this.operations.close();
        break;

      case "ROTARY_LONG_PRESS":
        break;

      case "ROTARY_SHORT_PRESS":
        break;

      default:
        return;
    }
  }

  notificationReceived(notification: string, payload: any): void {
    const valueNotification = this.config!.notifications.value;
    if(valueNotification && valueNotification === notification) {
      this.changeValue(payload);
    }
  }

  private collectValue() {
    const requestValue = this.config?.notifications?.requestValue;
    if(requestValue)
      this.operations.sendNotification(requestValue);

  }
  private sendValue() {
    this.operations.sendNotification(this.config!.notifications.set, this.value)
  }

  show(config?: RangeMenuConfig): void {
    super.show(config);

    this.collectValue();
  }

  hide(): void {
    super.hide();

    setTimeout(() => {
      this.value = null;
      this.render();
    }, 300)
  }
}
