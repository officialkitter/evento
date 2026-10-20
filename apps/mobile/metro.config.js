const { getDefaultConfig } = require('expo/metro-config');

// Expo SDK 52 configures npm-workspace monorepos automatically.
module.exports = getDefaultConfig(__dirname);
