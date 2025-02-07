# MMM-RotaryNavigation

Master rotary navigator module. Its pass events to other modules with build in systems.

## Last Note
DONE: RotaryNavigator automatically closes itselfs after 5 seconds. But only closes in DOM it should set Module's default menu to null.
Create full event passer for HomeAssistant

## History
- Listen rotary from node_helper.
- Seperate RotaryNavigator. Its default menu that going to trigger other menus.
- Open close animation for RotaryNavigator.
- Create RotaryCircularMenu to make easy to create circular menu.


## TO-DO
- Create a RotaryMenu base. It should:
    - Open close other RotaryMenus
    - Listen rotary notifications
    - send notification to other menus

- Prev-Next Menu: It should pass next, prev, click events to other modules.
- Range Menu: Similar like input type range. It should create a progressbar that changes values with sending events. (Monitor brightness controll)