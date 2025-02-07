import { Action } from "../Module";
import { RotaryNotification } from "../IRotaryMenu";
import { RotaryCircularMenu } from "../RotaryCircularMenu";

type RotaryOption = {
  icon: string;
  actionIndex: number;
  title: string;
};

const AUTO_HIDE_SECONDS = 1000 * 10;
export class RotaryNavigationMenu extends RotaryCircularMenu {
  activeIndex: number;
  actions: Action[];
  block = false;
  autoHideTimeoutId: any = null;

  constructor(
    protected module: any,
    actions: any[]
  ) {
    super(module);

    this.actions = actions;
    this.activeIndex = 0;

    this.dom = this.createDom();
  }

  createDom() {
    const dom = this.dom;
    dom.classList.add("rn-navigation");
    dom.append(this.getOptionsContainer());

    const active = document.createElement("div");
    active.className = "rn-nav-active";
    dom.append(active);

    const title = dom.querySelector(".rn-menu-title");
    if (title) title.innerHTML = this.getActiveAction().title;

    return dom;
  }

  getActiveAction() {
    return this.actions[this.activeIndex];
  }

  show() {
    super.show();
    this.autoHideTimeout();
  }

  hide() {
    super.hide();
    clearTimeout(this.autoHideTimeoutId);
  }

  getOptionsContainer(targetIndex?: number) {
    const container = document.createElement("div");
    container.className = "rn-options-container";

    const options = createEndlessOptions(
      targetIndex != undefined ? targetIndex : this.activeIndex,
      this.actions
    );

    options.forEach((option, index) => {
      container.append(createOptionElement(option, index));
    });

    return container;
  }

  move(direction: "next" | "prev") {
    if (this.block) return;

    this.block = true;

    const container = this.dom.querySelector(".rn-options-container");
    if (!container) return;

    let nextIndex = this.activeIndex + (direction === "next" ? 1 : -1);
    if (nextIndex === this.actions.length) nextIndex = 0;
    else if (nextIndex < 0) nextIndex = this.actions.length - 1;

    const newContainer = this.getOptionsContainer(nextIndex);
    this.activeIndex = nextIndex;

    const navTitle = this.dom.querySelector(".rn-menu-title");
    navTitle!.innerHTML = this.getActiveAction().title;

    const disableBlock = () => (this.block = false);

    (container as HTMLElement).addEventListener(
      "transitionend",
      () => {
        container.parentElement?.append(newContainer);
        container.remove();
        disableBlock();
      },
      {
        once: true
      }
    );

    const degree = ROTATION_DEGREE * (direction === "next" ? -1 : 1);
    (container as HTMLElement).style.transform = `rotate(${degree}deg)`;
  }

  rotaryNotificationReceived(notification: RotaryNotification): void {
    this.autoHideTimeout();
    switch (notification) {
      case "ROTARY_PREV":
        this.move("prev");
        break;

      case "ROTARY_NEXT":
        this.move("next");
        break;

      case "ROTARY_PRESS":
        clearTimeout(this.autoHideTimeoutId);
        this.openMenu();
        break;

      default:
        return;
    }
  }

  autoHideTimeout() {
    clearTimeout(this.autoHideTimeoutId);

    this.autoHideTimeoutId = setTimeout(() => {
      this.module.setMenu(null);
    }, AUTO_HIDE_SECONDS);
  }

  openMenu() {
    const menu = this.getActiveAction().menu;
    if (menu) this.module.setMenu(menu.type, menu);
  }
}

const createRotaryOption = (index: number, action: Action) => {
  return {
    icon: action.icon,
    actionIndex: index,
    title: action.title
  };
};

const VISIBLE_OPTION_LENGTH = 5;
const ROTATION_DEGREE = 37;
const getRotateValueForIndex = (i: number) => {
  const centerIndex = Math.floor(7 / 2);

  return ROTATION_DEGREE * -1 * (centerIndex - i);
};

const createOptionElement = (rotaryOption: RotaryOption, index: number) => {
  const optionElement = document.createElement("div");
  optionElement.className = "rn-option";

  const icon = document.createElement("i");
  icon.className = `rn-icon fa-solid fa-${rotaryOption.icon}`;

  optionElement.append(icon);

  const degree = getRotateValueForIndex(index);
  optionElement.style.setProperty("--degree", `${degree}deg`);

  return optionElement;
};

const createEndlessOptions = (activeIndex: number, actions: Action[]) => {
  const firstFour = [],
    lastThree = [];
  let i = activeIndex % actions.length;
  while (firstFour.length < 4 || lastThree.length < 3) {
    if (firstFour.length < 4) firstFour.push(createRotaryOption(i, actions[i]));
    if (lastThree.length < 3) {
      // const lastIndex = actions.length - 1 - i;
      const lastIndex =
        (activeIndex - (i - activeIndex + 1) + actions.length) % actions.length;
      lastThree.push(createRotaryOption(lastIndex, actions[lastIndex]));
    }

    i = (i + 1) % actions.length;
  }

  return [...lastThree.reverse(), ...firstFour];
};
// function getRotateMultiplierForIndex(i: number) {
//   const optionLength = 5;
//   const rotation = (180 / (optionLength - 1)) * (i - 1) - 90;

//   const viewPortFix =
//     (40 / optionLength) * (Math.floor(optionLength / 2) - (i - 1));

//   return rotation + viewPortFix;
// }
