# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
# Task board

NotionのTODO・プロジェクトDBを正本にする、固定パスワード保護付きのタスクボードです。

## Local setup

`.env.example` を `.env` へコピーし、次を設定します。`.env` はGit管理されません。

```dotenv
NOTION_API_KEY=secret_...
APP_PASSWORD=ログインに使う固定パスワード
AUTH_SECRET=ランダムな長い文字列
```

`NOTION_API_KEY` が未設定のときは、UI確認用のダミーデータで起動します。本番では必ず3つすべてを設定してください。

```bash
npm run dev
```

Vercelへ公開するときも同じ3つの環境変数をProduction環境へ設定します。
