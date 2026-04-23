# SAT Voca Fun Web

轻量的 SAT 词汇学习 Web App，面向移动端和桌面端，支持主题化学习体验与基础离线能力（PWA）。

## 当前能力

- 学习主流程页面：学习、测验、复习、结果页
- API 路由基础骨架
- 主题资源与 `manifest` / `sw` 基础配置
- 词库导入与清洗脚本（含 Doubao/gap 合并校验流程）

## 技术栈

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma
- Zod

## 本地运行

```bash
npm install
npm run dev
```

默认访问：`http://localhost:3000`

## 常用脚本

- `npm run dev`：开发模式
- `npm run build`：生产构建
- `npm run start`：启动生产服务
- `npm run lint`：代码检查
- `npm run convert:words:txt`：txt 词表转 json
- `npm run build:wordbank:base`：构建基础词库
- `npm run apply:doubao`：应用 Doubao/gap 覆写到词库
- `npm run verify:doubao`：校验覆写结果一致性
- `npm run check:examples`：示例句质量检查

## 目录说明（节选）

- `app/`：页面与路由（含 `api`）
- `components/`：可复用 UI 组件
- `lib/`：核心业务逻辑与数据访问封装
- `data/`：词库与导入中间产物
- `prisma/`：数据库 schema 与相关配置
- `public/`：静态资源、PWA 文件、主题资源
- `scripts/`：词库导入/清洗/校验脚本

## 分支说明

仓库当前主开发分支为 `main`。若你仍看到 `master`，请在 GitHub 仓库 `Settings -> Branches` 将默认分支切换为 `main` 后再删除旧分支。
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## GitHub Push Auto Deploy (Recommended)

项目已添加 GitHub Actions 工作流：`/.github/workflows/vercel-deploy.yml`。  
只要 push 到 `main`，GitHub 会自动构建并部署到 Vercel，不需要在公司网络手动执行 `vercel` 命令。

### One-time setup (GitHub Secrets)

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 新增以下 3 个 secrets：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

可在你网络可用时（如家庭网络）通过下面命令初始化一次：

```bash
npx vercel login
npx vercel link
```

执行后会生成 `.vercel/project.json`，其中包含 `orgId` 和 `projectId`；将两者填入 GitHub secrets 即可。
