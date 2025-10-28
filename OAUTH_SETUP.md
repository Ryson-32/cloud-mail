# Linux.do OAuth 登录集成指南

本项目已集成 Linux.do OAuth 登录功能，用户可以通过 Linux.do 账户直接登录邮箱系统。

## 功能特性

- ✅ 支持 Linux.do OAuth 2.0 登录
- ✅ 自动创建用户账户
- ✅ 关联现有邮箱用户
- ✅ 安全的状态验证
- ✅ 完整的错误处理

## 配置步骤

### 1. 在 Linux.do 创建 OAuth 应用

1. 访问 [Linux.do OAuth 应用管理](https://connect.linux.do/admin/api/keys)
2. 创建新的 OAuth 应用
3. 配置应用信息：
   - **应用名称**: 你的邮箱服务名称
   - **应用主页**: `https://your-domain.com`
   - **回调地址**: `https://your-domain.com/oauth/callback`
   - **权限范围**: `read`

4. 获取 Client ID 和 Client Secret

### 2. 配置环境变量

在 `wrangler.toml` 文件中添加以下配置：

```toml
[vars]
LINUX_DO_CLIENT_ID = "your_client_id_here"
LINUX_DO_CLIENT_SECRET = "your_client_secret_here"
```

或者通过 Cloudflare Dashboard 设置环境变量：

```bash
wrangler secret put LINUX_DO_CLIENT_ID
wrangler secret put LINUX_DO_CLIENT_SECRET
```

### 3. 数据库迁移

运行数据库初始化来添加 OAuth 相关字段：

```
GET https://your-domain.com/api/init/{your_jwt_secret}
```

这将自动添加以下字段到 `user` 表：
- `oauth_provider` - OAuth 提供商 (linux_do)
- `oauth_id` - Linux.do 用户 ID
- `oauth_username` - Linux.do 用户名

### 4. 部署应用

```bash
cd mail-worker
npm run deploy
```

## 使用方法

### 用户登录流程

1. 用户访问登录页面
2. 点击 "通过 Linux.do 登录" 按钮
3. 重定向到 Linux.do 授权页面
4. 用户授权后重定向回应用
5. 系统自动创建用户或关联现有用户
6. 登录成功，跳转到邮箱主页

### 用户账户关联逻辑

- **新用户**: 如果 Linux.do 用户首次登录，系统会自动创建新的用户账户
- **现有用户**: 如果存在相同邮箱的用户，系统会关联 OAuth 信息到现有账户
- **邮箱生成**: 如果 Linux.do 未提供邮箱，系统使用 `username@linux.do` 格式

## API 端点

### 获取授权 URL
```
POST /api/oauth/authorize-url
Content-Type: application/json

{
  "redirectUri": "https://your-domain.com/oauth/callback"
}
```

### OAuth 回调处理
```
POST /api/oauth/callback
Content-Type: application/json

{
  "code": "authorization_code",
  "state": "state_parameter",
  "redirectUri": "https://your-domain.com/oauth/callback"
}
```

### 获取 OAuth 配置
```
GET /api/oauth/config
```

## 安全考虑

1. **状态验证**: 使用 state 参数防止 CSRF 攻击
2. **令牌存储**: OAuth 状态信息临时存储在 KV 中，5分钟后自动过期
3. **权限控制**: OAuth 用户享有与普通用户相同的权限控制
4. **数据隔离**: OAuth 用户数据与普通用户数据完全隔离

## 故障排除

### 常见错误

1. **OAuth not configured**: 检查环境变量是否正确设置
2. **OAuth状态验证失败**: 可能是回调地址配置错误或状态过期
3. **OAuth令牌获取失败**: 检查 Client ID 和 Secret 是否正确

### 调试方法

1. 检查浏览器控制台错误信息
2. 查看 Cloudflare Workers 日志
3. 验证回调地址配置是否正确

## 注意事项

1. 确保回调地址与 Linux.do 应用配置完全一致
2. OAuth 功能需要 HTTPS 环境
3. 首次部署后需要运行数据库迁移
4. 建议在生产环境中使用 Cloudflare Secrets 管理敏感信息

## 技术实现

- **前端**: Vue 3 + Element Plus
- **后端**: Hono + Cloudflare Workers
- **数据库**: Cloudflare D1
- **缓存**: Cloudflare KV
- **OAuth 流程**: 标准 OAuth 2.0 授权码模式

### Linux.do OAuth 端点

- **授权端点**: `https://connect.linux.do/oauth2/authorize`
- **令牌端点**: `https://connect.linux.do/oauth2/token`
- **用户信息端点**: `https://connect.linux.do/api/user`

## 更新日志

- v1.8.0: 新增 Linux.do OAuth 登录支持
- 添加用户表 OAuth 字段
- 实现完整的 OAuth 2.0 流程
- 支持用户账户自动创建和关联
