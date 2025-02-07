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
                    module.socketNotificationReceived("ROTARY_PREV", null);
                    break;
                case "ArrowRight":
                    module.socketNotificationReceived("ROTARY_NEXT", null);
                    break;
                case "Enter":
                    module.socketNotificationReceived("ROTARY_PRESS", null);
                    if (lastEnterTimeStamp && e.timeStamp - lastEnterTimeStamp > 500)
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
                this.sendNotification(event.notification, {
                    identifier: this.options.targetModuleId
                });
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
            console.log("notification", notification);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTU1NLVJvdGFyeU5hdmlnYXRpb24uanMiLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUvRGVidWcudHMiLCJzcmMvbW9kdWxlL1JvdGFyeU1lbnUudHMiLCJzcmMvbW9kdWxlL1JvdGFyeU5hdmlnYXRpb25NZW51L1JvdGFyeU5hdmlnYXRpb25NZW51LnRzIiwic3JjL21vZHVsZS9Sb3RhcnlOb3RpZmljYXRpb25NZW51L1JvdGFyeU5vdGlmaWNhdGlvbk1lbnUudHMiLCJzcmMvbW9kdWxlL01vZHVsZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZGVidWdLZXlib2FkRXZlbnRzID0gKG1vZHVsZTogTW9kdWxlLk1vZHVsZVByb3BlcnRpZXM8YW55PikgPT4ge1xuICBsZXQgbGFzdEVudGVyVGltZVN0YW1wOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICBpZiAoZS5rZXkgPT09IFwiRW50ZXJcIiAmJiBsYXN0RW50ZXJUaW1lU3RhbXAgPT09IG51bGwpXG4gICAgICBsYXN0RW50ZXJUaW1lU3RhbXAgPSBlLnRpbWVTdGFtcDtcbiAgfSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgIGNhc2UgXCJBcnJvd0xlZnRcIjpcbiAgICAgICAgbW9kdWxlLnNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKFwiUk9UQVJZX1BSRVZcIiwgbnVsbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIkFycm93UmlnaHRcIjpcbiAgICAgICAgbW9kdWxlLnNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKFwiUk9UQVJZX05FWFRcIiwgbnVsbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIkVudGVyXCI6XG4gICAgICAgIG1vZHVsZS5zb2NrZXROb3RpZmljYXRpb25SZWNlaXZlZChcIlJPVEFSWV9QUkVTU1wiLCBudWxsKTtcblxuICAgICAgICBpZiAobGFzdEVudGVyVGltZVN0YW1wICYmIGUudGltZVN0YW1wIC0gbGFzdEVudGVyVGltZVN0YW1wID4gNTAwKVxuICAgICAgICAgIG1vZHVsZS5zb2NrZXROb3RpZmljYXRpb25SZWNlaXZlZChcIlJPVEFSWV9MT05HX1BSRVNTXCIsIG51bGwpO1xuICAgICAgICBlbHNlIG1vZHVsZS5zb2NrZXROb3RpZmljYXRpb25SZWNlaXZlZChcIlJPVEFSWV9TSE9SVF9QUkVTU1wiLCBudWxsKTtcblxuICAgICAgICBsYXN0RW50ZXJUaW1lU3RhbXAgPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0pO1xufTtcbiIsImltcG9ydCB7IElSb3RhcnlNZW51LCBSb3RhcnlOb3RpZmljYXRpb24gfSBmcm9tIFwiLi9JUm90YXJ5TWVudVwiO1xuaW1wb3J0IHsgU2V0QWN0aXZlTWVudSB9IGZyb20gXCIuL01vZHVsZVwiO1xudHlwZSBSb3RhcnlNZW51RXZlbnQgPSBcInNob3dcIiB8IFwiaGlkZVwiO1xudHlwZSBSb3RhcnlNZW51RXZlbnRDYWxsYmFjayA9IChldmVudD86IGFueSkgPT4gdm9pZDtcblxuY29uc3QgQVVUT19ISURFX1NFQ09ORFMgPSA1ICogMTAwMDtcbmV4cG9ydCBjbGFzcyBSb3RhcnlNZW51PFQgPSB1bmRlZmluZWQ+IGltcGxlbWVudHMgSVJvdGFyeU1lbnUge1xuICBvcHRpb25zPzogVDtcbiAgZG9tOiBIVE1MRGl2RWxlbWVudDtcbiAgZXZlbnRMaXN0OiBQYXJ0aWFsPFJlY29yZDxSb3RhcnlNZW51RXZlbnQsIFJvdGFyeU1lbnVFdmVudENhbGxiYWNrW10+PiA9IHt9O1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgc2V0QWN0aXZlTWVudTogU2V0QWN0aXZlTWVudSkge1xuICAgIHRoaXMuZG9tID0gdGhpcy5jcmVhdGVCYXNlRG9tKCk7XG4gIH1cblxuICBjcmVhdGVCYXNlRG9tKCkge1xuICAgIGNvbnN0IGRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgZG9tLmNsYXNzTmFtZSA9IFwicm4tbWVudVwiO1xuXG4gICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIHRpdGxlLmNsYXNzTmFtZSA9IFwicm4tbWVudS10aXRsZVwiO1xuXG4gICAgZG9tLmFwcGVuZCh0aXRsZSk7XG5cbiAgICByZXR1cm4gZG9tO1xuICB9XG4gIGdldERvbSgpIHtcbiAgICByZXR1cm4gdGhpcy5kb207XG4gIH1cblxuICBzaG93KG9wdGlvbnM/OiBUKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmF1dG9IaWRlVGltZW91dCgpO1xuXG4gICAgdGhpcy5kb20uY2xhc3NMaXN0LmFkZChcInNob3dcIik7XG4gICAgdGhpcy50cmlnZ2VyRXZlbnQoXCJzaG93XCIsIHRoaXMub3B0aW9ucyk7XG4gIH1cbiAgaGlkZSgpOiB2b2lkIHtcbiAgICB0aGlzLmRvbS5jbGFzc0xpc3QucmVtb3ZlKFwic2hvd1wiKTtcbiAgICBjbGVhckludGVydmFsKHRoaXMuYXV0b0hpZGVUaW1lb3V0SWQpO1xuXG4gICAgdGhpcy50cmlnZ2VyRXZlbnQoXCJoaWRlXCIsIHRoaXMub3B0aW9ucyk7XG4gIH1cbiAgcm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uOiBSb3RhcnlOb3RpZmljYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLmF1dG9IaWRlVGltZW91dCgpO1xuICB9XG5cbiAgb25TaG93KGNhbGxiYWNrOiBSb3RhcnlNZW51RXZlbnRDYWxsYmFjaykge1xuICAgIHRoaXMuYXBwZW5kRXZlbnQoXCJzaG93XCIsIGNhbGxiYWNrKTtcbiAgfVxuICBvbkhpZGUoY2FsbGJhY2s6IFJvdGFyeU1lbnVFdmVudENhbGxiYWNrKSB7XG4gICAgdGhpcy5hcHBlbmRFdmVudChcImhpZGVcIiwgY2FsbGJhY2spO1xuICB9XG5cbiAgcHJvdGVjdGVkIGF1dG9IaWRlVGltZW91dElkOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBhdXRvSGlkZVRpbWVvdXQoKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuYXV0b0hpZGVUaW1lb3V0SWQpO1xuXG4gICAgdGhpcy5hdXRvSGlkZVRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5zZXRBY3RpdmVNZW51KG51bGwpO1xuICAgIH0sIEFVVE9fSElERV9TRUNPTkRTKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhcHBlbmRFdmVudChcbiAgICBldmVudFR5cGU6IFJvdGFyeU1lbnVFdmVudCxcbiAgICBjYWxsYmFjazogUm90YXJ5TWVudUV2ZW50Q2FsbGJhY2tcbiAgKSB7XG4gICAgdGhpcy5ldmVudExpc3RbZXZlbnRUeXBlXSA9IHRoaXMuZXZlbnRMaXN0W2V2ZW50VHlwZV0gfHwgW107XG5cbiAgICB0aGlzLmV2ZW50TGlzdFtldmVudFR5cGVdLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgcHJvdGVjdGVkIHRyaWdnZXJFdmVudChldmVudFR5cGU6IFJvdGFyeU1lbnVFdmVudCwgZXZlbnQ/OiBUKSB7XG4gICAgaWYgKCF0aGlzLmV2ZW50TGlzdFtldmVudFR5cGVdIHx8IHRoaXMuZXZlbnRMaXN0W2V2ZW50VHlwZV0ubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5ldmVudExpc3RbZXZlbnRUeXBlXS5mb3JFYWNoKChldmVudENhbGxiYWNrKSA9PiB7XG4gICAgICBldmVudENhbGxiYWNrKGV2ZW50KTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgQWN0aW9uLCBTZXRBY3RpdmVNZW51IH0gZnJvbSBcIi4uL01vZHVsZVwiO1xuaW1wb3J0IHsgUm90YXJ5Tm90aWZpY2F0aW9uIH0gZnJvbSBcIi4uL0lSb3RhcnlNZW51XCI7XG5pbXBvcnQgeyBSb3RhcnlNZW51IH0gZnJvbSBcIi4uL1JvdGFyeU1lbnVcIjtcblxuZXhwb3J0IHR5cGUgUm90YXJ5TmF2aWdhdGlvbk9wdGlvbnMgPSB7XG4gIHNldEFjdGl2ZU1lbnU6IFNldEFjdGl2ZU1lbnU7XG4gIGFjdGlvbnM6IGFueVtdO1xufTtcblxuZXhwb3J0IGNsYXNzIFJvdGFyeU5hdmlnYXRpb25NZW51IGV4dGVuZHMgUm90YXJ5TWVudSB7XG4gIGFjdGl2ZUluZGV4OiBudW1iZXI7XG4gIGFjdGlvbnM6IEFjdGlvbltdO1xuICBibG9jayA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJvdGFyeU5hdmlnYXRpb25PcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucy5zZXRBY3RpdmVNZW51KTtcblxuICAgIHRoaXMuYWN0aW9ucyA9IG9wdGlvbnMuYWN0aW9ucztcbiAgICB0aGlzLmFjdGl2ZUluZGV4ID0gMDtcblxuICAgIHRoaXMuZG9tID0gdGhpcy5jcmVhdGVEb20oKTtcbiAgfVxuXG4gIGNyZWF0ZURvbSgpIHtcbiAgICBjb25zdCBkb20gPSB0aGlzLmRvbTtcbiAgICBkb20uY2xhc3NMaXN0LmFkZChcInJuLW5hdmlnYXRpb25cIik7XG4gICAgZG9tLmFwcGVuZCh0aGlzLmdldE9wdGlvbnNDb250YWluZXIoKSk7XG5cbiAgICBjb25zdCBhY3RpdmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGFjdGl2ZS5jbGFzc05hbWUgPSBcInJuLW5hdi1hY3RpdmVcIjtcbiAgICBkb20uYXBwZW5kKGFjdGl2ZSk7XG5cbiAgICBjb25zdCB0aXRsZSA9IGRvbS5xdWVyeVNlbGVjdG9yKFwiLnJuLW1lbnUtdGl0bGVcIik7XG4gICAgaWYgKHRpdGxlKSB0aXRsZS5pbm5lckhUTUwgPSB0aGlzLmdldEFjdGl2ZUFjdGlvbigpLnRpdGxlO1xuXG4gICAgcmV0dXJuIGRvbTtcbiAgfVxuXG4gIGdldEFjdGl2ZUFjdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hY3Rpb25zW3RoaXMuYWN0aXZlSW5kZXhdO1xuICB9XG4gIGdldE9wdGlvbnNDb250YWluZXIodGFyZ2V0SW5kZXg/OiBudW1iZXIpIHtcbiAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGNvbnRhaW5lci5jbGFzc05hbWUgPSBcInJuLW9wdGlvbnMtY29udGFpbmVyXCI7XG5cbiAgICBjb25zdCBvcHRpb25zID0gY3JlYXRlRW5kbGVzc09wdGlvbnMoXG4gICAgICB0YXJnZXRJbmRleCAhPSB1bmRlZmluZWQgPyB0YXJnZXRJbmRleCA6IHRoaXMuYWN0aXZlSW5kZXgsXG4gICAgICB0aGlzLmFjdGlvbnNcbiAgICApO1xuXG4gICAgb3B0aW9ucy5mb3JFYWNoKChvcHRpb24sIGluZGV4KSA9PiB7XG4gICAgICBjb250YWluZXIuYXBwZW5kKGNyZWF0ZU9wdGlvbkVsZW1lbnQob3B0aW9uLCBpbmRleCkpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfVxuXG4gIG1vdmUoZGlyZWN0aW9uOiBcIm5leHRcIiB8IFwicHJldlwiKSB7XG4gICAgaWYgKHRoaXMuYmxvY2spIHJldHVybjtcblxuICAgIHRoaXMuYmxvY2sgPSB0cnVlO1xuXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5kb20ucXVlcnlTZWxlY3RvcihcIi5ybi1vcHRpb25zLWNvbnRhaW5lclwiKTtcbiAgICBpZiAoIWNvbnRhaW5lcikgcmV0dXJuO1xuXG4gICAgbGV0IG5leHRJbmRleCA9IHRoaXMuYWN0aXZlSW5kZXggKyAoZGlyZWN0aW9uID09PSBcIm5leHRcIiA/IDEgOiAtMSk7XG4gICAgaWYgKG5leHRJbmRleCA9PT0gdGhpcy5hY3Rpb25zLmxlbmd0aCkgbmV4dEluZGV4ID0gMDtcbiAgICBlbHNlIGlmIChuZXh0SW5kZXggPCAwKSBuZXh0SW5kZXggPSB0aGlzLmFjdGlvbnMubGVuZ3RoIC0gMTtcblxuICAgIGNvbnN0IG5ld0NvbnRhaW5lciA9IHRoaXMuZ2V0T3B0aW9uc0NvbnRhaW5lcihuZXh0SW5kZXgpO1xuICAgIHRoaXMuYWN0aXZlSW5kZXggPSBuZXh0SW5kZXg7XG5cbiAgICBjb25zdCBuYXZUaXRsZSA9IHRoaXMuZG9tLnF1ZXJ5U2VsZWN0b3IoXCIucm4tbWVudS10aXRsZVwiKTtcbiAgICBuYXZUaXRsZSEuaW5uZXJIVE1MID0gdGhpcy5nZXRBY3RpdmVBY3Rpb24oKS50aXRsZTtcblxuICAgIGNvbnN0IGRpc2FibGVCbG9jayA9ICgpID0+ICh0aGlzLmJsb2NrID0gZmFsc2UpO1xuXG4gICAgKGNvbnRhaW5lciBhcyBIVE1MRWxlbWVudCkuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwidHJhbnNpdGlvbmVuZFwiLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBjb250YWluZXIucGFyZW50RWxlbWVudD8uYXBwZW5kKG5ld0NvbnRhaW5lcik7XG4gICAgICAgIGNvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgZGlzYWJsZUJsb2NrKCk7XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBvbmNlOiB0cnVlXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IGRlZ3JlZSA9IFJPVEFUSU9OX0RFR1JFRSAqIChkaXJlY3Rpb24gPT09IFwibmV4dFwiID8gLTEgOiAxKTtcbiAgICAoY29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5zdHlsZS50cmFuc2Zvcm0gPSBgcm90YXRlKCR7ZGVncmVlfWRlZylgO1xuICB9XG5cbiAgcm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uOiBSb3RhcnlOb3RpZmljYXRpb24pOiB2b2lkIHtcbiAgICBzdXBlci5yb3RhcnlOb3RpZmljYXRpb25SZWNlaXZlZChub3RpZmljYXRpb24pO1xuXG4gICAgc3dpdGNoIChub3RpZmljYXRpb24pIHtcbiAgICAgIGNhc2UgXCJST1RBUllfTEVGVFwiOlxuICAgICAgICB0aGlzLm1vdmUoXCJuZXh0XCIpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIlJPVEFSWV9SSUdIVFwiOlxuICAgICAgICB0aGlzLm1vdmUoXCJwcmV2XCIpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIlJPVEFSWV9QUkVTU1wiOlxuICAgICAgICB0aGlzLm9wZW5NZW51KCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgb3Blbk1lbnUoKSB7XG4gICAgY29uc3QgbWVudSA9IHRoaXMuZ2V0QWN0aXZlQWN0aW9uKCkubWVudTtcbiAgICBpZiAobWVudSkgdGhpcy5zZXRBY3RpdmVNZW51KG1lbnUudHlwZSwgbWVudSk7XG4gIH1cbn1cblxudHlwZSBSb3RhcnlPcHRpb24gPSB7XG4gIGljb246IHN0cmluZztcbiAgYWN0aW9uSW5kZXg6IG51bWJlcjtcbiAgdGl0bGU6IHN0cmluZztcbn07XG5cbmNvbnN0IGNyZWF0ZVJvdGFyeU9wdGlvbiA9IChpbmRleDogbnVtYmVyLCBhY3Rpb246IEFjdGlvbikgPT4ge1xuICByZXR1cm4ge1xuICAgIGljb246IGFjdGlvbi5pY29uLFxuICAgIGFjdGlvbkluZGV4OiBpbmRleCxcbiAgICB0aXRsZTogYWN0aW9uLnRpdGxlXG4gIH07XG59O1xuXG5jb25zdCBST1RBVElPTl9ERUdSRUUgPSAzNztcbmNvbnN0IGdldFJvdGF0ZVZhbHVlRm9ySW5kZXggPSAoaTogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IGNlbnRlckluZGV4ID0gTWF0aC5mbG9vcig3IC8gMik7XG5cbiAgcmV0dXJuIFJPVEFUSU9OX0RFR1JFRSAqIC0xICogKGNlbnRlckluZGV4IC0gaSk7XG59O1xuXG5jb25zdCBjcmVhdGVPcHRpb25FbGVtZW50ID0gKHJvdGFyeU9wdGlvbjogUm90YXJ5T3B0aW9uLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IG9wdGlvbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBvcHRpb25FbGVtZW50LmNsYXNzTmFtZSA9IFwicm4tb3B0aW9uXCI7XG5cbiAgY29uc3QgaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpXCIpO1xuICBpY29uLmNsYXNzTmFtZSA9IGBybi1pY29uIGZhLXNvbGlkIGZhLSR7cm90YXJ5T3B0aW9uLmljb259YDtcblxuICBvcHRpb25FbGVtZW50LmFwcGVuZChpY29uKTtcblxuICBjb25zdCBkZWdyZWUgPSBnZXRSb3RhdGVWYWx1ZUZvckluZGV4KGluZGV4KTtcbiAgb3B0aW9uRWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tZGVncmVlXCIsIGAke2RlZ3JlZX1kZWdgKTtcblxuICByZXR1cm4gb3B0aW9uRWxlbWVudDtcbn07XG5cbmNvbnN0IGNyZWF0ZUVuZGxlc3NPcHRpb25zID0gKGFjdGl2ZUluZGV4OiBudW1iZXIsIGFjdGlvbnM6IEFjdGlvbltdKSA9PiB7XG4gIGNvbnN0IGZpcnN0Rm91ciA9IFtdLFxuICAgIGxhc3RUaHJlZSA9IFtdO1xuICBsZXQgaSA9IGFjdGl2ZUluZGV4ICUgYWN0aW9ucy5sZW5ndGg7XG4gIHdoaWxlIChmaXJzdEZvdXIubGVuZ3RoIDwgNCB8fCBsYXN0VGhyZWUubGVuZ3RoIDwgMykge1xuICAgIGlmIChmaXJzdEZvdXIubGVuZ3RoIDwgNCkgZmlyc3RGb3VyLnB1c2goY3JlYXRlUm90YXJ5T3B0aW9uKGksIGFjdGlvbnNbaV0pKTtcbiAgICBpZiAobGFzdFRocmVlLmxlbmd0aCA8IDMpIHtcbiAgICAgIC8vIGNvbnN0IGxhc3RJbmRleCA9IGFjdGlvbnMubGVuZ3RoIC0gMSAtIGk7XG4gICAgICBjb25zdCBsYXN0SW5kZXggPVxuICAgICAgICAoYWN0aXZlSW5kZXggLSAoaSAtIGFjdGl2ZUluZGV4ICsgMSkgKyBhY3Rpb25zLmxlbmd0aCkgJSBhY3Rpb25zLmxlbmd0aDtcbiAgICAgIGxhc3RUaHJlZS5wdXNoKGNyZWF0ZVJvdGFyeU9wdGlvbihsYXN0SW5kZXgsIGFjdGlvbnNbbGFzdEluZGV4XSkpO1xuICAgIH1cblxuICAgIGkgPSAoaSArIDEpICUgYWN0aW9ucy5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gWy4uLmxhc3RUaHJlZS5yZXZlcnNlKCksIC4uLmZpcnN0Rm91cl07XG59O1xuLy8gZnVuY3Rpb24gZ2V0Um90YXRlTXVsdGlwbGllckZvckluZGV4KGk6IG51bWJlcikge1xuLy8gICBjb25zdCBvcHRpb25MZW5ndGggPSA1O1xuLy8gICBjb25zdCByb3RhdGlvbiA9ICgxODAgLyAob3B0aW9uTGVuZ3RoIC0gMSkpICogKGkgLSAxKSAtIDkwO1xuXG4vLyAgIGNvbnN0IHZpZXdQb3J0Rml4ID1cbi8vICAgICAoNDAgLyBvcHRpb25MZW5ndGgpICogKE1hdGguZmxvb3Iob3B0aW9uTGVuZ3RoIC8gMikgLSAoaSAtIDEpKTtcblxuLy8gICByZXR1cm4gcm90YXRpb24gKyB2aWV3UG9ydEZpeDtcbi8vIH1cbiIsImltcG9ydCB7IFNldEFjdGl2ZU1lbnUgfSBmcm9tIFwiLi8uLi9Nb2R1bGVcIjtcbmltcG9ydCB7IFJvdGFyeU5vdGlmaWNhdGlvbiB9IGZyb20gXCIuLi9JUm90YXJ5TWVudVwiO1xuaW1wb3J0IHsgUm90YXJ5TWVudSB9IGZyb20gXCIuLi9Sb3RhcnlNZW51XCI7XG5cbnR5cGUgTm90aWZpY2F0aW9uRXZlbnQgPSBcIm5leHRcIiB8IFwicHJldlwiIHwgXCJzaG9ydFByZXNzXCIgfCBcImxvbmdQcmVzc1wiIHwgXCJwcmVzc1wiO1xudHlwZSBOb3RpZmljYXRpb25FdmVudE9wdGlvbiA9IHtcbiAgbm90aWZpY2F0aW9uPzogc3RyaW5nO1xuICBjbG9zZT86IGJvb2xlYW47XG59O1xudHlwZSBOb3RpZmljYXRpb25NZW51T3B0aW9ucyA9IHtcbiAgZXZlbnRzOiBSZWNvcmQ8Tm90aWZpY2F0aW9uRXZlbnQsIE5vdGlmaWNhdGlvbkV2ZW50T3B0aW9uPjtcbiAgdGFyZ2V0TW9kdWxlSWQ6IHN0cmluZztcbn07XG5cbmV4cG9ydCB0eXBlIFNob3dIaWRlRXZlbnQgPSB7XG4gIHRhcmdldE1vZHVsZUlkOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgdHlwZSBSb3RhcnlOb3RpZmljYXRpb25QYXlsb2FkID0ge1xuICBpZGVudGlmaWVyOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgdHlwZSBSb3RhcnlTZW5kTm90aWZpY2F0aW9uID0gKFxuICBub3RpZmljYXRpb246IHN0cmluZyxcbiAgcGF5bG9hZDogUm90YXJ5Tm90aWZpY2F0aW9uUGF5bG9hZFxuKSA9PiB2b2lkO1xuXG5leHBvcnQgdHlwZSBSb3RhcnlOb3RpZmljYXRpb25PcHRpb25zID0ge1xuICBzZXRBY3RpdmVNZW51OiBTZXRBY3RpdmVNZW51O1xuICBzZW5kTm90aWZpY2F0aW9uOiBSb3RhcnlTZW5kTm90aWZpY2F0aW9uO1xufTtcblxuZXhwb3J0IGNsYXNzIFJvdGFyeU5vdGlmaWNhdGlvbk1lbnUgZXh0ZW5kcyBSb3RhcnlNZW51PE5vdGlmaWNhdGlvbk1lbnVPcHRpb25zPiB7XG4gIHNlbmROb3RpZmljYXRpb246IFJvdGFyeVNlbmROb3RpZmljYXRpb247XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJvdGFyeU5vdGlmaWNhdGlvbk9wdGlvbnMpIHtcbiAgICBzdXBlcihvcHRpb25zLnNldEFjdGl2ZU1lbnUpO1xuXG4gICAgdGhpcy5zZW5kTm90aWZpY2F0aW9uID0gb3B0aW9ucy5zZW5kTm90aWZpY2F0aW9uO1xuICAgIHRoaXMuZG9tID0gdGhpcy5jcmVhdGVEb20oKTtcbiAgfVxuXG4gIGNyZWF0ZURvbSgpIHtcbiAgICBjb25zdCBkb20gPSB0aGlzLmRvbTtcbiAgICBkb20uY2xhc3NMaXN0LmFkZChcInJuLW5vdGlmaWNhdGlvbi1tZW51XCIpO1xuXG4gICAgcmV0dXJuIGRvbTtcbiAgfVxuXG4gIGhhbmRsZU5vdGlmaWNhdGlvbihldmVudE5hbWU6IE5vdGlmaWNhdGlvbkV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMgfHwgIShldmVudE5hbWUgaW4gdGhpcy5vcHRpb25zLmV2ZW50cykpIHJldHVybjtcblxuICAgIGNvbnN0IGV2ZW50ID0gdGhpcy5vcHRpb25zLmV2ZW50c1tldmVudE5hbWVdO1xuICAgIGlmIChldmVudC5ub3RpZmljYXRpb24pIHtcbiAgICAgIHRoaXMuc2VuZE5vdGlmaWNhdGlvbihldmVudC5ub3RpZmljYXRpb24sIHtcbiAgICAgICAgaWRlbnRpZmllcjogdGhpcy5vcHRpb25zLnRhcmdldE1vZHVsZUlkXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zZXRJbmZvKGV2ZW50TmFtZSk7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmNsb3NlKSB0aGlzLmhpZGUoKTtcbiAgfVxuXG4gIG9uSGlkZShjYWxsYmFjazogKGV2ZW50OiBTaG93SGlkZUV2ZW50KSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5hcHBlbmRFdmVudChcImhpZGVcIiwgY2FsbGJhY2spO1xuICB9XG5cbiAgb25TaG93KGNhbGxiYWNrOiAoZXZlbnQ6IFNob3dIaWRlRXZlbnQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmFwcGVuZEV2ZW50KFwic2hvd1wiLCBjYWxsYmFjayk7XG4gIH1cblxuICByb3RhcnlOb3RpZmljYXRpb25SZWNlaXZlZChub3RpZmljYXRpb246IFJvdGFyeU5vdGlmaWNhdGlvbik6IHZvaWQge1xuICAgIHN1cGVyLnJvdGFyeU5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbik7XG4gICAgc3dpdGNoIChub3RpZmljYXRpb24pIHtcbiAgICAgIGNhc2UgXCJST1RBUllfTEVGVFwiOlxuICAgICAgICB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbihcInByZXZcIik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIlJPVEFSWV9SSUdIVFwiOlxuICAgICAgICB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbihcIm5leHRcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1BSRVNTXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwicHJlc3NcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX0xPTkdfUFJFU1NcIjpcbiAgICAgICAgdGhpcy5oYW5kbGVOb3RpZmljYXRpb24oXCJsb25nUHJlc3NcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1NIT1JUX1BSRVNTXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwic2hvcnRQcmVzc1wiKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBpbmZvVGltZW91dElkOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHNldEluZm8odGV4dDogc3RyaW5nKSB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLmRvbS5xdWVyeVNlbGVjdG9yKFwiLnJuLW1lbnUtdGl0bGVcIik7XG4gICAgaWYgKCF0aXRsZSkgcmV0dXJuO1xuXG4gICAgY29uc3QgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgIHRpdGxlLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICB0aXRsZS5jbGFzc0xpc3QucmVtb3ZlKFwicm4tbm90aWZ5LXNsb3dIaWRlXCIpO1xuICAgIH07XG5cbiAgICBjbGVhbnVwKCk7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuaW5mb1RpbWVvdXRJZCk7XG5cbiAgICAvL3JlLXRyaWdnZXIgYW5pbWF0aW9uXG4gICAgdGl0bGUuc2Nyb2xsQnkoMCwgMCk7XG4gICAgdGl0bGUuY2xhc3NMaXN0LmFkZChcInJuLW5vdGlmeS1zbG93SGlkZVwiKTtcbiAgICB0aXRsZS5pbm5lckhUTUwgPSB0ZXh0O1xuXG4gICAgdGhpcy5pbmZvVGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfSwgMTUwMCk7XG4gIH1cbn1cbiIsImltcG9ydCB7IGRlYnVnS2V5Ym9hZEV2ZW50cyB9IGZyb20gXCIuL0RlYnVnXCI7XG5pbXBvcnQgeyBJUm90YXJ5TWVudSB9IGZyb20gXCIuL0lSb3RhcnlNZW51XCI7XG5pbXBvcnQgeyBSb3RhcnlOYXZpZ2F0aW9uTWVudSB9IGZyb20gXCIuL1JvdGFyeU5hdmlnYXRpb25NZW51L1JvdGFyeU5hdmlnYXRpb25NZW51XCI7XG5pbXBvcnQge1xuICBSb3RhcnlOb3RpZmljYXRpb25NZW51LFxuICBTaG93SGlkZUV2ZW50XG59IGZyb20gXCIuL1JvdGFyeU5vdGlmaWNhdGlvbk1lbnUvUm90YXJ5Tm90aWZpY2F0aW9uTWVudVwiO1xuXG5leHBvcnQgdHlwZSBBY3Rpb24gPSB7XG4gIGljb246IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgbWVudT86IHsgdHlwZTogXCJub3RpZmljYXRpb25cIiB8IFwibmF2aWdhdGlvblwiIH07XG59O1xuXG50eXBlIE1vZHVsZUNvbmZpZ3MgPSB7XG4gIGFjdGlvbnM6IEFjdGlvbltdO1xufTtcblxuZXhwb3J0IHR5cGUgTWVudVR5cGUgPSBcIm5vdGlmaWNhdGlvblwiIHwgXCJuYXZpZ2F0aW9uXCI7XG5leHBvcnQgdHlwZSBTZXRBY3RpdmVNZW51ID0gKG1lbnU6IE1lbnVUeXBlIHwgbnVsbCwgb3B0aW9ucz86IGFueSkgPT4gdm9pZDtcblxuTW9kdWxlLnJlZ2lzdGVyPE1vZHVsZUNvbmZpZ3M+KFwiTU1NLVJvdGFyeU5hdmlnYXRpb25cIiwge1xuICBub3RpZmljYXRpb25MaXN0ZW5CbG9jazogZmFsc2UsXG4gIG1lbnVzOiB7XG4gICAgbmF2aWdhdGlvbjogbnVsbCxcbiAgICBub3RpZmljYXRpb246IG51bGxcbiAgfSxcbiAgb3B0aW9uczogW10gYXMgc3RyaW5nW10sXG4gIGRlZmF1bHRzOiB7XG4gICAgYWN0aW9uczogW11cbiAgfSxcbiAgYWN0aXZlTWVudTogbnVsbCBhcyBudWxsIHwgSVJvdGFyeU1lbnUsXG4gIGluaXQoKSB7fSxcbiAgc3RhcnQoKSB7XG4gICAgdGhpcy5pbml0TWVudXMoKTtcblxuICAgIHRoaXMuc2VuZFNvY2tldE5vdGlmaWNhdGlvbihcIlJPVEFSWV9JTklUXCIsIG51bGwpO1xuICAgIGRlYnVnS2V5Ym9hZEV2ZW50cyh0aGlzKTtcbiAgfSxcbiAgZ2V0RG9tKCkge1xuICAgIGNvbnN0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIHdyYXBwZXIuY2xhc3NOYW1lID0gXCJybi1tYWluXCI7XG4gICAgd3JhcHBlci5pZCA9IGBybl8ke3RoaXMuaWRlbnRpZmllcn1gO1xuXG4gICAgY29uc3QgdG9nZ2xlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB0b2dnbGUuY2xhc3NOYW1lID0gXCJybi10b2dnbGVcIjtcbiAgICBjb25zdCB0b2dnbGVJY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlcIik7XG4gICAgdG9nZ2xlSWNvbi5jbGFzc05hbWUgPSBcImZhLXNvbGlkIGZhLWJhcnNcIjtcbiAgICB0b2dnbGUuYXBwZW5kKHRvZ2dsZUljb24pO1xuXG4gICAgd3JhcHBlci5hcHBlbmQodG9nZ2xlKTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMubWVudXMpLmZvckVhY2goKG1lbnVLZXkpID0+IHtcbiAgICAgIHdyYXBwZXIuYXBwZW5kKHRoaXMubWVudXNbbWVudUtleV0uZ2V0RG9tKCkpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHdyYXBwZXI7XG4gIH0sXG5cbiAgc2V0TWVudSh0YXJnZXQ6IHN0cmluZyB8IG51bGwsIHNob3dPcHRpb25zPzogYW55KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlTWVudSAhPSBudWxsKSAodGhpcy5hY3RpdmVNZW51IGFzIElSb3RhcnlNZW51KS5oaWRlKCk7XG5cbiAgICBpZiAodGFyZ2V0ICE9IG51bGwgJiYgdGFyZ2V0IGluIHRoaXMubWVudXMpIHtcbiAgICAgIGNvbnN0IG1lbnUgPSB0aGlzLm1lbnVzW3RhcmdldF07XG5cbiAgICAgIG1lbnUuc2hvdyhzaG93T3B0aW9ucyk7XG4gICAgICB0aGlzLmFjdGl2ZU1lbnUgPSBtZW51O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFjdGl2ZU1lbnUgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubm90aWZpY2F0aW9uTGlzdGVuQmxvY2sgPSB0cnVlO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5ub3RpZmljYXRpb25MaXN0ZW5CbG9jayA9IGZhbHNlO1xuICAgIH0sIDEwMCk7XG5cbiAgICB0aGlzLnJlbmRlcigpO1xuICB9LFxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBtYWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHJuXyR7dGhpcy5pZGVudGlmaWVyfWApO1xuICAgIGlmICghbWFpbikgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYWN0aXZlTWVudSkgbWFpbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpO1xuICAgIGVsc2UgbWFpbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpO1xuICB9LFxuXG4gIHNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbikge1xuICAgIGNvbnNvbGUubG9nKFwibm90aWZpY2F0aW9uXCIsIG5vdGlmaWNhdGlvbik7XG4gICAgaWYgKHRoaXMubm90aWZpY2F0aW9uTGlzdGVuQmxvY2spIHJldHVybjtcblxuICAgIGlmICh0aGlzLmFjdGl2ZU1lbnUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5zZXRNZW51KFwibmF2aWdhdGlvblwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmFjdGl2ZU1lbnUucm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uKTtcbiAgfSxcblxuICBpbml0TWVudXMoKSB7XG4gICAgY29uc3Qgc2V0QWN0aXZlTWVudTogU2V0QWN0aXZlTWVudSA9ICh0YXJnZXQsIHNob3dPcHRpb25zKSA9PlxuICAgICAgdGhpcy5zZXRNZW51KHRhcmdldCwgc2hvd09wdGlvbnMpO1xuXG4gICAgdGhpcy5tZW51cy5uYXZpZ2F0aW9uID0gbmV3IFJvdGFyeU5hdmlnYXRpb25NZW51KHtcbiAgICAgIHNldEFjdGl2ZU1lbnUsXG4gICAgICBhY3Rpb25zOiB0aGlzLmNvbmZpZy5hY3Rpb25zXG4gICAgfSk7XG5cbiAgICBjb25zdCBzZW5kTm90aWZpY2F0aW9uID0gKG5vdGlmaWNhdGlvbjogc3RyaW5nLCBwYXlsb2FkPzogYW55KSA9PlxuICAgICAgdGhpcy5zZW5kTm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbiwgcGF5bG9hZCk7XG5cbiAgICB0aGlzLm1lbnVzLm5vdGlmaWNhdGlvbiA9IG5ldyBSb3RhcnlOb3RpZmljYXRpb25NZW51KHtcbiAgICAgIHNldEFjdGl2ZU1lbnUsXG4gICAgICBzZW5kTm90aWZpY2F0aW9uXG4gICAgfSk7XG5cbiAgICB0aGlzLm1lbnVzLm5vdGlmaWNhdGlvbi5vbkhpZGUoKGU6IFNob3dIaWRlRXZlbnQpID0+IHtcbiAgICAgIGZpbmRNb2R1bGVCeUlkKGUudGFyZ2V0TW9kdWxlSWQpPy5oaWRlKDYwMCk7XG4gICAgICB0aGlzLmFjdGl2ZU1lbnUgPSBudWxsO1xuICAgIH0pO1xuXG4gICAgdGhpcy5tZW51cy5ub3RpZmljYXRpb24ub25TaG93KChlOiBTaG93SGlkZUV2ZW50KSA9PiB7XG4gICAgICBmaW5kTW9kdWxlQnlJZChlLnRhcmdldE1vZHVsZUlkKT8uc2hvdyg2MDApO1xuICAgIH0pO1xuICB9LFxuXG4gIGdldFN0eWxlcygpIHtcbiAgICByZXR1cm4gW1wiZm9udC1hd2Vzb21lLmNzc1wiLCBcIk1NTS1Sb3RhcnlOYXZpZ2F0aW9uLmNzc1wiXTtcbiAgfVxufSk7XG5cbmNvbnN0IGZpbmRNb2R1bGVCeUlkID0gKGlkOiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIE1NLmdldE1vZHVsZXMoKS5maW5kKChtb2R1bGUpID0+IG1vZHVsZS5pZGVudGlmaWVyID09PSBpZCk7XG59O1xuIl0sIm5hbWVzIjpbXSwi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
