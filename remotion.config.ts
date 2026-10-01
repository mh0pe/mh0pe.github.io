import { Config } from "@remotion/cli/config";

Config.setCachingEnabled(false);
Config.overrideWebpackConfig((configuration) => ({
  ...configuration,
  resolve: {
    ...configuration.resolve,
    alias: {
      ...configuration.resolve?.alias,
      "@": process.cwd(),
    },
  },
}));
