# 🧠 clizin

Um CLI minimalista que usa IA para gerar mensagens de commit automáticas a partir dos diffs do Git. Ideal pra desenvolvedores que querem manter um histórico organizado sem perder tempo escrevendo commits.

## 🚀 Instalação

![clizin-preview-croped](https://github.com/user-attachments/assets/5db75d10-c65f-4018-bbe3-3a3383c5e7e1)

```bash
npm install -g clizin
```

Ou rode direto com `npx`:

```bash
npx clizin
```

## 🛠 Como funciona

1. Você faz `git add` normalmente.
2. Roda `clizin`.
3. Ele lê o diff, manda pra IA (OpenAI) e gera uma sugestão de commit.
4. Você confirma e o commit é feito.

## 📦 Primeiro uso

Na primeira vez, o `clizin` vai perguntar:

- Qual provedor de IA você quer usar (por enquanto só OpenAI)
- Qual modelo (ex: gpt-3.5-turbo-0125)
- Sua chave da API

Essas configurações são salvas em `~/.clizinrc.json`.

## 🧪 Exemplo

```bash
git add .
clizin
```

Saída:

```
🔍 Lendo diffs do git...
✅ Diff capturado, gerando commit...

💬 Sugestão de commit:

fix: corrige erro de validação no formulário de login

- Ajusta mensagem de erro para inputs vazios
- Remove validação redundante do backend
```

## 📄 Licença

MIT
