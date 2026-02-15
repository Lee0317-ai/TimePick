# Supabase Edge Functions 部署指南

> **TimePick 项目 - 待尝试链接管理功能**
>
> **更新日期**: 2026-02-15

---

## 📋 前置条件检查

### 1. 安装 Supabase CLI

Supabase CLI 是部署和管理 Edge Functions 的必备工具。

#### Windows (PowerShell)
```powershell
# 使用 npm 全局安装
npm install -g supabase

# 或使用 pnpm
pnpm add -g supabase

# 或使用 yarn
yarn global add supabase
```

#### 验证安装
```bash
supabase --version
# 应该显示版本号，如 1.x.x
```

### 2. 登录 Supabase

```bash
supabase login
```

这会打开浏览器进行授权。授权成功后返回终端。

---

## 🚀 部署步骤

### 步骤 1：链接项目到 Supabase

```bash
# 在项目根目录执行
cd D:\AIWork\TimePick

# 链接到远程 Supabase 项目
supabase link --project-ref glfymisjfvioyaylzkdj
```

**成功提示**:
```
✅ Linked project glfymisjfvioyaylzkdj
```

### 步骤 2：验证 Edge Functions

```bash
# 列出所有 Edge Functions
supabase functions list
```

**应该看到**:
```
┌───────────────────────┬──────────────────────────────────┐
│ Function Name        │ Version (if deployed)        │
├───────────────────────┼──────────────────────────────────┤
│ auto-recognize      │ ✓                             │
│ draw-fortune        │ ✓                             │
│ fortune-agent       │ ✓                             │
│ fetch-webpage-metadata  │ (未部署)                   │
│ calculate-priority    │ (未部署)                   │
│ batch-calculate-priority │ (未部署)                   │
└───────────────────────┴──────────────────────────────────┘
```

### 步骤 3：部署 Edge Functions

#### 方式 A：逐个部署（推荐，可以看到详细日志）

```bash
# 部署网页抓取服务
supabase functions deploy fetch-webpage-metadata

# 部署优先级计算服务
supabase functions deploy calculate-priority

# 部署批量优先级计算服务
supabase functions deploy batch-calculate-priority
```

**每个命令的输出**:
```
✅ Deployed fetch-webpage-metadata (update_id: xxx)
```

#### 方式 B：一键部署所有新函数

```bash
# 部署所有未部署的函数
supabase functions deploy
```

**警告**: 如果有已存在的函数，这会覆盖它们！

---

## 🧪 测试部署结果

### 测试 fetch-webpage-metadata

#### 在 Supabase Dashboard 测试

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard/project/glfymisjfvioyaylzkdj/functions)
2. 选择左侧 "Functions" → 点击 "fetch-webpage-metadata"
3. 点击 "Invoke" 按钮
4. 输入测试数据：
   ```json
   {
     "url": "https://example.com"
   }
   ```
5. 点击 "Invoke Function"

**期望响应**:
```json
{
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples...",
  "keywords": ["example", "domain"],
  "favicon": "https://example.com/favicon.ico"
}
```

#### 使用 curl 测试

```bash
# 在本地终端执行
curl --request POST 'https://glfymisjfvioyaylzkdj.functions.supabase.co/fetch-webpage-metadata' \
--header 'Authorization: Bearer YOUR_ANON_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{"url":"https://example.com"}'
```

### 测试 calculate-priority

**测试数据**:
```json
{
  "url": "https://react.dev/blog/react-19",
  "title": "React 19 教程：新特性完全指南",
  "description": "详细介绍 React 19 的新功能和改进",
  "user_id": "YOUR_USER_ID",
  "tags": ["React", "教程"]
}
```

**期望响应**:
```json
{
  "score": 95,
  "level": "high",
  "breakdown": {
    "base": 50,
    "keywords": 30,
    "learning": 20,
    "tags": 0
  }
}
```

### 测试 batch-calculate-priority

**测试数据**:
```json
{
  "link_ids": ["UUID1", "UUID2", "UUID3"]
}
```

**期望响应**:
```json
{
  "updated_count": 3,
  "failed_count": 0,
  "errors": []
}
```

---

## 🔧 环境变量配置

确保以下环境变量已设置（在 Supabase Dashboard → Settings → Edge Functions）：

| 变量名 | 说明 | 示例 |
|--------|------|--------|
| `SUPABASE_URL` | Supabase 项目 URL | `https://glfymisjfvioyaylzkdj.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | `eyJhb...（从 Dashboard 复制）` |
| `COZE_API_KEY` | Coze API Key（用于抽签） | 已配置 ✓ |

---

## 📊 部署后检查清单

部署完成后，逐项检查：

- [ ] 所有 3 个新函数都成功部署
- [ ] 在 Supabase Dashboard 可看到函数列表
- [ ] 函数日志无错误（Dashboard → Functions → Logs）
- [ ] 使用 curl 或 Postman 测试每个函数
- [ ] 验证 CORS 设置正常
- [ ] 验证超时限制正常（10 秒）
- [ ] 验证错误处理友好

---

## ❌ 常见错误排查

### 错误 1: "supabase: command not found"

**原因**: Supabase CLI 未安装或不在 PATH 中

**解决**:
```bash
# 检查安装路径
where supabase  # Windows

# 如果没有，重新安装
npm install -g supabase

# 重启终端
```

### 错误 2: "Not linked to a Supabase project"

**原因**: 项目未链接到 Supabase

**解决**:
```bash
supabase link --project-ref glfymisjfvioyaylzkdj
```

### 错误 3: "Failed to deploy function"

**原因**: 函数代码有语法错误或导入失败

**解决**:
```bash
# 本地测试函数
cd supabase/functions/fetch-webpage-metadata
deno run --allow-net --allow-env index.ts

# 查看错误信息并修复
```

### 错误 4: "CORS error"

**原因**: 前端调用时被 CORS 阻止

**解决**: 检查函数代码中的 `corsHeaders` 是否正确

---

## 📚 相关文档

- [Supabase Edge Functions 官方文档](https://supabase.com/docs/guides/functions)
- [Deno 部署指南](https://deno.com/deployment)
- [项目技术方案文档](./technical-design.md)

---

**部署完成后，返回 `docs/development-tasks.md` 继续开发 T-302**
