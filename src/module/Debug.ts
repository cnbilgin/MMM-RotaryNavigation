export const debugKeyboadEvents = (module: Module.ModuleProperties<any>) => {
  let lastEnterTimeStamp: number | null = null;
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && lastEnterTimeStamp === null)
      lastEnterTimeStamp = e.timeStamp;
  });
  document.addEventListener("keyup", (e: KeyboardEvent) => {
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
        else module.socketNotificationReceived("ROTARY_SHORT_PRESS", null);

        lastEnterTimeStamp = null;
        break;
    }
  });
};
