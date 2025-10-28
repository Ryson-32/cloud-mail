# Cloud Mail 技术栈详情

## 前端技术栈 (mail-vue)

### 核心框架
- **Vue 3**: ^3.5.13 - 前端框架
- **Vue Router**: ^4.5.0 - 路由管理  
- **Pinia**: ^3.0.2 - 状态管理
- **Element Plus**: ^2.9.11 - UI 组件库

### 开发工具
- **Vite**: 6.3.4 - 构建工具
- **@vitejs/plugin-vue**: ^5.2.1 - Vue 插件
- **unplugin-auto-import**: ^19.3.0 - 自动导入
- **unplugin-vue-components**: ^28.7.0 - 组件自动导入

### 功能库
- **Axios**: ^1.7.8 - HTTP 请求
- **ECharts**: ^5.6.0 - 数据可视化图表
- **DayJS**: ^1.11.13 - 日期时间处理
- **Dexie**: ^4.0.11 - IndexedDB 封装
- **Vue i18n**: ^11.1.10 - 国际化
- **@iconify/vue**: ^4.3.0 - 图标库
- **TinyMCE**: 富文本编辑器

### 样式处理
- **Less**: ^4.2.2
- **Sass**: ^1.82.0

## 后端技术栈 (mail-worker)

### 运行环境
- **Cloudflare Workers**: Serverless 运行时
- **Wrangler**: ^4.7.0 - Cloudflare Workers CLI 工具

### 核心框架
- **Hono**: ^4.7.5 - 轻量级 Web 框架
- **Drizzle ORM**: ^0.42.0 - 数据库 ORM

### Cloudflare 服务
- **D1 Database**: SQL 数据库服务
- **KV Storage**: 键值对存储（缓存）
- **R2 Storage**: 对象存储（附件存储）
- **Turnstile**: 人机验证服务

### 邮件处理
- **Resend**: ^4.5.1 - 邮件发送 API
- **Postal-MIME**: ^2.4.3 - 邮件解析库

### 工具库
- **DayJS**: ^1.11.13 - 日期时间处理
- **i18next**: ^25.3.2 - 国际化
- **UUID**: ^11.1.0 - UUID 生成
- **UA-Parser-JS**: ^2.0.3 - User Agent 解析
- **LinkedOM**: ^0.18.10 - DOM 解析

### 开发测试
- **Vitest**: ~3.0.7 - 测试框架
- **@cloudflare/vitest-pool-workers**: ^0.7.5 - Workers 测试池

## 部署架构

### Cloudflare 资源
1. **Workers**: 运行后端代码
2. **D1 Database**: 存储用户、邮件等数据
3. **KV Namespace**: 缓存和临时数据存储
4. **R2 Bucket**: 存储邮件附件
5. **Custom Domain**: 自定义域名绑定

### 邮件服务
- **Resend API**: 发送邮件
- **Email Workers**: 接收邮件（通过 Cloudflare Email Routing）

## 构建和打包
- 前端使用 Vite 打包，输出到 `mail-worker/dist` 目录
- 后端使用 Wrangler 部署到 Cloudflare Workers
- 前后端一体化部署（Workers Sites）