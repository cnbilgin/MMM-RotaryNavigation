(function () {
    'use strict';

    const debugKeyboadEvents = (module) => {
        let lastEnterTimeStamp = null;
        document.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && lastEnterTimeStamp === null)
                lastEnterTimeStamp = e.timeStamp;
        });
        document.addEventListener("keyup", (e) => {
            switch (e.key) {
                case "ArrowLeft":
                    module.socketNotificationReceived("ROTARY_LEFT", null);
                    break;
                case "ArrowRight":
                    module.socketNotificationReceived("ROTARY_RIGHT", null);
                    break;
                case "Enter":
                    module.socketNotificationReceived("ROTARY_PRESS", null);
                    if (lastEnterTimeStamp && e.timeStamp - lastEnterTimeStamp > 350)
                        module.socketNotificationReceived("ROTARY_LONG_PRESS", null);
                    else
                        module.socketNotificationReceived("ROTARY_SHORT_PRESS", null);
                    lastEnterTimeStamp = null;
                    break;
            }
        });
    };

    const AUTO_HIDE_SECONDS = 5 * 1000;
    class RotaryMenu {
        constructor(setActiveMenu) {
            this.setActiveMenu = setActiveMenu;
            this.eventList = {};
            this.autoHideTimeoutId = undefined;
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
        show(options) {
            this.options = options;
            this.autoHideTimeout();
            this.dom.classList.add("show");
            this.triggerEvent("show", this.options);
        }
        hide() {
            this.dom.classList.remove("show");
            clearInterval(this.autoHideTimeoutId);
            this.triggerEvent("hide", this.options);
        }
        rotaryNotificationReceived(notification) {
            this.autoHideTimeout();
        }
        onShow(callback) {
            this.appendEvent("show", callback);
        }
        onHide(callback) {
            this.appendEvent("hide", callback);
        }
        autoHideTimeout() {
            clearTimeout(this.autoHideTimeoutId);
            this.autoHideTimeoutId = setTimeout(() => {
                this.setActiveMenu(null);
            }, AUTO_HIDE_SECONDS);
        }
        appendEvent(eventType, callback) {
            this.eventList[eventType] = this.eventList[eventType] || [];
            this.eventList[eventType].push(callback);
        }
        triggerEvent(eventType, event) {
            if (!this.eventList[eventType] || this.eventList[eventType].length === 0)
                return;
            this.eventList[eventType].forEach((eventCallback) => {
                eventCallback(event);
            });
        }
    }

    class RotaryNavigationMenu extends RotaryMenu {
        constructor(options) {
            super(options.setActiveMenu);
            this.block = false;
            this.actions = options.actions;
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
            if (title)
                title.innerHTML = this.getActiveAction().title;
            return dom;
        }
        getActiveAction() {
            return this.actions[this.activeIndex];
        }
        getOptionsContainer(targetIndex) {
            const container = document.createElement("div");
            container.className = "rn-options-container";
            const options = createEndlessOptions(targetIndex != undefined ? targetIndex : this.activeIndex, this.actions);
            options.forEach((option, index) => {
                container.append(createOptionElement(option, index));
            });
            return container;
        }
        move(direction) {
            if (this.block)
                return;
            this.block = true;
            const container = this.dom.querySelector(".rn-options-container");
            if (!container)
                return;
            let nextIndex = this.activeIndex + (direction === "next" ? 1 : -1);
            if (nextIndex === this.actions.length)
                nextIndex = 0;
            else if (nextIndex < 0)
                nextIndex = this.actions.length - 1;
            const newContainer = this.getOptionsContainer(nextIndex);
            this.activeIndex = nextIndex;
            const navTitle = this.dom.querySelector(".rn-menu-title");
            navTitle.innerHTML = this.getActiveAction().title;
            const disableBlock = () => (this.block = false);
            container.addEventListener("transitionend", () => {
                container.parentElement?.append(newContainer);
                container.remove();
                disableBlock();
            }, {
                once: true
            });
            const degree = ROTATION_DEGREE * (direction === "next" ? -1 : 1);
            container.style.transform = `rotate(${degree}deg)`;
        }
        rotaryNotificationReceived(notification) {
            super.rotaryNotificationReceived(notification);
            switch (notification) {
                case "ROTARY_LEFT":
                    this.move("next");
                    break;
                case "ROTARY_RIGHT":
                    this.move("prev");
                    break;
                case "ROTARY_PRESS":
                    this.openMenu();
                    break;
                default:
                    return;
            }
        }
        openMenu() {
            const menu = this.getActiveAction().menu;
            if (menu)
                this.setActiveMenu(menu.type, menu);
        }
    }
    const createRotaryOption = (index, action) => {
        return {
            icon: action.icon,
            actionIndex: index,
            title: action.title
        };
    };
    const ROTATION_DEGREE = 37;
    const getRotateValueForIndex = (i) => {
        const centerIndex = Math.floor(7 / 2);
        return ROTATION_DEGREE * -1 * (centerIndex - i);
    };
    const createOptionElement = (rotaryOption, index) => {
        const optionElement = document.createElement("div");
        optionElement.className = "rn-option";
        const icon = document.createElement("i");
        icon.className = `rn-icon fa-solid fa-${rotaryOption.icon}`;
        optionElement.append(icon);
        const degree = getRotateValueForIndex(index);
        optionElement.style.setProperty("--degree", `${degree}deg`);
        return optionElement;
    };
    const createEndlessOptions = (activeIndex, actions) => {
        const firstFour = [], lastThree = [];
        let i = activeIndex % actions.length;
        while (firstFour.length < 4 || lastThree.length < 3) {
            if (firstFour.length < 4)
                firstFour.push(createRotaryOption(i, actions[i]));
            if (lastThree.length < 3) {
                // const lastIndex = actions.length - 1 - i;
                const lastIndex = (activeIndex - (i - activeIndex + 1) + actions.length) % actions.length;
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

    class RotaryNotificationMenu extends RotaryMenu {
        constructor(options) {
            super(options.setActiveMenu);
            this.infoTimeoutId = undefined;
            this.sendNotification = options.sendNotification;
            this.dom = this.createDom();
        }
        createDom() {
            const dom = this.dom;
            dom.classList.add("rn-notification-menu");
            return dom;
        }
        handleNotification(eventName) {
            if (!this.options || !(eventName in this.options.events))
                return;
            const event = this.options.events[eventName];
            if (event.notification) {
                const payload = this.options?.targetModuleId !== undefined
                    ? {
                        identifier: this.options.targetModuleId
                    }
                    : undefined;
                this.sendNotification(event.notification, payload);
                this.setInfo(eventName);
            }
            if (event.close)
                this.hide();
        }
        onHide(callback) {
            this.appendEvent("hide", callback);
        }
        onShow(callback) {
            this.appendEvent("show", callback);
        }
        rotaryNotificationReceived(notification) {
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
        setInfo(text) {
            const title = this.dom.querySelector(".rn-menu-title");
            if (!title)
                return;
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

    Module.register("MMM-RotaryNavigation", {
        notificationListenBlock: false,
        menus: {
            navigation: null,
            notification: null
        },
        options: [],
        defaults: {
            actions: []
        },
        activeMenu: null,
        init() { },
        start() {
            this.initMenus();
            this.sendSocketNotification("ROTARY_INIT", null);
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
        setMenu(target, showOptions) {
            if (this.activeMenu != null)
                this.activeMenu.hide();
            if (target != null && target in this.menus) {
                const menu = this.menus[target];
                menu.show(showOptions);
                this.activeMenu = menu;
            }
            else {
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
            if (!main)
                return;
            if (this.activeMenu)
                main.classList.add("active");
            else
                main.classList.remove("active");
        },
        socketNotificationReceived(notification) {
            if (this.notificationListenBlock)
                return;
            if (this.activeMenu == null) {
                this.setMenu("navigation");
                return;
            }
            this.activeMenu.rotaryNotificationReceived(notification);
        },
        initMenus() {
            const setActiveMenu = (target, showOptions) => this.setMenu(target, showOptions);
            this.menus.navigation = new RotaryNavigationMenu({
                setActiveMenu,
                actions: this.config.actions
            });
            const sendNotification = (notification, payload) => this.sendNotification(notification, payload);
            this.menus.notification = new RotaryNotificationMenu({
                setActiveMenu,
                sendNotification
            });
            this.menus.notification.onHide((e) => {
                findModuleById(e.targetModuleId)?.hide(600);
                this.activeMenu = null;
            });
            this.menus.notification.onShow((e) => {
                findModuleById(e.targetModuleId)?.show(600);
            });
        },
        getStyles() {
            return ["font-awesome.css", "MMM-RotaryNavigation.css"];
        }
    });
    const findModuleById = (id) => {
        return MM.getModules().find((module) => module.identifier === id);
    };

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTU1NLVJvdGFyeU5hdmlnYXRpb24uanMiLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUvRGVidWcudHMiLCJzcmMvbW9kdWxlL1JvdGFyeU1lbnUudHMiLCJzcmMvbW9kdWxlL1JvdGFyeU5hdmlnYXRpb25NZW51L1JvdGFyeU5hdmlnYXRpb25NZW51LnRzIiwic3JjL21vZHVsZS9Sb3RhcnlOb3RpZmljYXRpb25NZW51L1JvdGFyeU5vdGlmaWNhdGlvbk1lbnUudHMiLCJzcmMvbW9kdWxlL01vZHVsZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZGVidWdLZXlib2FkRXZlbnRzID0gKG1vZHVsZTogTW9kdWxlLk1vZHVsZVByb3BlcnRpZXM8YW55PikgPT4ge1xuICBsZXQgbGFzdEVudGVyVGltZVN0YW1wOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICBpZiAoZS5rZXkgPT09IFwiRW50ZXJcIiAmJiBsYXN0RW50ZXJUaW1lU3RhbXAgPT09IG51bGwpXG4gICAgICBsYXN0RW50ZXJUaW1lU3RhbXAgPSBlLnRpbWVTdGFtcDtcbiAgfSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgIGNhc2UgXCJBcnJvd0xlZnRcIjpcbiAgICAgICAgbW9kdWxlLnNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKFwiUk9UQVJZX0xFRlRcIiwgbnVsbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIkFycm93UmlnaHRcIjpcbiAgICAgICAgbW9kdWxlLnNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKFwiUk9UQVJZX1JJR0hUXCIsIG51bGwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJFbnRlclwiOlxuICAgICAgICBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfUFJFU1NcIiwgbnVsbCk7XG5cbiAgICAgICAgaWYgKGxhc3RFbnRlclRpbWVTdGFtcCAmJiBlLnRpbWVTdGFtcCAtIGxhc3RFbnRlclRpbWVTdGFtcCA+IDM1MClcbiAgICAgICAgICBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfTE9OR19QUkVTU1wiLCBudWxsKTtcbiAgICAgICAgZWxzZSBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfU0hPUlRfUFJFU1NcIiwgbnVsbCk7XG5cbiAgICAgICAgbGFzdEVudGVyVGltZVN0YW1wID0gbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9KTtcbn07XG4iLCJpbXBvcnQgeyBJUm90YXJ5TWVudSwgUm90YXJ5Tm90aWZpY2F0aW9uIH0gZnJvbSBcIi4vSVJvdGFyeU1lbnVcIjtcbmltcG9ydCB7IFNldEFjdGl2ZU1lbnUgfSBmcm9tIFwiLi9Nb2R1bGVcIjtcbnR5cGUgUm90YXJ5TWVudUV2ZW50ID0gXCJzaG93XCIgfCBcImhpZGVcIjtcbnR5cGUgUm90YXJ5TWVudUV2ZW50Q2FsbGJhY2sgPSAoZXZlbnQ/OiBhbnkpID0+IHZvaWQ7XG5cbmNvbnN0IEFVVE9fSElERV9TRUNPTkRTID0gNSAqIDEwMDA7XG5leHBvcnQgY2xhc3MgUm90YXJ5TWVudTxUID0gdW5kZWZpbmVkPiBpbXBsZW1lbnRzIElSb3RhcnlNZW51IHtcbiAgb3B0aW9ucz86IFQ7XG4gIGRvbTogSFRNTERpdkVsZW1lbnQ7XG4gIGV2ZW50TGlzdDogUGFydGlhbDxSZWNvcmQ8Um90YXJ5TWVudUV2ZW50LCBSb3RhcnlNZW51RXZlbnRDYWxsYmFja1tdPj4gPSB7fTtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHNldEFjdGl2ZU1lbnU6IFNldEFjdGl2ZU1lbnUpIHtcbiAgICB0aGlzLmRvbSA9IHRoaXMuY3JlYXRlQmFzZURvbSgpO1xuICB9XG5cbiAgY3JlYXRlQmFzZURvbSgpIHtcbiAgICBjb25zdCBkb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGRvbS5jbGFzc05hbWUgPSBcInJuLW1lbnVcIjtcblxuICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB0aXRsZS5jbGFzc05hbWUgPSBcInJuLW1lbnUtdGl0bGVcIjtcblxuICAgIGRvbS5hcHBlbmQodGl0bGUpO1xuXG4gICAgcmV0dXJuIGRvbTtcbiAgfVxuICBnZXREb20oKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9tO1xuICB9XG5cbiAgc2hvdyhvcHRpb25zPzogVCkge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hdXRvSGlkZVRpbWVvdXQoKTtcblxuICAgIHRoaXMuZG9tLmNsYXNzTGlzdC5hZGQoXCJzaG93XCIpO1xuICAgIHRoaXMudHJpZ2dlckV2ZW50KFwic2hvd1wiLCB0aGlzLm9wdGlvbnMpO1xuICB9XG4gIGhpZGUoKTogdm9pZCB7XG4gICAgdGhpcy5kb20uY2xhc3NMaXN0LnJlbW92ZShcInNob3dcIik7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmF1dG9IaWRlVGltZW91dElkKTtcblxuICAgIHRoaXMudHJpZ2dlckV2ZW50KFwiaGlkZVwiLCB0aGlzLm9wdGlvbnMpO1xuICB9XG4gIHJvdGFyeU5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbjogUm90YXJ5Tm90aWZpY2F0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5hdXRvSGlkZVRpbWVvdXQoKTtcbiAgfVxuXG4gIG9uU2hvdyhjYWxsYmFjazogUm90YXJ5TWVudUV2ZW50Q2FsbGJhY2spIHtcbiAgICB0aGlzLmFwcGVuZEV2ZW50KFwic2hvd1wiLCBjYWxsYmFjayk7XG4gIH1cbiAgb25IaWRlKGNhbGxiYWNrOiBSb3RhcnlNZW51RXZlbnRDYWxsYmFjaykge1xuICAgIHRoaXMuYXBwZW5kRXZlbnQoXCJoaWRlXCIsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhdXRvSGlkZVRpbWVvdXRJZDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgYXV0b0hpZGVUaW1lb3V0KCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLmF1dG9IaWRlVGltZW91dElkKTtcblxuICAgIHRoaXMuYXV0b0hpZGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuc2V0QWN0aXZlTWVudShudWxsKTtcbiAgICB9LCBBVVRPX0hJREVfU0VDT05EUyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXBwZW5kRXZlbnQoXG4gICAgZXZlbnRUeXBlOiBSb3RhcnlNZW51RXZlbnQsXG4gICAgY2FsbGJhY2s6IFJvdGFyeU1lbnVFdmVudENhbGxiYWNrXG4gICkge1xuICAgIHRoaXMuZXZlbnRMaXN0W2V2ZW50VHlwZV0gPSB0aGlzLmV2ZW50TGlzdFtldmVudFR5cGVdIHx8IFtdO1xuXG4gICAgdGhpcy5ldmVudExpc3RbZXZlbnRUeXBlXS5wdXNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIHByb3RlY3RlZCB0cmlnZ2VyRXZlbnQoZXZlbnRUeXBlOiBSb3RhcnlNZW51RXZlbnQsIGV2ZW50PzogVCkge1xuICAgIGlmICghdGhpcy5ldmVudExpc3RbZXZlbnRUeXBlXSB8fCB0aGlzLmV2ZW50TGlzdFtldmVudFR5cGVdLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuZXZlbnRMaXN0W2V2ZW50VHlwZV0uZm9yRWFjaCgoZXZlbnRDYWxsYmFjaykgPT4ge1xuICAgICAgZXZlbnRDYWxsYmFjayhldmVudCk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IEFjdGlvbiwgU2V0QWN0aXZlTWVudSB9IGZyb20gXCIuLi9Nb2R1bGVcIjtcbmltcG9ydCB7IFJvdGFyeU5vdGlmaWNhdGlvbiB9IGZyb20gXCIuLi9JUm90YXJ5TWVudVwiO1xuaW1wb3J0IHsgUm90YXJ5TWVudSB9IGZyb20gXCIuLi9Sb3RhcnlNZW51XCI7XG5cbmV4cG9ydCB0eXBlIFJvdGFyeU5hdmlnYXRpb25PcHRpb25zID0ge1xuICBzZXRBY3RpdmVNZW51OiBTZXRBY3RpdmVNZW51O1xuICBhY3Rpb25zOiBhbnlbXTtcbn07XG5cbmV4cG9ydCBjbGFzcyBSb3RhcnlOYXZpZ2F0aW9uTWVudSBleHRlbmRzIFJvdGFyeU1lbnUge1xuICBhY3RpdmVJbmRleDogbnVtYmVyO1xuICBhY3Rpb25zOiBBY3Rpb25bXTtcbiAgYmxvY2sgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBSb3RhcnlOYXZpZ2F0aW9uT3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMuc2V0QWN0aXZlTWVudSk7XG5cbiAgICB0aGlzLmFjdGlvbnMgPSBvcHRpb25zLmFjdGlvbnM7XG4gICAgdGhpcy5hY3RpdmVJbmRleCA9IDA7XG5cbiAgICB0aGlzLmRvbSA9IHRoaXMuY3JlYXRlRG9tKCk7XG4gIH1cblxuICBjcmVhdGVEb20oKSB7XG4gICAgY29uc3QgZG9tID0gdGhpcy5kb207XG4gICAgZG9tLmNsYXNzTGlzdC5hZGQoXCJybi1uYXZpZ2F0aW9uXCIpO1xuICAgIGRvbS5hcHBlbmQodGhpcy5nZXRPcHRpb25zQ29udGFpbmVyKCkpO1xuXG4gICAgY29uc3QgYWN0aXZlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBhY3RpdmUuY2xhc3NOYW1lID0gXCJybi1uYXYtYWN0aXZlXCI7XG4gICAgZG9tLmFwcGVuZChhY3RpdmUpO1xuXG4gICAgY29uc3QgdGl0bGUgPSBkb20ucXVlcnlTZWxlY3RvcihcIi5ybi1tZW51LXRpdGxlXCIpO1xuICAgIGlmICh0aXRsZSkgdGl0bGUuaW5uZXJIVE1MID0gdGhpcy5nZXRBY3RpdmVBY3Rpb24oKS50aXRsZTtcblxuICAgIHJldHVybiBkb207XG4gIH1cblxuICBnZXRBY3RpdmVBY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuYWN0aW9uc1t0aGlzLmFjdGl2ZUluZGV4XTtcbiAgfVxuICBnZXRPcHRpb25zQ29udGFpbmVyKHRhcmdldEluZGV4PzogbnVtYmVyKSB7XG4gICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBjb250YWluZXIuY2xhc3NOYW1lID0gXCJybi1vcHRpb25zLWNvbnRhaW5lclwiO1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IGNyZWF0ZUVuZGxlc3NPcHRpb25zKFxuICAgICAgdGFyZ2V0SW5kZXggIT0gdW5kZWZpbmVkID8gdGFyZ2V0SW5kZXggOiB0aGlzLmFjdGl2ZUluZGV4LFxuICAgICAgdGhpcy5hY3Rpb25zXG4gICAgKTtcblxuICAgIG9wdGlvbnMuZm9yRWFjaCgob3B0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgY29udGFpbmVyLmFwcGVuZChjcmVhdGVPcHRpb25FbGVtZW50KG9wdGlvbiwgaW5kZXgpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH1cblxuICBtb3ZlKGRpcmVjdGlvbjogXCJuZXh0XCIgfCBcInByZXZcIikge1xuICAgIGlmICh0aGlzLmJsb2NrKSByZXR1cm47XG5cbiAgICB0aGlzLmJsb2NrID0gdHJ1ZTtcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuZG9tLnF1ZXJ5U2VsZWN0b3IoXCIucm4tb3B0aW9ucy1jb250YWluZXJcIik7XG4gICAgaWYgKCFjb250YWluZXIpIHJldHVybjtcblxuICAgIGxldCBuZXh0SW5kZXggPSB0aGlzLmFjdGl2ZUluZGV4ICsgKGRpcmVjdGlvbiA9PT0gXCJuZXh0XCIgPyAxIDogLTEpO1xuICAgIGlmIChuZXh0SW5kZXggPT09IHRoaXMuYWN0aW9ucy5sZW5ndGgpIG5leHRJbmRleCA9IDA7XG4gICAgZWxzZSBpZiAobmV4dEluZGV4IDwgMCkgbmV4dEluZGV4ID0gdGhpcy5hY3Rpb25zLmxlbmd0aCAtIDE7XG5cbiAgICBjb25zdCBuZXdDb250YWluZXIgPSB0aGlzLmdldE9wdGlvbnNDb250YWluZXIobmV4dEluZGV4KTtcbiAgICB0aGlzLmFjdGl2ZUluZGV4ID0gbmV4dEluZGV4O1xuXG4gICAgY29uc3QgbmF2VGl0bGUgPSB0aGlzLmRvbS5xdWVyeVNlbGVjdG9yKFwiLnJuLW1lbnUtdGl0bGVcIik7XG4gICAgbmF2VGl0bGUhLmlubmVySFRNTCA9IHRoaXMuZ2V0QWN0aXZlQWN0aW9uKCkudGl0bGU7XG5cbiAgICBjb25zdCBkaXNhYmxlQmxvY2sgPSAoKSA9PiAodGhpcy5ibG9jayA9IGZhbHNlKTtcblxuICAgIChjb250YWluZXIgYXMgSFRNTEVsZW1lbnQpLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcInRyYW5zaXRpb25lbmRcIixcbiAgICAgICgpID0+IHtcbiAgICAgICAgY29udGFpbmVyLnBhcmVudEVsZW1lbnQ/LmFwcGVuZChuZXdDb250YWluZXIpO1xuICAgICAgICBjb250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgIGRpc2FibGVCbG9jaygpO1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgb25jZTogdHJ1ZVxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBkZWdyZWUgPSBST1RBVElPTl9ERUdSRUUgKiAoZGlyZWN0aW9uID09PSBcIm5leHRcIiA/IC0xIDogMSk7XG4gICAgKGNvbnRhaW5lciBhcyBIVE1MRWxlbWVudCkuc3R5bGUudHJhbnNmb3JtID0gYHJvdGF0ZSgke2RlZ3JlZX1kZWcpYDtcbiAgfVxuXG4gIHJvdGFyeU5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbjogUm90YXJ5Tm90aWZpY2F0aW9uKTogdm9pZCB7XG4gICAgc3VwZXIucm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uKTtcblxuICAgIHN3aXRjaCAobm90aWZpY2F0aW9uKSB7XG4gICAgICBjYXNlIFwiUk9UQVJZX0xFRlRcIjpcbiAgICAgICAgdGhpcy5tb3ZlKFwibmV4dFwiKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJST1RBUllfUklHSFRcIjpcbiAgICAgICAgdGhpcy5tb3ZlKFwicHJldlwiKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJST1RBUllfUFJFU1NcIjpcbiAgICAgICAgdGhpcy5vcGVuTWVudSgpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIG9wZW5NZW51KCkge1xuICAgIGNvbnN0IG1lbnUgPSB0aGlzLmdldEFjdGl2ZUFjdGlvbigpLm1lbnU7XG4gICAgaWYgKG1lbnUpIHRoaXMuc2V0QWN0aXZlTWVudShtZW51LnR5cGUsIG1lbnUpO1xuICB9XG59XG5cbnR5cGUgUm90YXJ5T3B0aW9uID0ge1xuICBpY29uOiBzdHJpbmc7XG4gIGFjdGlvbkluZGV4OiBudW1iZXI7XG4gIHRpdGxlOiBzdHJpbmc7XG59O1xuXG5jb25zdCBjcmVhdGVSb3RhcnlPcHRpb24gPSAoaW5kZXg6IG51bWJlciwgYWN0aW9uOiBBY3Rpb24pID0+IHtcbiAgcmV0dXJuIHtcbiAgICBpY29uOiBhY3Rpb24uaWNvbixcbiAgICBhY3Rpb25JbmRleDogaW5kZXgsXG4gICAgdGl0bGU6IGFjdGlvbi50aXRsZVxuICB9O1xufTtcblxuY29uc3QgUk9UQVRJT05fREVHUkVFID0gMzc7XG5jb25zdCBnZXRSb3RhdGVWYWx1ZUZvckluZGV4ID0gKGk6IG51bWJlcikgPT4ge1xuICBjb25zdCBjZW50ZXJJbmRleCA9IE1hdGguZmxvb3IoNyAvIDIpO1xuXG4gIHJldHVybiBST1RBVElPTl9ERUdSRUUgKiAtMSAqIChjZW50ZXJJbmRleCAtIGkpO1xufTtcblxuY29uc3QgY3JlYXRlT3B0aW9uRWxlbWVudCA9IChyb3RhcnlPcHRpb246IFJvdGFyeU9wdGlvbiwgaW5kZXg6IG51bWJlcikgPT4ge1xuICBjb25zdCBvcHRpb25FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgb3B0aW9uRWxlbWVudC5jbGFzc05hbWUgPSBcInJuLW9wdGlvblwiO1xuXG4gIGNvbnN0IGljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaVwiKTtcbiAgaWNvbi5jbGFzc05hbWUgPSBgcm4taWNvbiBmYS1zb2xpZCBmYS0ke3JvdGFyeU9wdGlvbi5pY29ufWA7XG5cbiAgb3B0aW9uRWxlbWVudC5hcHBlbmQoaWNvbik7XG5cbiAgY29uc3QgZGVncmVlID0gZ2V0Um90YXRlVmFsdWVGb3JJbmRleChpbmRleCk7XG4gIG9wdGlvbkVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoXCItLWRlZ3JlZVwiLCBgJHtkZWdyZWV9ZGVnYCk7XG5cbiAgcmV0dXJuIG9wdGlvbkVsZW1lbnQ7XG59O1xuXG5jb25zdCBjcmVhdGVFbmRsZXNzT3B0aW9ucyA9IChhY3RpdmVJbmRleDogbnVtYmVyLCBhY3Rpb25zOiBBY3Rpb25bXSkgPT4ge1xuICBjb25zdCBmaXJzdEZvdXIgPSBbXSxcbiAgICBsYXN0VGhyZWUgPSBbXTtcbiAgbGV0IGkgPSBhY3RpdmVJbmRleCAlIGFjdGlvbnMubGVuZ3RoO1xuICB3aGlsZSAoZmlyc3RGb3VyLmxlbmd0aCA8IDQgfHwgbGFzdFRocmVlLmxlbmd0aCA8IDMpIHtcbiAgICBpZiAoZmlyc3RGb3VyLmxlbmd0aCA8IDQpIGZpcnN0Rm91ci5wdXNoKGNyZWF0ZVJvdGFyeU9wdGlvbihpLCBhY3Rpb25zW2ldKSk7XG4gICAgaWYgKGxhc3RUaHJlZS5sZW5ndGggPCAzKSB7XG4gICAgICAvLyBjb25zdCBsYXN0SW5kZXggPSBhY3Rpb25zLmxlbmd0aCAtIDEgLSBpO1xuICAgICAgY29uc3QgbGFzdEluZGV4ID1cbiAgICAgICAgKGFjdGl2ZUluZGV4IC0gKGkgLSBhY3RpdmVJbmRleCArIDEpICsgYWN0aW9ucy5sZW5ndGgpICUgYWN0aW9ucy5sZW5ndGg7XG4gICAgICBsYXN0VGhyZWUucHVzaChjcmVhdGVSb3RhcnlPcHRpb24obGFzdEluZGV4LCBhY3Rpb25zW2xhc3RJbmRleF0pKTtcbiAgICB9XG5cbiAgICBpID0gKGkgKyAxKSAlIGFjdGlvbnMubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIFsuLi5sYXN0VGhyZWUucmV2ZXJzZSgpLCAuLi5maXJzdEZvdXJdO1xufTtcbi8vIGZ1bmN0aW9uIGdldFJvdGF0ZU11bHRpcGxpZXJGb3JJbmRleChpOiBudW1iZXIpIHtcbi8vICAgY29uc3Qgb3B0aW9uTGVuZ3RoID0gNTtcbi8vICAgY29uc3Qgcm90YXRpb24gPSAoMTgwIC8gKG9wdGlvbkxlbmd0aCAtIDEpKSAqIChpIC0gMSkgLSA5MDtcblxuLy8gICBjb25zdCB2aWV3UG9ydEZpeCA9XG4vLyAgICAgKDQwIC8gb3B0aW9uTGVuZ3RoKSAqIChNYXRoLmZsb29yKG9wdGlvbkxlbmd0aCAvIDIpIC0gKGkgLSAxKSk7XG5cbi8vICAgcmV0dXJuIHJvdGF0aW9uICsgdmlld1BvcnRGaXg7XG4vLyB9XG4iLCJpbXBvcnQgeyBTZXRBY3RpdmVNZW51IH0gZnJvbSBcIi4vLi4vTW9kdWxlXCI7XG5pbXBvcnQgeyBSb3RhcnlOb3RpZmljYXRpb24gfSBmcm9tIFwiLi4vSVJvdGFyeU1lbnVcIjtcbmltcG9ydCB7IFJvdGFyeU1lbnUgfSBmcm9tIFwiLi4vUm90YXJ5TWVudVwiO1xuXG50eXBlIE5vdGlmaWNhdGlvbkV2ZW50ID0gXCJuZXh0XCIgfCBcInByZXZcIiB8IFwic2hvcnRQcmVzc1wiIHwgXCJsb25nUHJlc3NcIiB8IFwicHJlc3NcIjtcbnR5cGUgTm90aWZpY2F0aW9uRXZlbnRPcHRpb24gPSB7XG4gIG5vdGlmaWNhdGlvbj86IHN0cmluZztcbiAgY2xvc2U/OiBib29sZWFuO1xufTtcbnR5cGUgTm90aWZpY2F0aW9uTWVudU9wdGlvbnMgPSB7XG4gIGV2ZW50czogUmVjb3JkPE5vdGlmaWNhdGlvbkV2ZW50LCBOb3RpZmljYXRpb25FdmVudE9wdGlvbj47XG4gIHRhcmdldE1vZHVsZUlkPzogc3RyaW5nO1xufTtcblxuZXhwb3J0IHR5cGUgU2hvd0hpZGVFdmVudCA9IHtcbiAgdGFyZ2V0TW9kdWxlSWQ6IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFJvdGFyeU5vdGlmaWNhdGlvblBheWxvYWQgPSB7XG4gIGlkZW50aWZpZXI6IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFJvdGFyeVNlbmROb3RpZmljYXRpb24gPSAoXG4gIG5vdGlmaWNhdGlvbjogc3RyaW5nLFxuICBwYXlsb2FkPzogUm90YXJ5Tm90aWZpY2F0aW9uUGF5bG9hZFxuKSA9PiB2b2lkO1xuXG5leHBvcnQgdHlwZSBSb3RhcnlOb3RpZmljYXRpb25PcHRpb25zID0ge1xuICBzZXRBY3RpdmVNZW51OiBTZXRBY3RpdmVNZW51O1xuICBzZW5kTm90aWZpY2F0aW9uOiBSb3RhcnlTZW5kTm90aWZpY2F0aW9uO1xufTtcblxuZXhwb3J0IGNsYXNzIFJvdGFyeU5vdGlmaWNhdGlvbk1lbnUgZXh0ZW5kcyBSb3RhcnlNZW51PE5vdGlmaWNhdGlvbk1lbnVPcHRpb25zPiB7XG4gIHNlbmROb3RpZmljYXRpb246IFJvdGFyeVNlbmROb3RpZmljYXRpb247XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJvdGFyeU5vdGlmaWNhdGlvbk9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zLnNldEFjdGl2ZU1lbnUpO1xuXG4gICAgdGhpcy5zZW5kTm90aWZpY2F0aW9uID0gb3B0aW9ucy5zZW5kTm90aWZpY2F0aW9uO1xuICAgIHRoaXMuZG9tID0gdGhpcy5jcmVhdGVEb20oKTtcbiAgfVxuXG4gIGNyZWF0ZURvbSgpIHtcbiAgICBjb25zdCBkb20gPSB0aGlzLmRvbTtcbiAgICBkb20uY2xhc3NMaXN0LmFkZChcInJuLW5vdGlmaWNhdGlvbi1tZW51XCIpO1xuXG4gICAgcmV0dXJuIGRvbTtcbiAgfVxuXG4gIGhhbmRsZU5vdGlmaWNhdGlvbihldmVudE5hbWU6IE5vdGlmaWNhdGlvbkV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMgfHwgIShldmVudE5hbWUgaW4gdGhpcy5vcHRpb25zLmV2ZW50cykpIHJldHVybjtcblxuICAgIGNvbnN0IGV2ZW50ID0gdGhpcy5vcHRpb25zLmV2ZW50c1tldmVudE5hbWVdO1xuICAgIGlmIChldmVudC5ub3RpZmljYXRpb24pIHtcbiAgICAgIGNvbnN0IHBheWxvYWQgPVxuICAgICAgICB0aGlzLm9wdGlvbnM/LnRhcmdldE1vZHVsZUlkICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgaWRlbnRpZmllcjogdGhpcy5vcHRpb25zLnRhcmdldE1vZHVsZUlkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICB0aGlzLnNlbmROb3RpZmljYXRpb24oZXZlbnQubm90aWZpY2F0aW9uLCBwYXlsb2FkKTtcblxuICAgICAgdGhpcy5zZXRJbmZvKGV2ZW50TmFtZSk7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmNsb3NlKSB0aGlzLmhpZGUoKTtcbiAgfVxuXG4gIG9uSGlkZShjYWxsYmFjazogKGV2ZW50OiBTaG93SGlkZUV2ZW50KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5hcHBlbmRFdmVudChcImhpZGVcIiwgY2FsbGJhY2spO1xuICB9XG5cbiAgb25TaG93KGNhbGxiYWNrOiAoZXZlbnQ6IFNob3dIaWRlRXZlbnQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmFwcGVuZEV2ZW50KFwic2hvd1wiLCBjYWxsYmFjayk7XG4gIH1cblxuICByb3RhcnlOb3RpZmljYXRpb25SZWNlaXZlZChub3RpZmljYXRpb246IFJvdGFyeU5vdGlmaWNhdGlvbik6IHZvaWQge1xuICAgIHN1cGVyLnJvdGFyeU5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbik7XG4gICAgc3dpdGNoIChub3RpZmljYXRpb24pIHtcbiAgICAgIGNhc2UgXCJST1RBUllfTEVGVFwiOlxuICAgICAgICB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbihcInByZXZcIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIlJPVEFSWV9SSUdIVFwiOlxuICAgICAgICB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbihcIm5leHRcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1BSRVNTXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwicHJlc3NcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX0xPTkdfUFJFU1NcIjpcbiAgICAgICAgdGhpcy5oYW5kbGVOb3RpZmljYXRpb24oXCJsb25nUHJlc3NcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1NIT1JUX1BSRVNTXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwic2hvcnRQcmVzc1wiKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBpbmZvVGltZW91dElkOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHNldEluZm8odGV4dDogc3RyaW5nKSB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLmRvbS5xdWVyeVNlbGVjdG9yKFwiLnJuLW1lbnUtdGl0bGVcIik7XG4gICAgaWYgKCF0aXRsZSkgcmV0dXJuO1xuXG4gICAgY29uc3QgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgIHRpdGxlLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICB0aXRsZS5jbGFzc0xpc3QucmVtb3ZlKFwicm4tbm90aWZ5LXNsb3dIaWRlXCIpO1xuICAgIH07XG5cbiAgICBjbGVhbnVwKCk7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuaW5mb1RpbWVvdXRJZCk7XG5cbiAgICAvL3JlLXRyaWdnZXIgYW5pbWF0aW9uXG4gICAgdGl0bGUuc2Nyb2xsQnkoMCwgMCk7XG4gICAgdGl0bGUuY2xhc3NMaXN0LmFkZChcInJuLW5vdGlmeS1zbG93SGlkZVwiKTtcbiAgICB0aXRsZS5pbm5lckhUTUwgPSB0ZXh0O1xuXG4gICAgdGhpcy5pbmZvVGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfSwgMTUwMCk7XG4gIH1cbn1cbiIsImltcG9ydCB7IGRlYnVnS2V5Ym9hZEV2ZW50cyB9IGZyb20gXCIuL0RlYnVnXCI7XG5pbXBvcnQgeyBJUm90YXJ5TWVudSB9IGZyb20gXCIuL0lSb3RhcnlNZW51XCI7XG5pbXBvcnQgeyBSb3RhcnlOYXZpZ2F0aW9uTWVudSB9IGZyb20gXCIuL1JvdGFyeU5hdmlnYXRpb25NZW51L1JvdGFyeU5hdmlnYXRpb25NZW51XCI7XG5pbXBvcnQge1xuICBSb3RhcnlOb3RpZmljYXRpb25NZW51LFxuICBTaG93SGlkZUV2ZW50XG59IGZyb20gXCIuL1JvdGFyeU5vdGlmaWNhdGlvbk1lbnUvUm90YXJ5Tm90aWZpY2F0aW9uTWVudVwiO1xuXG5leHBvcnQgdHlwZSBBY3Rpb24gPSB7XG4gIGljb246IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgbWVudT86IHsgdHlwZTogXCJub3RpZmljYXRpb25cIiB8IFwibmF2aWdhdGlvblwiIH07XG59O1xuXG50eXBlIE1vZHVsZUNvbmZpZ3MgPSB7XG4gIGFjdGlvbnM6IEFjdGlvbltdO1xufTtcblxuZXhwb3J0IHR5cGUgTWVudVR5cGUgPSBcIm5vdGlmaWNhdGlvblwiIHwgXCJuYXZpZ2F0aW9uXCI7XG5leHBvcnQgdHlwZSBTZXRBY3RpdmVNZW51ID0gKG1lbnU6IE1lbnVUeXBlIHwgbnVsbCwgb3B0aW9ucz86IGFueSkgPT4gdm9pZDtcblxuTW9kdWxlLnJlZ2lzdGVyPE1vZHVsZUNvbmZpZ3M+KFwiTU1NLVJvdGFyeU5hdmlnYXRpb25cIiwge1xuICBub3RpZmljYXRpb25MaXN0ZW5CbG9jazogZmFsc2UsXG4gIG1lbnVzOiB7XG4gICAgbmF2aWdhdGlvbjogbnVsbCxcbiAgICBub3RpZmljYXRpb246IG51bGxcbiAgfSxcbiAgb3B0aW9uczogW10gYXMgc3RyaW5nW10sXG4gIGRlZmF1bHRzOiB7XG4gICAgYWN0aW9uczogW11cbiAgfSxcbiAgYWN0aXZlTWVudTogbnVsbCBhcyBudWxsIHwgSVJvdGFyeU1lbnUsXG4gIGluaXQoKSB7fSxcbiAgc3RhcnQoKSB7XG4gICAgdGhpcy5pbml0TWVudXMoKTtcblxuICAgIHRoaXMuc2VuZFNvY2tldE5vdGlmaWNhdGlvbihcIlJPVEFSWV9JTklUXCIsIG51bGwpO1xuICAgIGRlYnVnS2V5Ym9hZEV2ZW50cyh0aGlzKTtcbiAgfSxcbiAgZ2V0RG9tKCkge1xuICAgIGNvbnN0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIHdyYXBwZXIuY2xhc3NOYW1lID0gXCJybi1tYWluXCI7XG4gICAgd3JhcHBlci5pZCA9IGBybl8ke3RoaXMuaWRlbnRpZmllcn1gO1xuXG4gICAgY29uc3QgdG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB0b2dnbGUuY2xhc3NOYW1lID0gXCJybi10b2dnbGVcIjtcbiAgICBjb25zdCB0b2dnbGVJY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlcIik7XG4gICAgdG9nZ2xlSWNvbi5jbGFzc05hbWUgPSBcImZhLXNvbGlkIGZhLWJhcnNcIjtcbiAgICB0b2dnbGUuYXBwZW5kKHRvZ2dsZUljb24pO1xuXG4gICAgd3JhcHBlci5hcHBlbmQodG9nZ2xlKTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMubWVudXMpLmZvckVhY2goKG1lbnVLZXkpID0+IHtcbiAgICAgIHdyYXBwZXIuYXBwZW5kKHRoaXMubWVudXNbbWVudUtleV0uZ2V0RG9tKCkpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHdyYXBwZXI7XG4gIH0sXG5cbiAgc2V0TWVudSh0YXJnZXQ6IHN0cmluZyB8IG51bGwsIHNob3dPcHRpb25zPzogYW55KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTWVudSAhPSBudWxsKSAodGhpcy5hY3RpdmVNZW51IGFzIElSb3RhcnlNZW51KS5oaWRlKCk7XG5cbiAgICBpZiAodGFyZ2V0ICE9IG51bGwgJiYgdGFyZ2V0IGluIHRoaXMubWVudXMpIHtcbiAgICAgIGNvbnN0IG1lbnUgPSB0aGlzLm1lbnVzW3RhcmdldF07XG5cbiAgICAgIG1lbnUuc2hvdyhzaG93T3B0aW9ucyk7XG4gICAgICB0aGlzLmFjdGl2ZU1lbnUgPSBtZW51O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFjdGl2ZU1lbnUgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZpY2F0aW9uTGlzdGVuQmxvY2sgPSB0cnVlO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5ub3RpZmljYXRpb25MaXN0ZW5CbG9jayA9IGZhbHNlO1xuICAgIH0sIDEwMCk7XG5cbiAgICB0aGlzLnJlbmRlcigpO1xuICB9LFxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBtYWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHJuXyR7dGhpcy5pZGVudGlmaWVyfWApO1xuICAgIGlmICghbWFpbikgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYWN0aXZlTWVudSkgbWFpbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpO1xuICAgIGVsc2UgbWFpbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpO1xuICB9LFxuXG4gIHNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbikge1xuICAgIGlmICh0aGlzLm5vdGlmaWNhdGlvbkxpc3RlbkJsb2NrKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy5hY3RpdmVNZW51ID09IG51bGwpIHtcbiAgICAgIHRoaXMuc2V0TWVudShcIm5hdmlnYXRpb25cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5hY3RpdmVNZW51LnJvdGFyeU5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbik7XG4gIH1cblxuICBpbml0TWVudXMoKSB7XG4gICAgY29uc3Qgc2V0QWN0aXZlTWVudTogU2V0QWN0aXZlTWVudSA9ICh0YXJnZXQsIHNob3dPcHRpb25zKSA9PlxuICAgICAgdGhpcy5zZXRNZW51KHRhcmdldCwgc2hvd09wdGlvbnMpO1xuXG4gICAgdGhpcy5tZW51cy5uYXZpZ2F0aW9uID0gbmV3IFJvdGFyeU5hdmlnYXRpb25NZW51KHtcbiAgICAgIHNldEFjdGl2ZU1lbnUsXG4gICAgICBhY3Rpb25zOiB0aGlzLmNvbmZpZy5hY3Rpb25zXG4gICAgfSk7XG5cbiAgICBjb25zdCBzZW5kTm90aWZpY2F0aW9uID0gKG5vdGlmaWNhdGlvbjogc3RyaW5nLCBwYXlsb2FkPzogYW55KSA9PlxuICAgICAgdGhpcy5zZW5kTm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbiwgcGF5bG9hZCk7XG5cbiAgICB0aGlzLm1lbnVzLm5vdGlmaWNhdGlvbiA9IG5ldyBSb3RhcnlOb3RpZmljYXRpb25NZW51KHtcbiAgICAgIHNldEFjdGl2ZU1lbnUsXG4gICAgICBzZW5kTm90aWZpY2F0aW9uXG4gICAgfSk7XG5cbiAgICB0aGlzLm1lbnVzLm5vdGlmaWNhdGlvbi5vbkhpZGUoKGU6IFNob3dIaWRlRXZlbnQpID0+IHtcbiAgICAgIGZpbmRNb2R1bGVCeUlkKGUudGFyZ2V0TW9kdWxlSWQpPy5oaWRlKDYwMCk7XG4gICAgICB0aGlzLmFjdGl2ZU1lbnUgPSBudWxsO1xuICAgIH0pO1xuXG4gICAgdGhpcy5tZW51cy5ub3RpZmljYXRpb24ub25TaG93KChlOiBTaG93SGlkZUV2ZW50KSA9PiB7XG4gICAgICBmaW5kTW9kdWxlQnlJZChlLnRhcmdldE1vZHVsZUlkKT8uc2hvdyg2MDApO1xuICAgIH0pO1xuICB9LFxuXG4gIGdldFN0eWxlcygpIHtcbiAgICByZXR1cm4gW1wiZm9udC1hd2Vzb21lLmNzc1wiLCBcIk1NTS1Sb3RhcnlOYXZpZ2F0aW9uLmNzc1wiXTtcbiAgfVxufSk7XG5cbmNvbnN0IGZpbmRNb2R1bGVCeUlkID0gKGlkOiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIE1NLmdldE1vZHVsZXMoKS5maW5kKChtb2R1bGUpID0+IG1vZHVsZS5pZGVudGlmaWVyID09PSBpZCk7XG59O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztJQUFPLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxNQUFvQyxLQUFJO1FBQ3pFLElBQUksa0JBQWtCLEdBQWtCLElBQUk7UUFDNUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQWdCLEtBQUk7WUFDeEQsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxrQkFBa0IsS0FBSyxJQUFJO0lBQ2xELFlBQUEsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLFNBQVM7SUFDcEMsS0FBQyxDQUFDO1FBQ0YsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQWdCLEtBQUk7SUFDdEQsUUFBQSxRQUFRLENBQUMsQ0FBQyxHQUFHO0lBQ1gsWUFBQSxLQUFLLFdBQVc7SUFDZCxnQkFBQSxNQUFNLENBQUMsMEJBQTBCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQztvQkFDdEQ7SUFDRixZQUFBLEtBQUssWUFBWTtJQUNmLGdCQUFBLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDO29CQUN2RDtJQUNGLFlBQUEsS0FBSyxPQUFPO0lBQ1YsZ0JBQUEsTUFBTSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUM7b0JBRXZELElBQUksa0JBQWtCLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxHQUFHO0lBQzlELG9CQUFBLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUM7O0lBQ3pELG9CQUFBLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUM7b0JBRWxFLGtCQUFrQixHQUFHLElBQUk7b0JBQ3pCOztJQUVOLEtBQUMsQ0FBQztJQUNKLENBQUM7O0lDcEJELE1BQU0saUJBQWlCLEdB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
