#!/usr/bin/env node
const { Command } = require("commander");
const simpleGit = require("simple-git");
const { OpenAI } = require("openai");
const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");

const { loadOrCreateConfig } = require("./config");

const git = simpleGit();
const program = new Command();

async function getGitDiff() {
  const diff = await git.diff(["--cached"]);
  return diff || "No staged changes found.";
}

async function generateCommitMessage(diffText, config, openai) {
  const prompt = `
Você é um gerador de mensagens de commit.
Baseado no seguinte diff de código, gere um título de commit no padrão "fix: ..." ou "feat: ...", e uma lista de bullet points curtos explicando as mudanças.

Diff:
${diffText}

Responda apenas com o commit no formato:

<tipo>: <título>

- ponto 1
- ponto 2
...
`;

  if (config.provider === "openai") {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: config.model,
      temperature: 0.4,
    });

    return completion.choices[0].message.content.trim();
  }

  throw new Error(`Provider "${config.provider}" ainda não suportado.`);
}

program
  .name("clizin")
  .description("Gera commit estiloso a partir das diffs")
  .action(async () => {
    const config = await loadOrCreateConfig();
    const openai = new OpenAI({ apiKey: config.apiKey });

    console.log(chalk.blue("\n🔍 Lendo diffs do git..."));
    const diff = await getGitDiff();

    if (!diff || diff.trim().replace(/\s/g, "") === "") {
      console.log(chalk.yellow("Nenhum diff encontrado nos arquivos staged."));
      return;
    }

    console.log(chalk.green("✅ Diff capturado, gerando commit..."));

    const commitMsg = await generateCommitMessage(diff, config, openai);

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
