import { debugKeyboadEvents } from "./Debug";
import { IRotaryMenu } from "./IRotaryMenu";
import { RotaryNavigationMenu } from "./RotaryNavigationMenu/RotaryNavigationMenu";
import {
  RotaryNotificationMenu,
  ShowHideEvent
} from "./RotaryNotificationMenu/RotaryNotificationMenu";

export type Action = {
  icon: string;
  title: string;
  menu?: { type: "notification" | "navigation" };
};

type ModuleConfigs = {
  actions: Action[];
};

Module.register<ModuleConfigs>("MMM-RotaryNavigation", {
  menus: {
    navigation: null,
    notification: null
  },
  options: [] as string[],
  defaults: {
    actions: []
  },
  selectedIndex: null as null | number,
  activeMenu: null as null | IRotaryMenu,
  init() {},
  start() {
    this.sendSocketNotification("ROTARY_INIT", null);
    this.menus.navigation = new RotaryNavigationMenu(this, this.config.actions);
    this.menus.notification = new RotaryNotificationMenu(this);

    this.menus.notification.onHide((e: ShowHideEvent) => {
      findModuleById(e.target)?.hide(600);
      this.activeMenu = null;
    });

    this.menus.notification.onShow((e: ShowHideEvent) => {
      findModuleById(e.target)?.show(600);
    });

    debugKeyboadEvents(this);
  },
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "rn-main";
    wrapper.id = `rn_${this.identifier}`;

    const toggle = document.createElement("div");
    toggle.className = "rn-toggle";
    const toggleIcon = document.createElement("i");
    toggleIcon.className = "fa-solid fa-bars";
    toggle.append(toggleIcon);

    wrapper.append(toggle);

    Object.keys(this.menus).forEach((menuKey) => {
      wrapper.append(this.menus[menuKey].getDom());
    });

    return wrapper;
  },

  setMenu(target: string | null, showOptions?: any) {
    if (this.activeMenu != null) (this.activeMenu as IRotaryMenu).hide();

    if (target != null && target in this.menus) {
      const menu = this.menus[target];

      menu.show(showOptions);
      this.activeMenu = menu;
    } else {
      this.activeMenu = null;
    }

    this.render();
  },

  render() {
    const main = document.getElementById(`rn_${this.identifier}`);
    if (!main) return;

    if (this.activeMenu) main.classList.add("active");
    else main.classList.remove("active");
  },

  socketNotificationReceived(notification) {
    if (this.activeMenu == null) {
      this.setMenu("navigation");
      return;
    }

    this.activeMenu.rotaryNotificationReceived(notification);
  },

  getStyles() {
    return ["font-awesome.css", "MMM-RotaryNavigation.css"];
  }
});

const findModuleById = (id: string) => {
  return MM.getModules().find((module) => module.identifier === id);
};
