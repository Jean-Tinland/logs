const { loadEnvConfig } = require("@next/env");

const projectDir = process.cwd();
loadEnvConfig(projectDir);

module.exports = {
  apps: [
    {
      name: "logs",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
