# 知识管理库

> 个人知识沉淀与灵感记录，多设备同步

---

## 目录结构

| 目录 | 说明 |
|------|------|
| `00-inbox/` | 📥 收件箱，快速收集 |
| `01-claude/` | Claude 记忆文件、上下文、Skills |
| `02-inspiration/` | 灵感记录（按日期） |
| `03-reading/` | 浏览记录、读书笔记 |
| `04-moments/` | 触动瞬间（文字、影像、声音、感受） |
| `05-snippets/` | 代码片段、模板 |
| `06-projects/` | 项目文档 |
| `07-learning/` | 学习笔记 |
| `99-archive/` | 📦 归档，历史内容 |
| `templates/` | 📝 笔记模板 |

> **注意**：`02-07` 及 `99-archive` 等目录可能在本地不存在——隐私策略要求文件 push 到 GitHub 后本地删除。

---

## Telegram Bot

**核心功能**：多设备快速记录，自动同步到 GitHub

### 支持的消息类型

| 类型 | 处理方式 |
|------|----------|
| 📝 文本 | 直接保存到 inbox |
| 📷 图片 | AI 识别 + 自动分类保存 |
| 🎤 语音 | AI 转文字后保存 |
| 📹 视频 | 记录时长到 inbox |
| 📄 文件 | 记录文件名到 inbox |
| 📍 位置 | 记录坐标和地图链接 |
| 👤 联系人 | 记录姓名和电话 |

### 图片自动分类

| 分类 | 保存目录 |
|------|----------|
| 人物 | `04-moments/people/` |
| 风景 | `04-moments/landscape/` |
| 美食 | `04-moments/food/` |
| 文档 | `04-moments/document/` |
| 截图 | `04-moments/screenshot/` |
| 代码 | `04-moments/code/` |
| 动物 | `04-moments/animals/` |
| 植物 | `04-moments/plants/` |
| 艺术 | `04-moments/art/` |
| 其他 | `04-moments/misc/` |

### Bot 命令

| 命令 | 功能 |
|------|------|
| `/start` | 开始使用 |
| `/inbox` | 查看 inbox |
| `/organize` | AI 整理 inbox |
| `/chat` | 进入对话模式 |
| `/endchat` | 结束对话并整理 |
| `/ask 问题` | 单次提问 |
| `/help` | 帮助信息 |

### AI 功能

- **智能整理**：自动提取关键词、分类、摘要
- **连续对话**：与 AI 多轮对话，自动记录整理
- **知识问答**：基于知识库内容回答问题

### 链接提取

发送包含链接的消息，自动提取标题和描述保存。

### 自动整理

- **触发条件**：inbox 超过 20 条
- **归档位置**：`99-archive/inbox_日期.md`
- **保留内容**：最近 20 条

---

## 技术栈

| 组件 | 技术 |
|------|------|
| 存储 | GitHub 私人仓库 |
| Bot 服务 | Vercel Serverless |
| 图片识别 | 阿里云通义千问 qwen-vl-max |
| 语音识别 | 阿里云通义千问 qwen-audio-turbo |
| AI 对话 | 阿里云通义千问 qwen-plus |

---

## 工作流

```
手机/电脑 Telegram → Bot → AI 处理 → GitHub 知识库
                                      ↓
                              自动整理 → 归档
```

1. **收集** → Telegram 发送消息
2. **处理** → AI 识别/转文字/分类
3. **存储** → 自动同步到 GitHub
4. **整理** → 超过 20 条自动归档

---

## 相关链接

- **知识库**: https://github.com/myversion-1/-
- **Bot 服务**: https://telegram-kb-bot.vercel.app

---

> 创建时间：2026-03-04
> 最后更新：2026-03-25