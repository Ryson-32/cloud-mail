# Cloud Mail 任务完成后的操作指南

## 代码修改后的验证步骤

### 1. 代码质量检查
```bash
# 格式化代码（如果配置了 Prettier）
npx prettier --write .

# 检查文件编码是否为 UTF-8
# Windows PowerShell 命令
Get-Content -Path "filename" -Encoding UTF8
```

### 2. 本地测试

#### 前端测试
```bash
cd mail-vue
# 启动开发服务器
npm run dev
# 访问 http://localhost:3001 验证功能
```

#### 后端测试
```bash
cd mail-worker
# 启动本地 Workers 开发服务器
npm run dev
# 访问 http://localhost:8787 验证 API
```

### 3. 构建验证
```bash
# 前端构建
cd mail-vue
npm run build
# 检查 ../mail-worker/dist 目录是否生成正确

# 后端构建（本地验证）
cd mail-worker
wrangler dev --local
```

## Git 提交前检查清单

- [ ] 代码已格式化
- [ ] 文件编码为 UTF-8
- [ ] 无语法错误
- [ ] 功能测试通过
- [ ] 敏感信息已移除
- [ ] 注释清晰完整
- [ ] 符合项目代码规范

## 部署前准备

### 1. 环境变量检查
- 确认 `wrangler.toml` 配置正确
- 敏感信息使用 `wrangler secret` 配置
- 域名配置正确

### 2. 依赖检查
```bash
# 前端依赖
cd mail-vue
npm install
npm audit  # 检查安全漏洞

# 后端依赖
cd mail-worker
npm install
npm audit
```

### 3. 数据库准备
- 确认 D1 数据库已创建
- 确认 KV 命名空间已创建
- 确认 R2 存储桶已创建

## 完整部署流程

### 1. 前端构建
```bash
cd mail-vue
npm install
npm run build
```

### 2. 后端部署
```bash
cd mail-worker
npm install

# 测试环境部署
npm run test

# 生产环境部署（谨慎操作）
npm run deploy
```

### 3. 初始化数据库
```bash
# 首次部署后访问
curl https://你的域名/api/init/{jwt_secret}
```

### 4. 验证部署
- 访问前端页面
- 测试登录功能
- 测试邮件收发
- 检查错误日志

## 回滚方案

### 快速回滚
```bash
# 查看部署历史
wrangler deployments list

# 回滚到上一个版本
wrangler rollback
```

### Git 回滚
```bash
# 查看提交历史
git log --oneline

# 回滚到指定版本
git revert <commit-hash>
# 或
git reset --hard <commit-hash>

# 重新部署
npm run deploy
```

## 监控和日志

### 查看实时日志
```bash
wrangler tail --format pretty
```

### 查看错误日志
```bash
wrangler tail --status error
```

### 性能监控
- Cloudflare Dashboard > Workers > Analytics
- 查看请求数、错误率、响应时间

## 常见问题处理

### 部署失败
1. 检查 `wrangler.toml` 配置
2. 验证 Cloudflare API Token 权限
3. 确认资源（D1、KV、R2）已创建

### 功能异常
1. 查看 Workers 日志
2. 检查环境变量配置
3. 验证数据库是否初始化

### 性能问题
1. 检查 D1 查询优化
2. 使用 KV 缓存热点数据
3. 优化前端资源加载

## 文档更新

修改功能后需要更新：
- README.md - 功能说明
- OAUTH_SETUP.md - OAuth 相关改动
- 代码注释 - 复杂逻辑说明
- API 文档 - 接口变更

## 团队协作

### 代码审查要点
- 代码风格一致性
- 安全性检查
- 性能影响评估
- 向后兼容性

### 沟通渠道
- GitHub Issues - Bug 报告
- GitHub Pull Request - 代码合并
- Telegram 群组 - 实时讨论