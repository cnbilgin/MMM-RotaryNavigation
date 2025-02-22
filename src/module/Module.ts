import { debugKeyboadEvents } from "./Debug";
import { IRotaryMenu } from "./IRotaryMenu";
import { RotaryNavigationMenu } from "./RotaryNavigationMenu/RotaryNavigationMenu";
import {
  RotaryNotificationMenu,
  ShowHideEvent
} from "./RotaryNotificationMenu/RotaryNotificationMenu";
import { RotaryRangeMenu } from "./RotaryRangeMenu/RotaryRangeMenu";

export type Action = {
  icon: string;
  title: string;
  menu?: { type: MenuType };
};

type ModuleConfigs = {
  actions: Action[];
  keyboard: boolean;
};

export type MenuType = "notification" | "navigation" | "range";
export type SetActiveMenu = (menu: MenuType | null, options?: any) => void;

Module.register<ModuleConfigs>("MMM-RotaryNavigation", {
  notificationListenBlock: false,
  menus: {
    navigation: null,
    notification: null,
    range: null
  },
  options: [] as string[],
  defaults: {
    actions: [],
    keyboard: false
  },
  activeMenu: null as null | IRotaryMenu,
  init() {},
  start() {
    this.initMenus();

    this.sendSocketNotification("ROTARY_INIT", null);

    if(this.config.keyboard)
      debugKeyboadEvents(this);
    // this.setMenu("range");
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

    this.notificationListenBlock = true;
    setTimeout(() => {
      this.notificationListenBlock = false;
    }, 100);

    this.render();
  },

  render() {
    const main = document.getElementById(`rn_${this.identifier}`);
    if (!main) return;

    if (this.activeMenu) main.classList.add("active");
    else main.classList.remove("active");
  },

  socketNotificationReceived(notification) {
    if (this.notificationListenBlock) return;

    if (this.activeMenu == null) {
      this.setMenu("navigation");
      return;
    }

    this.activeMenu.rotaryNotificationReceived(notification);
  },

  notificationReceived(notification, payload) {
    if (this.activeMenu != null)
      this.activeMenu.notificationReceived(notification, payload);
  },

  initMenus() {
    const closeMenu = () => this.setMenu(null);
    const setActiveMenu: SetActiveMenu = (target, showOptions) =>
      this.setMenu(target, showOptions);
    const sendNotification = (notification: string, payload?: any) =>
      this.sendNotification(notification, payload);

    this.menus.navigation = new RotaryNavigationMenu(
      {close: closeMenu, setMenu: setActiveMenu},
      this.config.actions
    );
    
    this.menus.notification = new RotaryNotificationMenu(
      {
      sendNotification,
      close: closeMenu
    }, 
  );

    this.menus.notification.onHide((e: ShowHideEvent) => {
      findModuleById(e.targetModuleId)?.hide(600);
      this.activeMenu = null;
    });

    this.menus.notification.onShow((e: ShowHideEvent) => {
      findModuleById(e.targetModuleId)?.show(600);
    });

    this.menus.range = new RotaryRangeMenu(
      {
        sendNotification,
        close: closeMenu
      }
    );
  },

  getStyles() {
    return ["font-awesome.css", "MMM-RotaryNavigation.css"];
  }
});

const findModuleById = (id: string) => {
  return MM.getModules().find((module) => module.identifier === id);
};
