const fs = require("fs");
const path = require("path");
const os = require("os");
const inquirer = require("inquirer");

const CONFIG_PATH = path.join(os.homedir(), ".clizinrc.json");

async function loadOrCreateConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    try {
      const config = JSON.parse(raw);
      if (!config.apiKeys) {
        config.apiKeys = {};
      }
      return config;
    } catch (error) {
      console.error(chalk.red("Erro ao ler o arquivo de configuração. Criando um novo."));
    }
  }

  console.log(chalk.yellow("Configuração inicial não encontrada. Vamos configurar o clizin."));

  const { openaiApiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "openaiApiKey",
      message: "Cole sua chave da API da OpenAI (pressione Enter para pular se não for usar OpenAI inicialmente):",
      mask: "*",
    },
  ]);

  const config = { 
    apiKeys: openaiApiKey ? { openai: openaiApiKey } : {} 
  };
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(chalk.green(`Configuração salva em: ${CONFIG_PATH}`))

  return config;
}

module.exports = {
  loadOrCreateConfig,
  CONFIG_PATH,
};
