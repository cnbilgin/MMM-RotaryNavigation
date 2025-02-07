import * as NodeHelper from "node_helper";
import RotaryNodeHelper from "./RotaryNodeHelper";

export default NodeHelper.create({
  rotaryHelper: RotaryNodeHelper,

  start() {
    console.log("NodeHelper started Rotary Started");

    this.rotaryHelper = new RotaryNodeHelper(this, {
      SW: 27,
      CLK: 17,
      DT: 18
    });
  },

  async socketNotificationReceived(notification, payload) {
    console.log("Rotary start notification recived", notification);
    this.rotaryHelper.socketNotificationReceived(notification);
  }
});
