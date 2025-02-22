import { RotaryNotification } from "../IRotaryMenu";
import { SetActiveMenu } from "../Module";
import { RotaryMenu } from "../RotaryMenu";

type RangeMenuOptions = {
  min: number;
  max: number;
  step: number;
};
type RangeMenuConfig = {
  options: RangeMenuOptions;
};

export type RotaryRangeOptions = {
  setActiveMenu: SetActiveMenu;
};

export class RotaryRangeMenu extends RotaryMenu<RangeMenuConfig> {
  constructor(options: RotaryRangeOptions) {
    super(options.setActiveMenu);
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

  value: number = 0;
  changeValue(value: number) {
    if (!this.options) return;

    const { min, max } = this.options.options;

    const newValue = Math.max(Math.min(this.value + value, max), min);

    this.value = newValue;
    this.render();
  }

  render() {
    const valueDom = this.dom.querySelector(".progress-value");
    const textDom = this.dom.querySelector(".progress-text");
    if (!this.options || !valueDom || !textDom) return;

    const { min, max } = this.options.options;

    const rate = (this.value - min) / (max - min);
    const rotation = rate * 180 - 180;

    (valueDom as HTMLDivElement).style.transform = `rotate(${rotation}deg)`;
    textDom.innerHTML = this.value.toString();
  }

  rotaryNotificationReceived(notification: RotaryNotification): void {
    console.log(notification);
    super.rotaryNotificationReceived(notification);
    switch (notification) {
      case "ROTARY_LEFT":
        this.changeValue(-1 * (this.options?.options.step || 1));
        break;
      case "ROTARY_RIGHT":
        this.changeValue(this.options?.options.step || 1);
        break;

      case "ROTARY_PRESS":
        this.setActiveMenu("navigation");
        break;

      case "ROTARY_LONG_PRESS":
        break;

      case "ROTARY_SHORT_PRESS":
        break;

      default:
        return;
    }
  }
}
