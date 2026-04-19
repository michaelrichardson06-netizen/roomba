const appJson = require("./app.json");

module.exports = {
  ...appJson.expo,
  extra: {
    webUrl: process.env.REPLIT_EXPO_DEV_DOMAIN
      ? `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`
      : null,
  },
};
