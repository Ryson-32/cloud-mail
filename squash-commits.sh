#!/bin/bash

# Git 提交合并脚本
# 用于将从 6c030cd 到 3f44e5f 的所有改动合并为一个提交

echo "=================================="
echo "Git 提交合并脚本"
echo "=================================="
echo ""

# 确认当前分支
current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"
echo ""

# 备份当前分支
backup_branch="backup-${current_branch}-$(date +%Y%m%d-%H%M%S)"
echo "创建备份分支: $backup_branch"
git branch $backup_branch
echo ""

# 创建新的合并分支
squash_branch="squashed-${current_branch}"
echo "创建新分支: $squash_branch"
git checkout -b $squash_branch 6c030cd^
echo ""

# 应用所有改动
echo "应用所有改动..."
git diff 6c030cd^ HEAD | git apply --whitespace=fix
echo ""

# 添加所有改动
echo "添加所有文件到暂存区..."
git add -A
echo ""

# 创建合并提交
echo "创建合并提交..."
git commit -m "feat: 集成 Linux.do OAuth 登录并增强用户管理系统

核心功能改进：
- 🔐 集成 Linux.do OAuth 2.0 登录
  - 实现完整的OAuth授权流程
  - 支持Linux.do用户直接登录，无需密码
  - 自动创建用户账户并关联Linux.do ID
  
- 👥 用户管理系统增强
  - 显示Linux.do用户ID、用户名和信任等级
  - 支持按多个字段排序（ID、等级、邮箱数等）
  - 改进搜索功能，支持邮箱/ID/用户名搜索
  - 优化用户列表展示，显示所有关联邮箱

- ⚙️ 系统设置扩展
  - Linux.do用户注册权限控制（按信任等级）
  - 最大用户数限制设置
  - 实时用户等级统计
  - 大学链接通过环境变量配置

- 🔒 安全性改进
  - 优化.gitignore，防止敏感信息泄露
  - 创建wrangler.example.toml示例配置
  - 移除硬编码的个人域名和邮箱
  - 环境变量管理敏感配置

技术实现：
- 后端：新增oauth-service、linuxdo-service服务
- 前端：改进登录页面和OAuth回调处理
- 数据库：扩展user表支持OAuth字段
- 配置：支持环境变量配置OAuth和大学链接

文件变更统计：
- 48个文件修改
- 3341行新增
- 740行删除"

echo ""
echo "提交已创建！"
echo ""
echo "=================================="
echo "后续操作建议："
echo "=================================="
echo ""
echo "1. 检查新分支的提交："
echo "   git log --oneline -1"
echo ""
echo "2. 如果满意，可以重置主分支到新的提交："
echo "   git checkout $current_branch"
echo "   git reset --hard $squash_branch"
echo ""
echo "3. 强制推送到远程（谨慎操作）："
echo "   git push origin $current_branch --force"
echo ""
echo "4. 如需恢复，使用备份分支："
echo "   git checkout $backup_branch"
echo ""
echo "=================================="
