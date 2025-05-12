#!/usr/bin/env node
const { Command } = require("commander");
const simpleGit = require("simple-git");
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Added Gemini
const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");

const { loadOrCreateConfig } = require("./config");
const { CONFIG_PATH } = require("./config"); // Import CONFIG_PATH if needed for error messages

const git = simpleGit();
const program = new Command();

async function hasStagedChanges() {
  const status = await git.status();
  return status.staged.length > 0;
}

async function getGitDiff() {
  const diff = await git.diff(["--cached"]);
  return diff || "";
}

async function generateCommitMessage(diffText, language, provider, model, apiKey) {
  const prompts = {
    pt: `
Você é um gerador de mensagens de commit.
Baseado no seguinte diff de código, gere um título de commit no padrão "fix: ..." ou "feat: ...", e uma lista de bullet points curtos explicando as mudanças.

Diff:
${diffText}

Responda apenas com o commit no formato:

<tipo>: <título>

- ponto 1
- ponto 2
...
`,
    en: `
You are a commit message generator.
Based on the following code diff, generate a commit title in the pattern "fix: ..." or "feat: ...", and a list of short bullet points explaining the changes.

Diff:
${diffText}

Respond only with the commit in the format:

<type>: <title>

- point 1
- point 2
...
`
  };

  const prompt = prompts[language];

  try {
    if (provider === "openai") {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        temperature: 0.4,
      });
      return completion.choices[0].message.content.trim();
    } else if (provider === "google") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model: model });
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text.trim();
    } else {
      throw new Error(`Provedor "${provider}" não suportado.`);
    }
  } catch (error) {
    console.error(chalk.red(`\nErro ao gerar commit com ${provider} (${model}):`));
    console.error(chalk.red(error.message));
    if (error.response && error.response.data) {
      console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
    } else if (error.message.includes("API key")) {
       console.error(chalk.yellow(`Verifique se a API key para ${provider} está correta em ${CONFIG_PATH}`));
    } else {
       console.error(chalk.yellow("Verifique sua conexão ou as configurações do modelo."))
    }
    process.exit(1);
  }
}

program
  .name("clizin")
  .description("Gera commit estiloso a partir das diffs")
  .action(async () => {
    let config = await loadOrCreateConfig();
    const hasChanges = await hasStagedChanges();

    if (!hasChanges) {
      console.log(chalk.yellow("Nenhum arquivo staged encontrado."));
      return;
    }

    const status = await git.status();
    console.log(chalk.cyan("\n📄 Arquivos staged:"));
    status.staged.forEach((file) => {
      console.log(chalk.gray(`- ${file}`));
    });

    console.log(chalk.blue("\n🔍 Lendo diffs do git..."));
    const diff = await getGitDiff();

    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Escolha o provedor de IA:",
        choices: ["openai", "google"],
      },
    ]);

    const modelsByProvider = {
      openai: ["gpt-4-turbo", "gpt-3.5-turbo-0125", "gpt-4"],
      google: ["gemini-1.5-flash-latest", "gemini-pro"],
    };

    const { model } = await inquirer.prompt([
      {
        type: "list",
        name: "model",
        message: "Escolha o modelo " + provider + ":",
        choices: modelsByProvider[provider],
      },
    ]);

    const { language } = await inquirer.prompt([
      {
        type: "list",
        name: "language",
        message: "Escolha o idioma para o commit:",
        choices: ["pt", "en"],
      },
    ]);

    let apiKey = config.apiKeys ? config.apiKeys[provider] : undefined;

    if (!apiKey) {
      console.log(chalk.yellow(`\n🔑 API Key para ${provider} não encontrada na configuração.`));
      const { newApiKey } = await inquirer.prompt([
        {
          type: "password",
          name: "newApiKey",
          message: "Cole sua API Key para " + provider + ":",
          mask: "*",
        },
      ]);
      if (!newApiKey) {
         console.error(chalk.red("API Key é obrigatória para continuar."));
         process.exit(1);
      }
      apiKey = newApiKey;
      
      if (!config.apiKeys) config.apiKeys = {};
      config.apiKeys[provider] = apiKey;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log(chalk.green(`API Key para ${provider} salva em: ${CONFIG_PATH}`));
    }
    
    console.log(chalk.blue(`\n🤖 Gerando commit com ${provider} (${model}) em ${language}...`));

    const commitMsg = await generateCommitMessage(diff, language, provider, model, apiKey);

    console.log(chalk.cyan("\n💬 Sugestão de commit:\n"));
    console.log(chalk.bold(commitMsg));

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Usar esse commit?",
      },
    ]);

    if (confirm) {
      const [title, ...body] = commitMsg.split("\n").filter(Boolean);
      await git.commit(`${title}\n\n${body.join("\n")}`);
      console.log(chalk.green("\n🚀 Commit aplicado!"));
    } else {
      console.log(chalk.red("\n❌ Commit cancelado."));
    }
  });

program.parse();
