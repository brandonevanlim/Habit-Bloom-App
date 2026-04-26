import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.ab44d158fddc4d1494ec1c66c50313d0",
  appName: "Sprout Habits",
  webDir: "dist",
  server: {
    url: "https://ab44d158-fddc-4d14-94ec-1c66c50313d0.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#22c55e",
      sound: "beep.wav",
    },
  },
};

export default config;
