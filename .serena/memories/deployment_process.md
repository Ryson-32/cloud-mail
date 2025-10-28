# Cloud Mail 部署流程详解

## 部署架构概览

Cloud Mail 采用 Cloudflare Workers 的 Serverless 架构，前后端一体化部署：
- 前端：Vue 3 SPA 打包为静态资源
- 后端：Hono 框架运行在 Workers 上
- 存储：D1 (SQL)、KV (缓存)、R2 (文件)
- 邮件：Resend API (发送)、Email Workers (接收)

## 部署前置条件

### 1. Cloudflare 账户资源
- [ ] Cloudflare 账户（免费或付费）
- [ ] 一个域名（需在 Cloudflare 管理）
- [ ] API Token（需要 Workers 权限）

### 2. 创建 Cloudflare 资源

#### D1 数据库
```bash
wrangler d1 create cloud-mail-db
# 记录返回的 database_id
```

#### KV 命名空间
```bash
wrangler kv:namespace create cloud-mail-kv
# 记录返回的 id 和 preview_id
```

#### R2 存储桶
```bash
wrangler r2 bucket create cloud-mail-attachments
# 记录 bucket_name
```

### 3. 邮件服务配置

#### Resend 配置（发送邮件）
1. 注册 [Resend](https://resend.com) 账户
2. 验证发送域名
3. 获取 API Key

#### Email Routing 配置（接收邮件）
1. Cloudflare Dashboard > Email > Email Routing
2. 添加目标地址规则
3. 配置 Worker 作为接收端

## 本地开发部署

### 1. 克隆项目
```bash
git clone https://github.com/eoao/cloud-mail.git
cd cloud-mail
```

### 2. 配置文件修改

#### wrangler.toml 配置
```toml
name = "your-worker-name"
main = "src/index.js"
compatibility_date = "2025-06-04"

[[d1_databases]]
binding = "db"
database_name = "your-db-name"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "kv"
id = "your-kv-id"
preview_id = "your-preview-id"

[[r2_buckets]]
binding = "r2"
bucket_name = "your-bucket-name"

[vars]
domain = ["your-domain.com"]
admin = "admin@your-domain.com"
jwt_secret = "your-random-secret-key"
```

### 3. 环境变量配置
```bash
# 设置 Resend API Key
wrangler secret put RESEND_API_KEY

# 设置 OAuth（可选）
wrangler secret put LINUX_DO_CLIENT_ID
wrangler secret put LINUX_DO_CLIENT_SECRET

# 设置 Telegram Bot（可选）
wrangler secret put TG_BOT_TOKEN
wrangler secret put TG_CHAT_ID
```

### 4. 构建和部署
```bash
# 前端构建
cd mail-vue
npm install
npm run build

# 后端部署
cd ../mail-worker
npm install
wrangler deploy
```

### 5. 初始化数据库
```bash
# 访问初始化 URL
curl https://your-domain.com/api/init/{your_jwt_secret}
```

## GitHub Actions 自动部署

### 1. Fork 项目
在 GitHub 上 Fork 项目到自己的仓库

### 2. 配置 Secrets
在仓库 Settings > Secrets and variables > Actions 添加：

| Secret 名称 | 说明 |
|------------|------|
| CLOUDFLARE_API_TOKEN | Cloudflare API Token |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare 账户 ID |
| D1_DATABASE_ID | D1 数据库 ID |
| KV_NAMESPACE_ID | KV 命名空间 ID |
| R2_BUCKET_NAME | R2 存储桶名称 |
| DOMAIN | 邮件域名 JSON 数组 |
| ADMIN | 管理员邮箱 |
| JWT_SECRET | JWT 密钥 |

### 3. 触发部署
- 推送到 main 分支自动部署
- 或手动触发 Actions workflow

## 生产环境配置

### 1. 自定义域名
```toml
# wrangler.toml
[[routes]]
pattern = "mail.example.com/*"
zone_name = "example.com"
```

### 2. 性能优化
- 启用 Workers 缓存
- 配置 CDN 加速
- 开启 Brotli 压缩

### 3. 安全加固
- 启用 Turnstile 人机验证
- 配置 CORS 策略
- 设置 Rate Limiting

### 4. 监控告警
- Cloudflare Analytics
- Workers 日志监控
- 错误告警配置

## 多环境管理

### 开发环境
```bash
# 使用 wrangler-dev.toml
wrangler dev --config wrangler-dev.toml
```

### 测试环境
```bash
# 使用 wrangler-test.toml
wrangler deploy --config wrangler-test.toml
```

### 生产环境
```bash
# 使用 wrangler.toml
wrangler deploy
```

## 版本管理策略

### 1. 分支策略
- main: 生产环境
- develop: 开发环境
- feature/*: 功能开发
- hotfix/*: 紧急修复

### 2. 版本标签
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 3. 回滚策略
```bash
# Workers 回滚
wrangler rollback

# Git 回滚
git revert <commit>
```

## 故障排查

### 部署失败排查
1. 检查 API Token 权限
2. 验证资源 ID 配置
3. 查看 wrangler 错误日志

### 运行异常排查
1. 查看 Workers 实时日志
```bash
wrangler tail --format pretty
```

2. 检查数据库连接
3. 验证环境变量配置

### 性能问题排查
1. 分析 Workers Analytics
2. 检查 D1 查询性能
3. 优化 KV 缓存策略

## 备份和恢复

### 数据备份
```bash
# D1 数据库导出
wrangler d1 execute cloud-mail-db --command "SELECT * FROM user" > backup.sql
```

### 配置备份
- 定期备份 wrangler.toml
- Git 仓库保存所有配置
- 文档化环境变量

## 扩展和定制

### 添加新功能
1. 前端添加页面组件
2. 后端添加 API 接口
3. 数据库添加新表
4. 更新初始化脚本

### 主题定制
- 修改 `style.css` 全局样式
- 自定义 Element Plus 主题
- 配置登录页背景

### 集成第三方服务
- OAuth 登录提供商
- 邮件推送服务
- 监控告警平台