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
                    if (lastEnterTimeStamp && e.timeStamp - lastEnterTimeStamp > 500)
                        module.socketNotificationReceived("ROTARY_LONG_PRESS", null);
                    else
                        module.socketNotificationReceived("ROTARY_SHORT_PRESS", null);
                    lastEnterTimeStamp = null;
                    module.socketNotificationReceived("ROTARY_PRESS", null);
                    break;
            }
        });
    };

    class RotaryCircularMenu {
        constructor(module) {
            this.module = module;
            this.eventList = {};
            this.dom = this.createBaseDom();
        }
        show(options) {
            this.options = options;
            this.dom.classList.add("show");
            this._triggerEvent("show", this.options);
        }
        hide() {
            this.dom.classList.remove("show");
            this._triggerEvent("hide", this.options);
        }
        onShow(callback) {
            this._appendEvent("show", callback);
        }
        onHide(callback) {
            this._appendEvent("hide", callback);
        }
        rotaryNotificationReceived(notification) { }
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
        _appendEvent(eventType, callback) {
            this.eventList[eventType] = this.eventList[eventType] || [];
            this.eventList[eventType].push(callback);
        }
        _triggerEvent(eventType, event) {
            if (!this.eventList[eventType] || this.eventList[eventType].length === 0)
                return;
            this.eventList[eventType].forEach((eventCallback) => {
                eventCallback(event);
            });
        }
    }

    const AUTO_HIDE_SECONDS = 1000 * 10;
    class RotaryNavigationMenu extends RotaryCircularMenu {
        constructor(module, actions) {
            super(module);
            this.module = module;
            this.block = false;
            this.autoHideTimeoutId = null;
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
            if (title)
                title.innerHTML = this.getActiveAction().title;
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
            if (menu)
                this.module.setMenu(menu.type, menu);
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

    class RotaryNotificationMenu extends RotaryCircularMenu {
        constructor(module) {
            super(module);
            this.module = module;
            this.infoTimeoutId = undefined;
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
                this.module.sendNotification(event.notification, {
                    target: this.options.target
                });
                this.setInfo(eventName);
            }
            if (event.close)
                this.hide();
        }
        onHide(callback) {
            this._appendEvent("hide", callback);
        }
        onShow(callback) {
            this._appendEvent("show", callback);
        }
        rotaryNotificationReceived(notification) {
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
        menus: {
            navigation: null,
            notification: null
        },
        options: [],
        defaults: {
            actions: []
        },
        selectedIndex: null,
        activeMenu: null,
        init() { },
        start() {
            this.sendSocketNotification("ROTARY_INIT", null);
            this.menus.navigation = new RotaryNavigationMenu(this, this.config.actions);
            this.menus.notification = new RotaryNotificationMenu(this);
            this.menus.notification.onHide((e) => {
                findModuleById(e.target)?.hide(600);
                this.activeMenu = null;
            });
            this.menus.notification.onShow((e) => {
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
    const findModuleById = (id) => {
        return MM.getModules().find((module) => module.identifier === id);
    };

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTU1NLVJvdGFyeU5hdmlnYXRpb24uanMiLCJzb3VyY2VzIjpbInNyYy9tb2R1bGUvRGVidWcudHMiLCJzcmMvbW9kdWxlL1JvdGFyeUNpcmN1bGFyTWVudS50cyIsInNyYy9tb2R1bGUvUm90YXJ5TmF2aWdhdGlvbk1lbnUvUm90YXJ5TmF2aWdhdGlvbk1lbnUudHMiLCJzcmMvbW9kdWxlL1JvdGFyeU5vdGlmaWNhdGlvbk1lbnUvUm90YXJ5Tm90aWZpY2F0aW9uTWVudS50cyIsInNyYy9tb2R1bGUvTW9kdWxlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBkZWJ1Z0tleWJvYWRFdmVudHMgPSAobW9kdWxlOiBNb2R1bGUuTW9kdWxlUHJvcGVydGllczxhbnk+KSA9PiB7XG4gIGxldCBsYXN0RW50ZXJUaW1lU3RhbXA6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiICYmIGxhc3RFbnRlclRpbWVTdGFtcCA9PT0gbnVsbClcbiAgICAgIGxhc3RFbnRlclRpbWVTdGFtcCA9IGUudGltZVN0YW1wO1xuICB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgY2FzZSBcIkFycm93TGVmdFwiOlxuICAgICAgICBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfUFJFVlwiLCBudWxsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiQXJyb3dSaWdodFwiOlxuICAgICAgICBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfTkVYVFwiLCBudWxsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiRW50ZXJcIjpcbiAgICAgICAgaWYgKGxhc3RFbnRlclRpbWVTdGFtcCAmJiBlLnRpbWVTdGFtcCAtIGxhc3RFbnRlclRpbWVTdGFtcCA+IDUwMClcbiAgICAgICAgICBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfTE9OR19QUkVTU1wiLCBudWxsKTtcbiAgICAgICAgZWxzZSBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfU0hPUlRfUFJFU1NcIiwgbnVsbCk7XG5cbiAgICAgICAgbGFzdEVudGVyVGltZVN0YW1wID0gbnVsbDtcblxuICAgICAgICBtb2R1bGUuc29ja2V0Tm90aWZpY2F0aW9uUmVjZWl2ZWQoXCJST1RBUllfUFJFU1NcIiwgbnVsbCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiaW1wb3J0IHsgSVJvdGFyeU1lbnUsIFJvdGFyeU5vdGlmaWNhdGlvbiB9IGZyb20gXCIuL0lSb3RhcnlNZW51XCI7XG50eXBlIFJvdGFyeUNpcmN1bGFyTWVudUV2ZW50ID0gXCJzaG93XCIgfCBcImhpZGVcIjtcbnR5cGUgUm90YXJ5Q2lyY3VsYXJNZW51RXZlbnRDYWxsYmFjayA9IChldmVudD86IGFueSkgPT4gdm9pZDtcblxuZXhwb3J0IGNsYXNzIFJvdGFyeUNpcmN1bGFyTWVudTxUID0gdW5kZWZpbmVkPiBpbXBsZW1lbnRzIElSb3RhcnlNZW51IHtcbiAgb3B0aW9ucz86IFQ7XG4gIGRvbTogSFRNTERpdkVsZW1lbnQ7XG4gIGV2ZW50TGlzdDogUGFydGlhbDxcbiAgICBSZWNvcmQ8Um90YXJ5Q2lyY3VsYXJNZW51RXZlbnQsIFJvdGFyeUNpcmN1bGFyTWVudUV2ZW50Q2FsbGJhY2tbXT5cbiAgPiA9IHt9O1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgbW9kdWxlOiBhbnkpIHtcbiAgICB0aGlzLmRvbSA9IHRoaXMuY3JlYXRlQmFzZURvbSgpO1xuICB9XG5cbiAgc2hvdyhvcHRpb25zPzogVCkge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmRvbS5jbGFzc0xpc3QuYWRkKFwic2hvd1wiKTtcbiAgICB0aGlzLl90cmlnZ2VyRXZlbnQoXCJzaG93XCIsIHRoaXMub3B0aW9ucyk7XG4gIH1cbiAgaGlkZSgpOiB2b2lkIHtcbiAgICB0aGlzLmRvbS5jbGFzc0xpc3QucmVtb3ZlKFwic2hvd1wiKTtcbiAgICB0aGlzLl90cmlnZ2VyRXZlbnQoXCJoaWRlXCIsIHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICBvblNob3coY2FsbGJhY2s6IFJvdGFyeUNpcmN1bGFyTWVudUV2ZW50Q2FsbGJhY2spIHtcbiAgICB0aGlzLl9hcHBlbmRFdmVudChcInNob3dcIiwgY2FsbGJhY2spO1xuICB9XG4gIG9uSGlkZShjYWxsYmFjazogUm90YXJ5Q2lyY3VsYXJNZW51RXZlbnRDYWxsYmFjaykge1xuICAgIHRoaXMuX2FwcGVuZEV2ZW50KFwiaGlkZVwiLCBjYWxsYmFjayk7XG4gIH1cbiAgcm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uOiBSb3RhcnlOb3RpZmljYXRpb24pOiB2b2lkIHt9XG5cbiAgY3JlYXRlQmFzZURvbSgpIHtcbiAgICBjb25zdCBkb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGRvbS5jbGFzc05hbWUgPSBcInJuLW1lbnVcIjtcblxuICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB0aXRsZS5jbGFzc05hbWUgPSBcInJuLW1lbnUtdGl0bGVcIjtcblxuICAgIGRvbS5hcHBlbmQodGl0bGUpO1xuXG4gICAgcmV0dXJuIGRvbTtcbiAgfVxuXG4gIGdldERvbSgpIHtcbiAgICByZXR1cm4gdGhpcy5kb207XG4gIH1cblxuICBfYXBwZW5kRXZlbnQoXG4gICAgZXZlbnRUeXBlOiBSb3RhcnlDaXJjdWxhck1lbnVFdmVudCxcbiAgICBjYWxsYmFjazogUm90YXJ5Q2lyY3VsYXJNZW51RXZlbnRDYWxsYmFja1xuICApIHtcbiAgICB0aGlzLmV2ZW50TGlzdFtldmVudFR5cGVdID0gdGhpcy5ldmVudExpc3RbZXZlbnRUeXBlXSB8fCBbXTtcblxuICAgIHRoaXMuZXZlbnRMaXN0W2V2ZW50VHlwZV0ucHVzaChjYWxsYmFjayk7XG4gIH1cblxuICBfdHJpZ2dlckV2ZW50KGV2ZW50VHlwZTogUm90YXJ5Q2lyY3VsYXJNZW51RXZlbnQsIGV2ZW50PzogVCkge1xuICAgIGlmICghdGhpcy5ldmVudExpc3RbZXZlbnRUeXBlXSB8fCB0aGlzLmV2ZW50TGlzdFtldmVudFR5cGVdLmxlbmd0aCA9PT0gMClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuZXZlbnRMaXN0W2V2ZW50VHlwZV0uZm9yRWFjaCgoZXZlbnRDYWxsYmFjaykgPT4ge1xuICAgICAgZXZlbnRDYWxsYmFjayhldmVudCk7XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IEFjdGlvbiB9IGZyb20gXCIuLi9Nb2R1bGVcIjtcbmltcG9ydCB7IFJvdGFyeU5vdGlmaWNhdGlvbiB9IGZyb20gXCIuLi9JUm90YXJ5TWVudVwiO1xuaW1wb3J0IHsgUm90YXJ5Q2lyY3VsYXJNZW51IH0gZnJvbSBcIi4uL1JvdGFyeUNpcmN1bGFyTWVudVwiO1xuXG50eXBlIFJvdGFyeU9wdGlvbiA9IHtcbiAgaWNvbjogc3RyaW5nO1xuICBhY3Rpb25JbmRleDogbnVtYmVyO1xuICB0aXRsZTogc3RyaW5nO1xufTtcblxuY29uc3QgQVVUT19ISURFX1NFQ09ORFMgPSAxMDAwICogMTA7XG5leHBvcnQgY2xhc3MgUm90YXJ5TmF2aWdhdGlvbk1lbnUgZXh0ZW5kcyBSb3RhcnlDaXJjdWxhck1lbnUge1xuICBhY3RpdmVJbmRleDogbnVtYmVyO1xuICBhY3Rpb25zOiBBY3Rpb25bXTtcbiAgYmxvY2sgPSBmYWxzZTtcbiAgYXV0b0hpZGVUaW1lb3V0SWQ6IGFueSA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJvdGVjdGVkIG1vZHVsZTogYW55LFxuICAgIGFjdGlvbnM6IGFueVtdXG4gICkge1xuICAgIHN1cGVyKG1vZHVsZSk7XG5cbiAgICB0aGlzLmFjdGlvbnMgPSBhY3Rpb25zO1xuICAgIHRoaXMuYWN0aXZlSW5kZXggPSAwO1xuXG4gICAgdGhpcy5kb20gPSB0aGlzLmNyZWF0ZURvbSgpO1xuICB9XG5cbiAgY3JlYXRlRG9tKCkge1xuICAgIGNvbnN0IGRvbSA9IHRoaXMuZG9tO1xuICAgIGRvbS5jbGFzc0xpc3QuYWRkKFwicm4tbmF2aWdhdGlvblwiKTtcbiAgICBkb20uYXBwZW5kKHRoaXMuZ2V0T3B0aW9uc0NvbnRhaW5lcigpKTtcblxuICAgIGNvbnN0IGFjdGl2ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgYWN0aXZlLmNsYXNzTmFtZSA9IFwicm4tbmF2LWFjdGl2ZVwiO1xuICAgIGRvbS5hcHBlbmQoYWN0aXZlKTtcblxuICAgIGNvbnN0IHRpdGxlID0gZG9tLnF1ZXJ5U2VsZWN0b3IoXCIucm4tbWVudS10aXRsZVwiKTtcbiAgICBpZiAodGl0bGUpIHRpdGxlLmlubmVySFRNTCA9IHRoaXMuZ2V0QWN0aXZlQWN0aW9uKCkudGl0bGU7XG5cbiAgICByZXR1cm4gZG9tO1xuICB9XG5cbiAgZ2V0QWN0aXZlQWN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmFjdGlvbnNbdGhpcy5hY3RpdmVJbmRleF07XG4gIH1cblxuICBzaG93KCkge1xuICAgIHN1cGVyLnNob3coKTtcbiAgICB0aGlzLmF1dG9IaWRlVGltZW91dCgpO1xuICB9XG5cbiAgaGlkZSgpIHtcbiAgICBzdXBlci5oaWRlKCk7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuYXV0b0hpZGVUaW1lb3V0SWQpO1xuICB9XG5cbiAgZ2V0T3B0aW9uc0NvbnRhaW5lcih0YXJnZXRJbmRleD86IG51bWJlcikge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgY29udGFpbmVyLmNsYXNzTmFtZSA9IFwicm4tb3B0aW9ucy1jb250YWluZXJcIjtcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBjcmVhdGVFbmRsZXNzT3B0aW9ucyhcbiAgICAgIHRhcmdldEluZGV4ICE9IHVuZGVmaW5lZCA/IHRhcmdldEluZGV4IDogdGhpcy5hY3RpdmVJbmRleCxcbiAgICAgIHRoaXMuYWN0aW9uc1xuICAgICk7XG5cbiAgICBvcHRpb25zLmZvckVhY2goKG9wdGlvbiwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnRhaW5lci5hcHBlbmQoY3JlYXRlT3B0aW9uRWxlbWVudChvcHRpb24sIGluZGV4KSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9XG5cbiAgbW92ZShkaXJlY3Rpb246IFwibmV4dFwiIHwgXCJwcmV2XCIpIHtcbiAgICBpZiAodGhpcy5ibG9jaykgcmV0dXJuO1xuXG4gICAgdGhpcy5ibG9jayA9IHRydWU7XG5cbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmRvbS5xdWVyeVNlbGVjdG9yKFwiLnJuLW9wdGlvbnMtY29udGFpbmVyXCIpO1xuICAgIGlmICghY29udGFpbmVyKSByZXR1cm47XG5cbiAgICBsZXQgbmV4dEluZGV4ID0gdGhpcy5hY3RpdmVJbmRleCArIChkaXJlY3Rpb24gPT09IFwibmV4dFwiID8gMSA6IC0xKTtcbiAgICBpZiAobmV4dEluZGV4ID09PSB0aGlzLmFjdGlvbnMubGVuZ3RoKSBuZXh0SW5kZXggPSAwO1xuICAgIGVsc2UgaWYgKG5leHRJbmRleCA8IDApIG5leHRJbmRleCA9IHRoaXMuYWN0aW9ucy5sZW5ndGggLSAxO1xuXG4gICAgY29uc3QgbmV3Q29udGFpbmVyID0gdGhpcy5nZXRPcHRpb25zQ29udGFpbmVyKG5leHRJbmRleCk7XG4gICAgdGhpcy5hY3RpdmVJbmRleCA9IG5leHRJbmRleDtcblxuICAgIGNvbnN0IG5hdlRpdGxlID0gdGhpcy5kb20ucXVlcnlTZWxlY3RvcihcIi5ybi1tZW51LXRpdGxlXCIpO1xuICAgIG5hdlRpdGxlIS5pbm5lckhUTUwgPSB0aGlzLmdldEFjdGl2ZUFjdGlvbigpLnRpdGxlO1xuXG4gICAgY29uc3QgZGlzYWJsZUJsb2NrID0gKCkgPT4gKHRoaXMuYmxvY2sgPSBmYWxzZSk7XG5cbiAgICAoY29udGFpbmVyIGFzIEhUTUxFbGVtZW50KS5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJ0cmFuc2l0aW9uZW5kXCIsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIGNvbnRhaW5lci5wYXJlbnRFbGVtZW50Py5hcHBlbmQobmV3Q29udGFpbmVyKTtcbiAgICAgICAgY29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICBkaXNhYmxlQmxvY2soKTtcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG9uY2U6IHRydWVcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgZGVncmVlID0gUk9UQVRJT05fREVHUkVFICogKGRpcmVjdGlvbiA9PT0gXCJuZXh0XCIgPyAtMSA6IDEpO1xuICAgIChjb250YWluZXIgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnRyYW5zZm9ybSA9IGByb3RhdGUoJHtkZWdyZWV9ZGVnKWA7XG4gIH1cblxuICByb3RhcnlOb3RpZmljYXRpb25SZWNlaXZlZChub3RpZmljYXRpb246IFJvdGFyeU5vdGlmaWNhdGlvbik6IHZvaWQge1xuICAgIHRoaXMuYXV0b0hpZGVUaW1lb3V0KCk7XG4gICAgc3dpdGNoIChub3RpZmljYXRpb24pIHtcbiAgICAgIGNhc2UgXCJST1RBUllfUFJFVlwiOlxuICAgICAgICB0aGlzLm1vdmUoXCJwcmV2XCIpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIlJPVEFSWV9ORVhUXCI6XG4gICAgICAgIHRoaXMubW92ZShcIm5leHRcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1BSRVNTXCI6XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmF1dG9IaWRlVGltZW91dElkKTtcbiAgICAgICAgdGhpcy5vcGVuTWVudSgpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIGF1dG9IaWRlVGltZW91dCgpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5hdXRvSGlkZVRpbWVvdXRJZCk7XG5cbiAgICB0aGlzLmF1dG9IaWRlVGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1vZHVsZS5zZXRNZW51KG51bGwpO1xuICAgIH0sIEFVVE9fSElERV9TRUNPTkRTKTtcbiAgfVxuXG4gIG9wZW5NZW51KCkge1xuICAgIGNvbnN0IG1lbnUgPSB0aGlzLmdldEFjdGl2ZUFjdGlvbigpLm1lbnU7XG4gICAgaWYgKG1lbnUpIHRoaXMubW9kdWxlLnNldE1lbnUobWVudS50eXBlLCBtZW51KTtcbiAgfVxufVxuXG5jb25zdCBjcmVhdGVSb3RhcnlPcHRpb24gPSAoaW5kZXg6IG51bWJlciwgYWN0aW9uOiBBY3Rpb24pID0+IHtcbiAgcmV0dXJuIHtcbiAgICBpY29uOiBhY3Rpb24uaWNvbixcbiAgICBhY3Rpb25JbmRleDogaW5kZXgsXG4gICAgdGl0bGU6IGFjdGlvbi50aXRsZVxuICB9O1xufTtcblxuY29uc3QgVklTSUJMRV9PUFRJT05fTEVOR1RIID0gNTtcbmNvbnN0IFJPVEFUSU9OX0RFR1JFRSA9IDM3O1xuY29uc3QgZ2V0Um90YXRlVmFsdWVGb3JJbmRleCA9IChpOiBudW1iZXIpID0+IHtcbiAgY29uc3QgY2VudGVySW5kZXggPSBNYXRoLmZsb29yKDcgLyAyKTtcblxuICByZXR1cm4gUk9UQVRJT05fREVHUkVFICogLTEgKiAoY2VudGVySW5kZXggLSBpKTtcbn07XG5cbmNvbnN0IGNyZWF0ZU9wdGlvbkVsZW1lbnQgPSAocm90YXJ5T3B0aW9uOiBSb3RhcnlPcHRpb24sIGluZGV4OiBudW1iZXIpID0+IHtcbiAgY29uc3Qgb3B0aW9uRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIG9wdGlvbkVsZW1lbnQuY2xhc3NOYW1lID0gXCJybi1vcHRpb25cIjtcblxuICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlcIik7XG4gIGljb24uY2xhc3NOYW1lID0gYHJuLWljb24gZmEtc29saWQgZmEtJHtyb3RhcnlPcHRpb24uaWNvbn1gO1xuXG4gIG9wdGlvbkVsZW1lbnQuYXBwZW5kKGljb24pO1xuXG4gIGNvbnN0IGRlZ3JlZSA9IGdldFJvdGF0ZVZhbHVlRm9ySW5kZXgoaW5kZXgpO1xuICBvcHRpb25FbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFwiLS1kZWdyZWVcIiwgYCR7ZGVncmVlfWRlZ2ApO1xuXG4gIHJldHVybiBvcHRpb25FbGVtZW50O1xufTtcblxuY29uc3QgY3JlYXRlRW5kbGVzc09wdGlvbnMgPSAoYWN0aXZlSW5kZXg6IG51bWJlciwgYWN0aW9uczogQWN0aW9uW10pID0+IHtcbiAgY29uc3QgZmlyc3RGb3VyID0gW10sXG4gICAgbGFzdFRocmVlID0gW107XG4gIGxldCBpID0gYWN0aXZlSW5kZXggJSBhY3Rpb25zLmxlbmd0aDtcbiAgd2hpbGUgKGZpcnN0Rm91ci5sZW5ndGggPCA0IHx8IGxhc3RUaHJlZS5sZW5ndGggPCAzKSB7XG4gICAgaWYgKGZpcnN0Rm91ci5sZW5ndGggPCA0KSBmaXJzdEZvdXIucHVzaChjcmVhdGVSb3RhcnlPcHRpb24oaSwgYWN0aW9uc1tpXSkpO1xuICAgIGlmIChsYXN0VGhyZWUubGVuZ3RoIDwgMykge1xuICAgICAgLy8gY29uc3QgbGFzdEluZGV4ID0gYWN0aW9ucy5sZW5ndGggLSAxIC0gaTtcbiAgICAgIGNvbnN0IGxhc3RJbmRleCA9XG4gICAgICAgIChhY3RpdmVJbmRleCAtIChpIC0gYWN0aXZlSW5kZXggKyAxKSArIGFjdGlvbnMubGVuZ3RoKSAlIGFjdGlvbnMubGVuZ3RoO1xuICAgICAgbGFzdFRocmVlLnB1c2goY3JlYXRlUm90YXJ5T3B0aW9uKGxhc3RJbmRleCwgYWN0aW9uc1tsYXN0SW5kZXhdKSk7XG4gICAgfVxuXG4gICAgaSA9IChpICsgMSkgJSBhY3Rpb25zLmxlbmd0aDtcbiAgfVxuXG4gIHJldHVybiBbLi4ubGFzdFRocmVlLnJldmVyc2UoKSwgLi4uZmlyc3RGb3VyXTtcbn07XG4vLyBmdW5jdGlvbiBnZXRSb3RhdGVNdWx0aXBsaWVyRm9ySW5kZXgoaTogbnVtYmVyKSB7XG4vLyAgIGNvbnN0IG9wdGlvbkxlbmd0aCA9IDU7XG4vLyAgIGNvbnN0IHJvdGF0aW9uID0gKDE4MCAvIChvcHRpb25MZW5ndGggLSAxKSkgKiAoaSAtIDEpIC0gOTA7XG5cbi8vICAgY29uc3Qgdmlld1BvcnRGaXggPVxuLy8gICAgICg0MCAvIG9wdGlvbkxlbmd0aCkgKiAoTWF0aC5mbG9vcihvcHRpb25MZW5ndGggLyAyKSAtIChpIC0gMSkpO1xuXG4vLyAgIHJldHVybiByb3RhdGlvbiArIHZpZXdQb3J0Rml4O1xuLy8gfVxuIiwiaW1wb3J0IHsgUm90YXJ5Tm90aWZpY2F0aW9uIH0gZnJvbSBcIi4uL0lSb3RhcnlNZW51XCI7XG5pbXBvcnQgeyBSb3RhcnlDaXJjdWxhck1lbnUgfSBmcm9tIFwiLi4vUm90YXJ5Q2lyY3VsYXJNZW51XCI7XG5cbnR5cGUgTm90aWZpY2F0aW9uRXZlbnQgPSBcIm5leHRcIiB8IFwicHJldlwiIHwgXCJzaG9ydFByZXNzXCIgfCBcImxvbmdQcmVzc1wiIHwgXCJwcmVzc1wiO1xudHlwZSBOb3RpZmljYXRpb25FdmVudE9wdGlvbiA9IHtcbiAgbm90aWZpY2F0aW9uPzogc3RyaW5nO1xuICBjbG9zZT86IGJvb2xlYW47XG59O1xudHlwZSBOb3RpZmljYXRpb25NZW51T3B0aW9ucyA9IHtcbiAgZXZlbnRzOiBSZWNvcmQ8Tm90aWZpY2F0aW9uRXZlbnQsIE5vdGlmaWNhdGlvbkV2ZW50T3B0aW9uPjtcbiAgdGFyZ2V0OiBzdHJpbmc7XG59O1xuXG5leHBvcnQgdHlwZSBTaG93SGlkZUV2ZW50ID0ge1xuICB0YXJnZXQ6IHN0cmluZztcbn07XG5cbmV4cG9ydCBjbGFzcyBSb3RhcnlOb3RpZmljYXRpb25NZW51IGV4dGVuZHMgUm90YXJ5Q2lyY3VsYXJNZW51PE5vdGlmaWNhdGlvbk1lbnVPcHRpb25zPiB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBtb2R1bGU6IGFueSkge1xuICAgIHN1cGVyKG1vZHVsZSk7XG5cbiAgICB0aGlzLmRvbSA9IHRoaXMuY3JlYXRlRG9tKCk7XG4gIH1cblxuICBjcmVhdGVEb20oKSB7XG4gICAgY29uc3QgZG9tID0gdGhpcy5kb207XG4gICAgZG9tLmNsYXNzTGlzdC5hZGQoXCJybi1ub3RpZmljYXRpb24tbWVudVwiKTtcblxuICAgIHJldHVybiBkb207XG4gIH1cblxuICBoYW5kbGVOb3RpZmljYXRpb24oZXZlbnROYW1lOiBOb3RpZmljYXRpb25FdmVudCkge1xuICAgIGlmICghdGhpcy5vcHRpb25zIHx8ICEoZXZlbnROYW1lIGluIHRoaXMub3B0aW9ucy5ldmVudHMpKSByZXR1cm47XG5cbiAgICBjb25zdCBldmVudCA9IHRoaXMub3B0aW9ucy5ldmVudHNbZXZlbnROYW1lXTtcbiAgICBpZiAoZXZlbnQubm90aWZpY2F0aW9uKSB7XG4gICAgICB0aGlzLm1vZHVsZS5zZW5kTm90aWZpY2F0aW9uKGV2ZW50Lm5vdGlmaWNhdGlvbiwge1xuICAgICAgICB0YXJnZXQ6IHRoaXMub3B0aW9ucy50YXJnZXRcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNldEluZm8oZXZlbnROYW1lKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuY2xvc2UpIHRoaXMuaGlkZSgpO1xuICB9XG5cbiAgb25IaWRlKGNhbGxiYWNrOiAoZXZlbnQ6IFNob3dIaWRlRXZlbnQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9hcHBlbmRFdmVudChcImhpZGVcIiwgY2FsbGJhY2spO1xuICB9XG5cbiAgb25TaG93KGNhbGxiYWNrOiAoZXZlbnQ6IFNob3dIaWRlRXZlbnQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLl9hcHBlbmRFdmVudChcInNob3dcIiwgY2FsbGJhY2spO1xuICB9XG5cbiAgcm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uOiBSb3RhcnlOb3RpZmljYXRpb24pOiB2b2lkIHtcbiAgICBzd2l0Y2ggKG5vdGlmaWNhdGlvbikge1xuICAgICAgY2FzZSBcIlJPVEFSWV9QUkVWXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwibmV4dFwiKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJST1RBUllfTkVYVFwiOlxuICAgICAgICB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbihcInByZXZcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1BSRVNTXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwicHJlc3NcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX0xPTkdfUFJFU1NcIjpcbiAgICAgICAgdGhpcy5oYW5kbGVOb3RpZmljYXRpb24oXCJsb25nUHJlc3NcIik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiUk9UQVJZX1NIT1JUX1BSRVNTXCI6XG4gICAgICAgIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9uKFwic2hvcnRQcmVzc1wiKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBpbmZvVGltZW91dElkOiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHNldEluZm8odGV4dDogc3RyaW5nKSB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLmRvbS5xdWVyeVNlbGVjdG9yKFwiLnJuLW1lbnUtdGl0bGVcIik7XG4gICAgaWYgKCF0aXRsZSkgcmV0dXJuO1xuXG4gICAgY29uc3QgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgIHRpdGxlLmlubmVySFRNTCA9IFwiXCI7XG4gICAgICB0aXRsZS5jbGFzc0xpc3QucmVtb3ZlKFwicm4tbm90aWZ5LXNsb3dIaWRlXCIpO1xuICAgIH07XG5cbiAgICBjbGVhbnVwKCk7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuaW5mb1RpbWVvdXRJZCk7XG5cbiAgICAvL3JlLXRyaWdnZXIgYW5pbWF0aW9uXG4gICAgdGl0bGUuc2Nyb2xsQnkoMCwgMCk7XG4gICAgdGl0bGUuY2xhc3NMaXN0LmFkZChcInJuLW5vdGlmeS1zbG93SGlkZVwiKTtcbiAgICB0aXRsZS5pbm5lckhUTUwgPSB0ZXh0O1xuXG4gICAgdGhpcy5pbmZvVGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfSwgMTUwMCk7XG4gIH1cbn1cbiIsImltcG9ydCB7IGRlYnVnS2V5Ym9hZEV2ZW50cyB9IGZyb20gXCIuL0RlYnVnXCI7XG5pbXBvcnQgeyBJUm90YXJ5TWVudSB9IGZyb20gXCIuL0lSb3RhcnlNZW51XCI7XG5pbXBvcnQgeyBSb3RhcnlOYXZpZ2F0aW9uTWVudSB9IGZyb20gXCIuL1JvdGFyeU5hdmlnYXRpb25NZW51L1JvdGFyeU5hdmlnYXRpb25NZW51XCI7XG5pbXBvcnQge1xuICBSb3RhcnlOb3RpZmljYXRpb25NZW51LFxuICBTaG93SGlkZUV2ZW50XG59IGZyb20gXCIuL1JvdGFyeU5vdGlmaWNhdGlvbk1lbnUvUm90YXJ5Tm90aWZpY2F0aW9uTWVudVwiO1xuXG5leHBvcnQgdHlwZSBBY3Rpb24gPSB7XG4gIGljb246IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgbWVudT86IHsgdHlwZTogXCJub3RpZmljYXRpb25cIiB8IFwibmF2aWdhdGlvblwiIH07XG59O1xuXG50eXBlIE1vZHVsZUNvbmZpZ3MgPSB7XG4gIGFjdGlvbnM6IEFjdGlvbltdO1xufTtcblxuTW9kdWxlLnJlZ2lzdGVyPE1vZHVsZUNvbmZpZ3M+KFwiTU1NLVJvdGFyeU5hdmlnYXRpb25cIiwge1xuICBtZW51czoge1xuICAgIG5hdmlnYXRpb246IG51bGwsXG4gICAgbm90aWZpY2F0aW9uOiBudWxsXG4gIH0sXG4gIG9wdGlvbnM6IFtdIGFzIHN0cmluZ1tdLFxuICBkZWZhdWx0czoge1xuICAgIGFjdGlvbnM6IFtdXG4gIH0sXG4gIHNlbGVjdGVkSW5kZXg6IG51bGwgYXMgbnVsbCB8IG51bWJlcixcbiAgYWN0aXZlTWVudTogbnVsbCBhcyBudWxsIHwgSVJvdGFyeU1lbnUsXG4gIGluaXQoKSB7fSxcbiAgc3RhcnQoKSB7XG4gICAgdGhpcy5zZW5kU29ja2V0Tm90aWZpY2F0aW9uKFwiUk9UQVJZX0lOSVRcIiwgbnVsbCk7XG4gICAgdGhpcy5tZW51cy5uYXZpZ2F0aW9uID0gbmV3IFJvdGFyeU5hdmlnYXRpb25NZW51KHRoaXMsIHRoaXMuY29uZmlnLmFjdGlvbnMpO1xuICAgIHRoaXMubWVudXMubm90aWZpY2F0aW9uID0gbmV3IFJvdGFyeU5vdGlmaWNhdGlvbk1lbnUodGhpcyk7XG5cbiAgICB0aGlzLm1lbnVzLm5vdGlmaWNhdGlvbi5vbkhpZGUoKGU6IFNob3dIaWRlRXZlbnQpID0+IHtcbiAgICAgIGZpbmRNb2R1bGVCeUlkKGUudGFyZ2V0KT8uaGlkZSg2MDApO1xuICAgICAgdGhpcy5hY3RpdmVNZW51ID0gbnVsbDtcbiAgICB9KTtcblxuICAgIHRoaXMubWVudXMubm90aWZpY2F0aW9uLm9uU2hvdygoZTogU2hvd0hpZGVFdmVudCkgPT4ge1xuICAgICAgZmluZE1vZHVsZUJ5SWQoZS50YXJnZXQpPy5zaG93KDYwMCk7XG4gICAgfSk7XG5cbiAgICBkZWJ1Z0tleWJvYWRFdmVudHModGhpcyk7XG4gIH0sXG4gIGdldERvbSgpIHtcbiAgICBjb25zdCB3cmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB3cmFwcGVyLmNsYXNzTmFtZSA9IFwicm4tbWFpblwiO1xuICAgIHdyYXBwZXIuaWQgPSBgcm5fJHt0aGlzLmlkZW50aWZpZXJ9YDtcblxuICAgIGNvbnN0IHRvZ2dsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgdG9nZ2xlLmNsYXNzTmFtZSA9IFwicm4tdG9nZ2xlXCI7XG4gICAgY29uc3QgdG9nZ2xlSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpXCIpO1xuICAgIHRvZ2dsZUljb24uY2xhc3NOYW1lID0gXCJmYS1zb2xpZCBmYS1iYXJzXCI7XG4gICAgdG9nZ2xlLmFwcGVuZCh0b2dnbGVJY29uKTtcblxuICAgIHdyYXBwZXIuYXBwZW5kKHRvZ2dsZSk7XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLm1lbnVzKS5mb3JFYWNoKChtZW51S2V5KSA9PiB7XG4gICAgICB3cmFwcGVyLmFwcGVuZCh0aGlzLm1lbnVzW21lbnVLZXldLmdldERvbSgpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB3cmFwcGVyO1xuICB9LFxuXG4gIHNldE1lbnUodGFyZ2V0OiBzdHJpbmcgfCBudWxsLCBzaG93T3B0aW9ucz86IGFueSkge1xuICAgIGlmICh0aGlzLmFjdGl2ZU1lbnUgIT0gbnVsbCkgKHRoaXMuYWN0aXZlTWVudSBhcyBJUm90YXJ5TWVudSkuaGlkZSgpO1xuXG4gICAgaWYgKHRhcmdldCAhPSBudWxsICYmIHRhcmdldCBpbiB0aGlzLm1lbnVzKSB7XG4gICAgICBjb25zdCBtZW51ID0gdGhpcy5tZW51c1t0YXJnZXRdO1xuXG4gICAgICBtZW51LnNob3coc2hvd09wdGlvbnMpO1xuICAgICAgdGhpcy5hY3RpdmVNZW51ID0gbWVudTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hY3RpdmVNZW51ID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLnJlbmRlcigpO1xuICB9LFxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBtYWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHJuXyR7dGhpcy5pZGVudGlmaWVyfWApO1xuICAgIGlmICghbWFpbikgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYWN0aXZlTWVudSkgbWFpbi5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpO1xuICAgIGVsc2UgbWFpbi5jbGFzc0xpc3QucmVtb3ZlKFwiYWN0aXZlXCIpO1xuICB9LFxuXG4gIHNvY2tldE5vdGlmaWNhdGlvblJlY2VpdmVkKG5vdGlmaWNhdGlvbikge1xuICAgIGlmICh0aGlzLmFjdGl2ZU1lbnUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5zZXRNZW51KFwibmF2aWdhdGlvblwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmFjdGl2ZU1lbnUucm90YXJ5Tm90aWZpY2F0aW9uUmVjZWl2ZWQobm90aWZpY2F0aW9uKTtcbiAgfSxcblxuICBnZXRTdHlsZXMoKSB7XG4gICAgcmV0dXJuIFtcImZvbnQtYXdlc29tZS5jc3NcIiwgXCJNTU0tUm90YXJ5TmF2aWdhdGlvbi5jc3NcIl07XG4gIH1cbn0pO1xuXG5jb25zdCBmaW5kTW9kdWxlQnlJZCA9IChpZDogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBNTS5nZXRNb2R1bGVzKCkuZmluZCgobW9kdWxlKSA9PiBtb2R1bGUuaWRlbnRpZmllciA9PT0gaWQpO1xufTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7SUFBTyxNQUFNLGtCQUFrQixHQUFHLENBQUMsTUFBb0MsS0FBSTtRQUN6RSxJQUFJLGtCQUFrQixHQUFrQixJQUFJO1FBQzVDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFnQixLQUFJO1lBQ3hELElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxPQUFPLElBQUksa0JBQWtCLEtBQUssSUFBSTtJQUNsRCxZQUFBLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxTQUFTO0lBQ3BDLEtBQUMsQ0FBQztRQUNGLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFnQixLQUFJO0lBQ3RELFFBQUEsUUFBUSxDQUFDLENBQUMsR0FBRztJQUNYLFlBQUEsS0FBSyxXQUFXO0lBQ2QsZ0JBQUEsTUFBTSxDQUFDLDBCQUEwQixDQUFDLGFBQWEsRUFBRSxJQUFJLENB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
