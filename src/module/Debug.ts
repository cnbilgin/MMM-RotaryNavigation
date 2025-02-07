export const debugKeyboadEvents = (module: Module.ModuleProperties<any>) => {
  let lastEnterTimeStamp: number | null = null;
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && lastEnterTimeStamp === null)
      lastEnterTimeStamp = e.timeStamp;
  });
  document.addEventListener("keyup", (e: KeyboardEvent) => {
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
        else module.socketNotificationReceived("ROTARY_SHORT_PRESS", null);

        lastEnterTimeStamp = null;

        module.socketNotificationReceived("ROTARY_PRESS", null);
        break;
    }
  });
};
