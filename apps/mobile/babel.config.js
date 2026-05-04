// Babel config for the Expo mobile app.
// `babel-preset-expo` handles RN + Hermes correctly.
// `react-native-reanimated/plugin` MUST be listed last (Reanimated docs).

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
