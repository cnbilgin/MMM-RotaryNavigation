import { NodeHelperModule } from "node_helper";
import { Rotary, RotaryPins } from "./gpio/Rotary";

class RotaryNodeHelper {
  rotary: Rotary | null = null;
  nodeHelper: NodeHelperModule;
  rotaryPins: RotaryPins;
  constructor(nodeHelper: NodeHelperModule, rotaryPins: RotaryPins) {
    this.nodeHelper = nodeHelper;
    this.rotaryPins = rotaryPins;
  }

  socketNotificationReceived(notification: string) {
    if (notification === "ROTARY_INIT") this._init();
  }

  _init() {
    if (this.rotary) return;

    this.rotary = new Rotary(this.rotaryPins);

    this.rotary.onTurnLeft(() => {
      this.nodeHelper.sendSocketNotification("ROTARY_PREV", null);
    });

    this.rotary.onTurnRight(() => {
      this.nodeHelper.sendSocketNotification("ROTARY_NEXT", null);
    });

    this.rotary.onPress(() => {
      this.nodeHelper.sendSocketNotification("ROTARY_PRESS", null);
    });

    this.rotary.onShortPress(() => {
      this.nodeHelper.sendSocketNotification("ROTARY_SHORT_PRESS", null);
    });

    this.rotary.onLongPress(() => {
      this.nodeHelper.sendSocketNotification("ROTARY_LONG_PRESS", null);
    });
  }
}

export default RotaryNodeHelper;
