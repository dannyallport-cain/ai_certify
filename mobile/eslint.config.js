// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  {
    ignores: ['dist/*'],
  },
]);
