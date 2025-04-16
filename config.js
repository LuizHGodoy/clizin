const fs = require("fs");
const path = require("path");
const os = require("os");
const inquirer = require("inquirer");

const CONFIG_PATH = path.join(os.homedir(), ".clizinrc.json");

async function loadOrCreateConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  }

  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Escolha o provedor de IA:",
      choices: ["openai"],
    },
  ]);

  const modelsByProvider = {
    openai: ["gpt-3.5-turbo-0125", "gpt-4-turbo", "gpt-4"],
  };

  const { model } = await inquirer.prompt([
    {
      type: "list",
      name: "model",
      message: "Escolha o modelo:",
      choices: modelsByProvider[provider],
    },
  ]);

  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "Cole sua chave da API:",
      mask: "*",
    },
  ]);

  const config = { provider, model, apiKey };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  return config;
}

module.exports = {
  loadOrCreateConfig,
};
