# Linux.do OAuth 集成完整指南

本文档详细介绍了 cloud-mail 项目中 Linux.do OAuth 2.0 登录功能的实现和配置。

## 📌 功能概述

### 核心功能
- ✅ Linux.do OAuth 2.0 第三方登录
- ✅ 自动创建和关联用户账户
- ✅ 信任等级权限控制（Level 0-4）
- ✅ 用户数量限制管理
- ✅ LinuxDo 用户信息展示（ID、用户名、等级）
- ✅ 安全的状态验证机制

### 新增功能（2e57a3e - 953bc2f）
- 🔐 完整的 OAuth 授权流程实现
- 👥 用户管理系统增强，支持 LinuxDo 用户信息展示
- ⚙️ 系统设置扩展，LinuxDo 用户注册权限控制
- 🎓 大学链接通过环境变量配置（支持动态显示）
- 🔒 安全性改进，敏感信息通过环境变量管理

## 🚀 快速开始

### 1. 在 Linux.do 创建 OAuth 应用

1. 访问 [Linux.do OAuth 应用管理](https://connect.linux.do/admin/api/keys)
2. 点击"新建应用密钥"
3. 填写应用信息：
   - **应用名称**: 你的邮箱服务名称（如：Cloud Mail）
   - **应用主页**: `https://your-domain.com`
   - **授权回调地址**: `https://your-domain.com/oauth/callback`
   - **权限范围**: 选择 `read`（只读权限）
4. 创建后获取：
   - **Client ID**: 公开的客户端标识
   - **Client Secret**: 私密的客户端密钥（只显示一次）

### 2. 配置环境变量

#### 方法一：通过 wrangler.toml（本地部署）
```toml
[vars]
# OAuth 配置（必需）
LINUX_DO_CLIENT_ID = "your_client_id_here"
LINUX_DO_CLIENT_SECRET = "your_client_secret_here"

# LinuxDo 用户管理设置（可选）
linuxdoTrustLevel0Enabled = 0  # 0级用户是否可注册（默认禁用）
linuxdoTrustLevel1Enabled = 1  # 1级用户是否可注册（默认启用）
linuxdoTrustLevel2Enabled = 1  # 2级用户是否可注册（默认启用）
linuxdoTrustLevel3Enabled = 1  # 3级用户是否可注册（默认启用）
linuxdoTrustLevel4Enabled = 1  # 4级用户是否可注册（默认启用）
linuxdoMaxUsers = 2000          # 最大用户数限制（0表示不限制）

# 大学链接配置（可选）
UNIVERSITY_URL = "https://your-university.edu"
UNIVERSITY_NAME = "Your University Name"
```

#### 方法二：通过 Cloudflare Dashboard（生产部署）
```bash
# 设置 OAuth 密钥
wrangler secret put LINUX_DO_CLIENT_ID
wrangler secret put LINUX_DO_CLIENT_SECRET

# 设置其他环境变量
wrangler secret put UNIVERSITY_URL
wrangler secret put UNIVERSITY_NAME
```

### 3. 数据库初始化

部署后访问以下 URL 进行数据库迁移：
```
GET https://your-domain.com/api/init/{your_jwt_secret}
```

这将自动添加 OAuth 相关的数据库字段：
- `user` 表新增字段：
  - `oauth_provider` - OAuth 提供商标识
  - `oauth_id` - Linux.do 用户 ID
  - `oauth_username` - Linux.do 用户名
  - `trust_level` - 用户信任等级（0-4）
  - `avatar_template` - 头像模板 URL

- `setting` 表新增字段：
  - `linuxdoTrustLevel[0-4]Enabled` - 各等级注册权限
  - `linuxdoMaxUsers` - 最大用户数限制

### 4. 部署应用

```bash
# 构建前端
cd mail-vue
npm run build

# 部署到 Cloudflare
cd ../mail-worker
npx wrangler deploy
```

## 📖 技术架构

### OAuth 端点
- **授权端点**: `https://connect.linux.do/oauth2/authorize`
- **Token 端点**: `https://connect.linux.do/oauth2/token`
- **用户信息端点**: `https://connect.linux.do/api/user`

### 可获取的用户信息
```json
{
  "id": 123,                    // 用户唯一标识
  "username": "user123",         // 论坛用户名
  "name": "User Name",           // 用户昵称
  "avatar_template": "/avatar/{size}.png",  // 头像模板
  "trust_level": 2,              // 信任等级（0-4）
  "active": true,                // 账号活跃状态
  "silenced": false              // 禁言状态
}
```

## 🔄 用户登录流程

### 登录步骤
1. 用户点击"通过 Linux.do 登录"按钮
2. 前端请求授权 URL：`POST /api/oauth/authorize-url`
3. 重定向到 Linux.do 授权页面
4. 用户授权后，Linux.do 重定向回应用
5. 前端处理回调：`POST /api/oauth/callback`
6. 后端验证授权码，获取用户信息
7. 创建或关联用户账户
8. 返回 JWT token，登录成功

### 用户账户处理逻辑

```javascript
// 账户关联规则
if (已存在OAuth用户) {
  直接登录
} else if (存在相同邮箱用户) {
  if (用户已删除) {
    重新激活并关联OAuth
  } else {
    关联OAuth到现有账户
  }
} else {
  // 新用户注册
  if (检查信任等级权限) {
    if (未超过用户数限制) {
      创建新用户账户
    }
  }
}
```

### 邮箱生成规则
- 优先使用 Linux.do 提供的邮箱
- 如果未提供，使用格式：`linuxdo_{用户ID}@{配置的域名}`

## 🛡️ 权限控制

### 信任等级说明
- **Level 0**: 新用户（默认禁止注册）
- **Level 1**: 基础用户（默认允许注册）
- **Level 2**: 活跃用户（默认允许注册）
- **Level 3**: 资深用户（默认允许注册）
- **Level 4**: 领袖用户（默认允许注册）

### 管理员设置
管理员可以在系统设置中：
1. 控制各等级用户的注册权限
2. 设置最大用户数限制
3. 查看用户等级统计信息

## 📚 API 文档

### 获取授权 URL
```http
POST /api/oauth/authorize-url
Content-Type: application/json

{
  "redirectUri": "https://your-domain.com/oauth/callback"
}

Response:
{
  "code": 200,
  "data": {
    "authUrl": "https://connect.linux.do/oauth2/authorize?..."
  }
}
```

### OAuth 回调处理
```http
POST /api/oauth/callback
Content-Type: application/json

{
  "code": "authorization_code",
  "redirectUri": "https://your-domain.com/oauth/callback"
}

Response:
{
  "code": 200,
  "data": {
    "token": "jwt_token_here",
    "user": { ... }
  }
}
```

### 获取 LinuxDo 统计信息
```http
GET /api/linuxdo/stats
Authorization: Bearer {token}

Response:
{
  "code": 200,
  "data": {
    "total": 100,
    "level0": 10,
    "level1": 30,
    "level2": 40,
    "level3": 15,
    "level4": 5
  }
}
```

### 更新 LinuxDo 设置
```http
PUT /api/linuxdo/settings
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "trustLevel0Enabled": false,
  "trustLevel1Enabled": true,
  "trustLevel2Enabled": true,
  "trustLevel3Enabled": true,
  "trustLevel4Enabled": true,
  "maxUsers": 2000
}
```

## 🗂️ 文件结构

### 前端文件
- `mail-vue/src/views/login/index.vue` - 登录页面，包含 OAuth 登录按钮
- `mail-vue/src/views/oauth/callback.vue` - OAuth 回调处理页面
- `mail-vue/src/views/user/index.vue` - 用户管理页面，展示 LinuxDo 信息
- `mail-vue/src/views/sys-setting/index.vue` - 系统设置页面，LinuxDo 设置
- `mail-vue/src/request/linuxdo.js` - LinuxDo API 请求封装

### 后端文件
- `mail-worker/src/api/oauth-api.js` - OAuth API 路由
- `mail-worker/src/api/linuxdo-api.js` - LinuxDo 管理 API
- `mail-worker/src/service/oauth-service.js` - OAuth 核心服务
- `mail-worker/src/service/linuxdo-service.js` - LinuxDo 用户管理服务
- `mail-worker/src/service/login-service.js` - 登录服务（包含 OAuth 登录）
- `mail-worker/src/entity/user.js` - 用户实体（包含 OAuth 字段）
- `mail-worker/src/init/init.js` - 数据库初始化脚本

## 🔧 故障排除

### 常见错误及解决方案

| 错误信息 | 可能原因 | 解决方法 |
|---------|---------|---------|
| OAuth not configured | 环境变量未设置 | 检查 CLIENT_ID 和 CLIENT_SECRET |
| OAuth令牌获取失败 | 密钥配置错误 | 验证 OAuth 应用配置 |
| 回调地址不匹配 | 配置不一致 | 确保所有地方的回调地址完全相同 |
| 用户注册失败 | 权限或限制 | 检查信任等级设置和用户数限制 |
| 数据库错误 | 未初始化 | 运行数据库迁移脚本 |

### 调试技巧
1. **检查浏览器控制台**: 查看网络请求和错误信息
2. **查看 Workers 日志**: `wrangler tail` 查看实时日志
3. **验证环境变量**: `wrangler secret list` 查看已设置的密钥
4. **测试 OAuth 流程**: 使用浏览器隐身模式测试完整流程

## ⚠️ 安全注意事项

1. **密钥保护**: 
   - 不要将 CLIENT_SECRET 提交到代码仓库
   - 使用 `.gitignore` 排除 `wrangler.toml`
   - 生产环境使用 Cloudflare Secrets

2. **HTTPS 要求**: 
   - OAuth 回调必须使用 HTTPS
   - 本地测试可使用 `wrangler dev --local`

3. **权限控制**: 
   - 合理设置各等级用户的注册权限
   - 设置适当的用户数量限制
   - 定期审查用户权限设置

4. **数据安全**: 
   - OAuth token 不存储在数据库
   - 用户密码使用加盐哈希
   - 敏感操作需要管理员权限

## 📝 更新日志

### v2.0.0 (2e57a3e - 953bc2f)
- ✨ 完整集成 Linux.do OAuth 2.0 登录
- 👥 增强用户管理系统，显示 LinuxDo 信息
- ⚙️ 新增 LinuxDo 用户注册权限控制
- 🎓 支持大学链接环境变量配置
- 🔒 优化安全性，使用环境变量管理敏感信息
- 🐛 修复大学链接显示逻辑问题
- 📚 清理冗余文档和测试文件

### 核心改动
- 新增 OAuth 服务层（oauth-service.js）
- 新增 LinuxDo 管理服务（linuxdo-service.js）  
- 扩展用户表结构，支持 OAuth 字段
- 改进前端登录页面和用户管理界面
- 优化 .gitignore 防止敏感信息泄露

## 📞 支持与贡献

如有问题或建议，请：
1. 查看本文档的故障排除部分
2. 访问项目 GitHub Issues
3. 参与 Linux.do 社区讨论

---

*本文档基于 cloud-mail 项目 v2.0.0 版本编写*
