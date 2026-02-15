# Edge Functions 测试指南

> **TimePick - 待尝试链接管理功能**
>
> **测试日期**: 2026-02-15
> **测试目标**: 验证 3 个 Edge Functions 是否正常工作

---

## 📋 测试清单

### 1. fetch-webpage-metadata (网页抓取服务)

### 2. calculate-priority (优先级计算服务)

### 3. batch-calculate-priority (批量优先级计算服务)

---

## 1️⃣ 测试 fetch-webpage-metadata

### 测试方法

#### 方法 A：使用 Supabase Dashboard（推荐）

1. **打开 Function 详情**
   - 访问: https://supabase.com/dashboard/project/glflgmisjfvioyaylzkdj/functions
   - 找到并点击 `fetch-webpage-metadata`
   - 点击 "Invoke" 按钮

2. **配置测试参数**
   ```json
   {
     "url": "https://react.dev"
   }
   ```

3. **发送请求**
   - 点击 "Invoke Function" 按钮

4. **✅ 期望成功响应**
   ```json
   {
     "title": "React – The library for web and native user interfaces",
     "description": "React makes it painless to create interactive UIs. Design simple views for each state...",
     "keywords": ["React", "JavaScript", "UI", "library", "framework"],
     "favicon": "https://react.dev/favicon.ico"
   }
   ```

5. **⚠️ 期望错误响应**
   ```json
   {
     "error": "TIMEOUT",
     "message": "网页抓取超时（10秒）"
   }
   ```

#### 方法 B：使用 curl（高级测试）

1. **准备测试命令**
   ```bash
   # 替换 YOUR_ANON_KEY 为你的实际密钥
   curl --request POST 'https://glflgmisjfvioyaylzkdj.supabase.co/functions/v1/fetch-webpage-metadata' \
   --header 'Authorization: Bearer YOUR_ANON_KEY' \
   --header 'Content-Type: application/json' \
   --data-raw '{"url":"https://react.dev"}'
   ```

2. **✅ 成功响应示例**
   ```json
   {
     "title": "React – The library for web and native user interfaces",
     "description": "React makes it painless to create interactive UIs...",
     "keywords": ["React", "JavaScript"],
     "favicon": "https://react.dev/favicon.ico"
   }
   ```

---

## 2️⃣ 测试 calculate-priority

### 测试方法

#### 方法 A：使用 Supabase Dashboard

1. **打开 Function 详情**
   - 访问: https://supabase.com/dashboard/project/glflgmisjfvioyaylzkdj/functions
   - 找到并点击 `calculate-priority`
   - 点击 "Invoke" 按钮

2. **配置测试参数**
   ```json
   {
     "url": "https://react.dev/blog/react-19",
     "title": "React 19 新特性介绍",
     "description": "详细介绍 React 19 的新功能和改进",
     "user_id": "YOUR_USER_ID",  // 需要从数据库查询你的 user_id
     "tags": ["React", "教程"]
   }
   ```

3. **✅ 期望成功响应**
   ```json
   {
     "score": 85,
     "level": "high",
     "breakdown": {
       "base": 50,
       "keywords": 30,
       "learning": 20,
       "tags": -15
     }
   }
   ```

4. **📊 分数说明**
   - 基础分: 50
   - 关键词 "教程" +30 分
   - 学习相关性 "React" 完全匹配 +20 分
   - 标签调整: -15 分（可能因为标签中有"🔗有空再看"）
   - 最终分数: 50 + 30 + 20 - 15 = 85
   - 等级: ≥70 → high

#### 方法 B：使用 curl

1. **准备测试命令**
   ```bash
   curl --request POST 'https://glflgmisjfvioyaylzkdj.supabase.co/functions/v1/calculate-priority' \
   --header 'Authorization: Bearer YOUR_ANON_KEY' \
   --header 'Content-Type: application/json' \
   --data-raw '{"url":"https://react.dev/blog/react-19","title":"React 19 教程","description":"...","user_id":"YOUR_USER_ID","tags":["React","教程"]}'
   ```

---

## 3️⃣ 测试 batch-calculate-priority

### 测试方法

#### 方法 A：使用 Supabase Dashboard

1. **打开 Function 详情**
   - 访问: https://supabase.com/dashboard/project/glflgmisjfvioyaylzkdj/functions
   - 找到并点击 `batch-calculate-priority`
   - 点击 "Invoke" 按钮

2. **配置测试参数**
   ```json
   {
     "link_ids": [
       "UUID_1",
       "UUID_2",
       "UUID_3"
     ]
   }
   ```
   - **注意**: 需要先在 `try_queue_links` 表中创建几条测试记录，获取它们的 UUID

3. **✅ 期望成功响应**
   ```json
   {
     "updated_count": 3,
     "failed_count": 0,
     "errors": []
   }
   ```

#### 方法 B：使用 curl

1. **准备测试命令**
   ```bash
   curl --request POST 'https://glflgmisjfvioyaylzkdj.supabase.co/functions/v1/batch-calculate-priority' \
   --header 'Authorization: Bearer YOUR_ANON_KEY' \
   --header 'Content-Type: application/json' \
   --data-raw '{"link_ids":["UUID_1","UUID_2","UUID_3"]}'
   ```

---

## 🔍 如何获取 user_id

### 方法 1：使用 Supabase Table Editor

1. **访问 Table Editor**
   - 访问: https://supabase.com/dashboard/project/glflgmisjfvioyaylzkdj/editor
   - 选择左侧 `Tables` → 点击 `profiles`

2. **查询你的记录**
   - 点击 "View data" 按钮
   - 找到你的用户记录

3. **复制 user_id**
   - 在 `id` 列中复制你的 UUID

### 方法 2：使用 Supabase JS Console

