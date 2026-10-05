module.exports = ({ config }) => {
  const isDevelopmentBuild = process.env.APP_ENV === "development";
  const plugins = (config.plugins || []).filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== "expo-build-properties";
  });

  return {
    ...config,
    plugins: [
      ...plugins,
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: isDevelopmentBuild,
          },
        },
      ],
      "expo-web-browser"
    ],
  };
};
