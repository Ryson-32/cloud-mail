# Linux DO OAuth 集成文档

## OAuth 端点
- **授权端点**: `https://connect.linux.do/oauth2/authorize`
- **Token端点**: `https://connect.linux.do/oauth2/token`
- **用户信息端点**: `https://connect.linux.do/api/user`

## 可获取的用户信息
- `id`: 用户唯一标识
- `username`: 论坛用户名
- `name`: 用户昵称
- `avatar_template`: 头像模板URL
- `trust_level`: 信任等级（0-4）
- `active`: 账号活跃状态
- `silenced`: 禁言状态

## 配置说明
在 `wrangler.toml` 中配置：
```toml
LINUX_DO_CLIENT_ID = "your_client_id"
LINUX_DO_CLIENT_SECRET = "your_client_secret"
```

## 相关文件
- 前端回调页面：`mail-vue/src/views/oauth/callback.vue`
- 后端OAuth服务：`mail-worker/src/service/oauth-service.js`
- LinuxDo服务：`mail-worker/src/service/linuxdo-service.js`