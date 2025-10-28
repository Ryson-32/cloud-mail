# Cloud Mail 项目概览

## 项目简介
Cloud Mail 是一个基于 Cloudflare Workers 的响应式邮箱服务系统，支持邮件发送和接收，无需传统服务器即可部署运行。

## 核心功能
- 💰 低成本使用：部署到 Cloudflare Workers，无需服务器费用
- 💻 响应式设计：自动适配 PC 和移动端浏览器
- 📧 邮件发送：集成 Resend API 发送邮件，支持群发、附件、内嵌图片
- 🛡️ 管理员功能：RABC 权限控制，用户和邮件管理
- 🔀 多号模式：一个用户可添加多个邮箱
- 📦 附件收发：使用 R2 对象存储保存和下载文件  
- 🔔 邮件推送：支持转发到 Telegram 机器人或其他邮箱
- 📡 开放 API：批量生成用户，多条件查询邮件
- 📈 数据可视化：使用 ECharts 展示系统数据
- ⭐ 星标邮件：标记重要邮件便于查阅
- 🎨 个性化设置：自定义网站标题、登录背景、透明度
- ⚙️ 功能设置：控制注册、邮件发送等功能开关
- 🤖 人机验证：集成 Turnstile 防止批量注册
- 🔐 OAuth 登录：支持 Linux.do OAuth 2.0 登录

## 项目语言
- 主要开发语言：JavaScript/TypeScript
- 前端框架：Vue 3
- 后端框架：Hono (运行于 Cloudflare Workers)

## 在线资源
- 在线演示：https://skymail.ink
- 部署文档：https://doc.skymail.ink
- GitHub 仓库：https://github.com/eoao/cloud-mail
- Telegram 交流群：https://t.me/cloud_mail_tg

## 开发者信息
- 文件编码：UTF-8
- 操作系统：Windows  
- 项目目录：C:\\Users\\Ry\\Desktop\\OneDrive\\Code\\GitHub\\cloud-mail