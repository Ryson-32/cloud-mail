# Cloud Mail 开发常用命令

## Git 操作命令
```bash
# 查看状态
git status

# 查看分支
git branch -a

# 提交代码
git add .
git commit -m "message"
git push origin main

# 同步上游
git pull origin main
```

## 前端开发命令 (mail-vue 目录)
```bash
# 进入前端目录
cd mail-vue

# 安装依赖
npm install

# 本地开发（连接本地后端）
npm run dev

# 远程开发（连接线上后端）
npm run remote

# 构建生产版本（输出到 ../mail-worker/dist）
npm run build

# 预览构建结果
npm run preview
```

## 后端开发命令 (mail-worker 目录)
```bash
# 进入后端目录
cd mail-worker

# 安装依赖
npm install

# 本地开发（使用 wrangler-dev.toml）
npm run dev
# 或
wrangler dev --config wrangler-dev.toml

# 测试环境部署（使用 wrangler-test.toml）
npm run test
# 或
wrangler deploy --config wrangler-test.toml

# 生产环境部署（使用 wrangler.toml）
npm run deploy
# 或
wrangler deploy

# 查看日志
wrangler tail
```

## 数据库初始化
```bash
# 部署后访问以下 URL 初始化数据库
# https://你的域名/api/init/{你的jwt_secret}
```

## Cloudflare Workers 命令
```bash
# 登录 Cloudflare
wrangler login

# 查看账户信息
wrangler whoami

# 创建 D1 数据库
wrangler d1 create <database-name>

# 创建 KV 命名空间
wrangler kv:namespace create <namespace-name>

# 创建 R2 存储桶
wrangler r2 bucket create <bucket-name>

# 设置环境变量/密钥
wrangler secret put <SECRET_NAME>

# 查看部署信息
wrangler deployments list
```

## 项目构建流程
```bash
# 完整构建和部署流程
cd mail-vue
npm install
npm run build

cd ../mail-worker
npm install
npm run deploy
```

## 环境配置
```bash
# 前端环境变量位于 mail-vue/.env.* 文件
# 开发环境：.env.dev
# 生产环境：.env.release
# 远程开发：.env.remote

# 后端环境变量在 wrangler.toml 中配置
# 敏感信息使用 wrangler secret 配置
```

## Windows 系统命令
```bash
# 查看目录
dir

# 切换目录
cd path\to\directory

# 查看文件内容
type filename

# 查找文件
where filename

# 环境变量
echo %VARIABLE_NAME%

# PowerShell 命令
Get-ChildItem
Get-Content filename
```

## 测试命令
```bash
# 后端单元测试
cd mail-worker
npm test

# 运行特定测试
npx vitest run index.spec.js
```

## 调试技巧
```bash
# 开启 ORM 日志（wrangler.toml）
# [vars]
# orm_log = true

# 查看 Workers 实时日志
wrangler tail --format pretty

# 本地调试模式
wrangler dev --local
```

## OAuth 配置
```bash
# 设置 Linux.do OAuth 密钥
wrangler secret put LINUX_DO_CLIENT_ID
wrangler secret put LINUX_DO_CLIENT_SECRET
```