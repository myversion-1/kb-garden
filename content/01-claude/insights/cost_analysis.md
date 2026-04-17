---
title: Claude Code CLI 成本优化方案
tags: [evergreen]
---

# Claude Code CLI 成本优化方案

这是一篇关于 [AI协作工具成本优化](./04-moments/taste) 的深度思考。
- **主要模型**: moonshotai/kimi-k2.5 (~$12/百万输出 tokens)
- **推理模型**: deepseek/deepseek-r1 (~$7.25/百万输出 tokens)
- **使用级别**: 重度 (>50万 tokens/天)

---

## 推荐方案

### 方案 A：官方直连（最优性价比）

| 模型 | 渠道 | 输入价格 | 输出价格 | 月省估算* |
|------|------|----------|----------|-----------|
| Kimi K2.5 | Moonshot 官方 | ￥2.5/M | ￥12/M | **~¥800-1500** |
| DeepSeek-R1 | DeepSeek 官方 | $0.55/M | $2.19/M | **~¥1200-2000** |

**操作建议**：
1. 注册 Moonshot AI（https://platform.moonshot.cn）充值￥50-100测试
2. 注册 DeepSeek（https://platform.deepseek.com）充值 $10-20 测试
3. 修改 `.claude/settings.json` 切换 base_url 和 key

### 方案 B：阿里通义千问（国内稳定）
- 价格与 Moonshot 接近
- 国内访问更稳定，无需代理
- 适合不想折腾代理的用户

### 方案 C：保留 OpenRouter（多模型灵活）
- 适合同时使用 3+ 种模型的场景
- 统一账单管理方便
- 价格最贵但方便

---

## 实施步骤

```bash
# 1. 备份当前配置
cp ~/.claude/settings.json ~/.claude/settings.json.backup.$(date +%Y%m%d)

# 2. 获取 API Keys
# - Moonshot: https://platform.moonshot.cn → API Key 管理
# - DeepSeek: https://platform.deepseek.com → API Keys

# 3. 编辑配置文件（已生成 settings.json.new）
# 复制粘贴其中的配置，替换你的 API key

# 4. 测试连接
claude /version
# 应显示当前使用的模型版本
```

---

## 预期节省

按重度使用（50万In/30万Out tokens/天）估算：

| 方案 | 月成本估算 | vs OpenRouter |
|------|------------|---------------|
| 当前 OpenRouter | ~$450-600 | 基准 |
| Moonshot+DeepSeek 官方 | ~$180-300 | **省 50-60%** |
| 阿里通义千问 | ~$200-350 | **省 40-50%** |

---

*月省估算基于重度使用场景，实际金额取决于实际使用量
