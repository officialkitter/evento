module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo auto-enables the Reanimated plugin when it is installed.
  return { presets: ['babel-preset-expo'] };
};