1. **打开 JS Console**
   - 访问: https://supabase.com/dashboard/project/glflgmisjfvioyaylzkdj/js

2. **运行查询**
   ```javascript
   // 在 Console 中运行
   const { data, error } = await supabase
     .from('profiles')
     .select('id')
     .limit(1)
     .single();

   console.log('User ID:', data?.id);
   ```

---

## ✅ 测试验收标准

### fetch-webpage-metadata

- [ ] **成功案例 1**: 测试正常网页（如 react.dev）
  - 能正确返回标题
  - 能正确返回描述
  - 能正确返回 favicon
  - 响应时间 < 3 秒

- [ ] **成功案例 2**: 测试有 meta keywords 的网页
  - 能正确提取关键词

- [ ] **错误案例 1**: 测试超时（10 秒）
  - 返回 `error: "TIMEOUT"`
  - 返回状态码 408

- [ ] **错误案例 2**: 测试无效 URL
  - 返回 `error: "INVALID_URL"`
  - 返回状态码 400

### calculate-priority

- [ ] **成功案例 1**: 高优先级链接（如 React 教程）
  - score ≥ 70
  - level = "high"
  - breakdown 显示正确的分数明细

- [ ] **成功案例 2**: 中优先级链接
  - score 在 40-69 之间
  - level = "medium"

- [ ] **成功案例 3**: 学习相关性匹配
  - 如果设置了学习重点 "React"
  - 能正确计算学习相关性分数

- [ ] **错误案例 1**: 缺少必填字段
  - 缺少 url 或 title
  - 返回状态码 400

### batch-calculate-priority

- [ ] **成功案例**: 批量处理 3 条链接
  - updated_count = 3
  - failed_count = 0
  - 响应时间 < 5 秒

- [ ] **错误案例**: 部分 link_ids 无效
  - 返回错误数组
  - 指明哪些 UUID 无效

---

## 🐛 调试检查清单

在开始测试前，请确认：

### 环境检查

- [ ] **Supabase 项目已链接**
  - 运行 `npx supabase list`
  - 应该显示项目名称

- [ ] **已在本地登录过 Supabase**
  - 运行 `npx supabase login`
  - 或通过 Dashboard 登录

- [ ] **Edge Functions 已部署**
  - 访问 Dashboard → Functions
  - 应该能看到 3 个函数

### 准备工作

- [ ] **已获取 ANON_KEY**
  - 从 Dashboard → Settings → API Keys 复制
  - 或检查 `.env` 文件

- [ ] **已创建测试数据**
  - 在 `try_queue_links` 表中创建几条测试记录
  - 获取它们的 UUID 用于测试

- [ ] **了解当前学习重点配置**
  - 查看 `learning_focus` 表结构
  - 了解优先级计算规则

---

## 📊 测试记录模板

建议按以下格式记录测试结果：

```markdown
## 测试执行记录

### 1. fetch-webpage-metadata
- 测试时间: 2026-02-15 14:30
- 测试方法: Dashboard / curl
- 测试 URL: https://react.dev
- ✅ 通过: 成功返回标题和描述
- ⏱️ 超时: (如 > 10 秒)

### 2. calculate-priority
- 测试时间: 2026-02-15 14:35
- 测试方法: Dashboard
- 测试数据: URL=xxx, title=xxx, user_id=xxx
- ✅ 通过: score=85, level=high
- 分数明细: 基础50 + 关键词30 + 学习相关20 - 标签-15 = 85

### 3. batch-calculate-priority
- 测试时间: 2026-02-15 14:40
- 测试方法: Dashboard
- 测试 UUID: [uuid1, uuid2, uuid3]
- ✅ 通过: updated_count=3, failed_count=0
```

---

## 🚨 常见问题排查

### 问题 1: 401 Unauthorized

**错误信息**:
```
Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

**解决方案**:
1. 运行 `npx supabase login`
2. 或在请求头中添加正确的 token

### 问题 2: 404 Method Not Allowed

**错误信息**:
```
https://glflgmisjfvioyaylzkdj.supabase.co/functions/v1/fetch-webpage-metadata - 404 (Method Not Allowed)
```

**解决方案**:
1. 检查 HTTP 方法是否为 POST
2. 检查 Content-Type 是否为 application/json
3. 检查 Authorization header 是否正确

### 问题 3: 函数未部署

**错误信息**:
```
Failed to deploy function: fetch-webpage-metadata
```

**解决方案**:
1. 检查部署命令是否成功完成
2. 在 Dashboard Functions 中验证函数是否显示为 Deployed
3. 查看 Function Logs 确认部署状态

### 问题 4: CORS 错误

**错误信息**:
```
Failed to fetch
CORS error: ...
```

**解决方案**:
1. 在 Edge Function 代码中确认已添加 CORS headers
2. 检查 Supabase Project Settings → API → CORS settings

---

## 📞 快速命令参考

```bash
# 1. 列出所有 Edge Functions
npx supabase functions list

# 2. 查看 Function Logs
npx supabase functions logs fetch-webpage-metadata

# 3. 测试单个函数（Dashboard 方法）
npx supabase functions deploy fetch-webpage-metadata

# 4. 登录 Supabase
npx supabase login

# 5. 链接项目
npx supabase link --project-ref glflgmisjfvioyaylzkdj

# 6. 查看数据库
npx supabase db fetch-webpage-metadata
```

---

## ✅ 测试完成标准

所有测试通过后，你应该能够：

- [ ] **3 个 Edge Functions 都正常工作**
- [ ] **能够成功抓取网页元数据**（标题、描述、关键词）
- [ ] **能够正确计算优先级**（分数、等级、明细）
- [ ] **能够批量处理优先级计算**
- [ ] **错误处理友好且准确**

---

**开始测试吧！** 遇到问题随时告诉我。
