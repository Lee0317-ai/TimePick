# TimePick 开发进度报告

> **日期**: 2026-02-15
> **当前阶段**: 待尝试链接管理功能开发
> **完成进度**: 5/18 任务完成 (28%)

---

## ✅ 已完成任务 (8/18, 44%)

### 阶段 1：数据层

#### T-102: 创建 TypeScript 类型定义 ✅
**文件**: `src/integrations/supabase/types.ts`

**更新内容**:
- ✅ 添加 `learning_focus` 表类型（Row/Insert/Update/Relationships）
- ✅ 添加 `try_queue_links` 表类型（17个字段）
- ✅ 更新 `profiles` 表类型（新增 `default_try_queue_folder_id` 字段）
- ✅ 添加新函数类型：
  - `check_url_exists`: 检查URL是否重复
  - `archive_deferred_links`: 自动归档函数

---

### 阶段 2：后端服务（Supabase Edge Functions）

#### T-201: 实现网页内容抓取服务 ✅
**文件**: `supabase/functions/fetch-webpage-metadata/index.ts`

**功能**:
- ✅ 接收 URL 参数
- ✅ 使用 fetch 获取网页（10秒超时）
- ✅ 解析 HTML，提取：
  - `<title>` 标题
  - `<meta name="description">` 描述
  - `<meta name="keywords">` 关键词
  - `<link rel="icon">` favicon（可选）
- ✅ 错误处理：
  - 超时 → 408 Timeout
  - 网络错误 → 500 Network Error
  - 不支持类型 → 400 Unsupported Type
- ✅ CORS 支持

**API 响应示例**:
```json
{
  "title": "React 19 新特性介绍",
  "description": "React 19 带来了...",
  "keywords": ["React", "前端", "JavaScript"],
  "favicon": "https://react.dev/favicon.ico"
}
```

#### T-202: 实现优先级计算服务 ✅
**文件**: `supabase/functions/calculate-priority/index.ts`

**功能**:
- ✅ 接收参数：`url`, `title`, `description`, `user_id`, `tags`
- ✅ 三重优先级计算：
  1. **关键词分析**：
     - 高优先级关键词（+30分）：速查、教程、官方文档...
     - 中优先级关键词（+10分）：指南、技巧...
     - 低优先级关键词（-20分）：可选、参考...
  2. **学习相关性分析**：
     - 查询用户 `learning_focus` 表
     - 完全匹配：`+40 * weight`
     - 部分匹配：`+10 * weight`
     - 不匹配：`-10`
  3. **标签调整**：
     - 🔥 紧急 → 强制高优先级
     - ⭐ 必看 → +20分
     - 🔗 有空再看 → -10分
- ✅ 优先级等级划分：
  - ≥70 → high
  - 40-69 → medium
  - <40 → low

**API 响应示例**:
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

#### T-203: 实现批量优先级计算服务 ✅
**文件**: `supabase/functions/batch-calculate-priority/index.ts`

**功能**:
- ✅ 接收 `link_ids` 数组
- ✅ 并发控制：最多 5 个并发
- ✅ 批量调用 `calculate-priority` 函数
- ✅ 批量更新数据库
- ✅ 统计和错误报告

**API 响应示例**:
```json
{
  "updated_count": 48,
  "failed_count": 2,
  "errors": ["uuid1: timeout", "uuid2: ..."]
}
```

---

### 阶段 3：前端 UI（React 组件）

#### T-301: 创建侧边栏"待尝试"入口和路由 ✅
**文件**:
- `src/pages/TryQueue.tsx` (新建)
- `src/router.tsx` (更新)
- `src/pages/Home.tsx` (更新)

**更新内容**:
- ✅ 创建 `TryQueue.tsx` 页面组件（占位符）
- ✅ 添加路由：`/try-queue`
- ✅ 在侧边栏添加"待尝试"导航项
  - 图标：`ListTodo` (lucide-react)
  - 位置：搜索按钮和新增按钮之间
  - 追踪事件：`try_queue_click`

---

## 🔄 进行中的任务

### T-302: 实现快速添加待尝试链接对话框（下一步）
**预计内容**:
- 对话框 UI 组件
- URL 输入框（带验证）
- 标题输入框（自动填充，可编辑）
- 系统推荐优先级显示（只读）
- 标签选择器（快速标签 + 自定义）
- 集成 `fetch-webpage-metadata` 和 `calculate-priority`
- 重复 URL 检测和提示

---

## 📋 待开发任务（13个）

### 阶段 3 续：
- [ ] T-302: 快速添加对话框
- [ ] T-303: 批量导入对话框
- [ ] T-304: 学习重点设置对话框
- [ ] T-305: 待尝试队列列表页面（核心）
- [ ] T-306: 完成对话框和评分系统

### 阶段 4：
- [ ] T-401: E2E 测试
- [ ] T-402: 性能测试

### 阶段 5：
- [ ] T-501: 代码优化与重构
- [ ] T-502: 部署与发布

---

## 🚀 下一步行动

### 立即可做：

1. **部署 Edge Functions 到 Supabase**
   ```bash
   # 在项目根目录执行
   supabase functions deploy fetch-webpage-metadata
   supabase functions deploy calculate-priority
   supabase functions deploy batch-calculate-priority
   ```

2. **测试 Edge Functions**
   - 使用 Supabase Dashboard 测试每个函数
   - 验证错误处理和响应格式

3. **开始 T-302: 快速添加对话框开发**
   - 创建 `src/components/AddTryQueueLinkDialog.tsx`
   - 实现表单和验证
   - 集成 Edge Functions

### 需要用户确认：

1. **快速标签配置**：确认使用哪些快速标签？
   - 默认：🔥紧急、⭐必看、📚学习、🛠️工具、🎨设计、📝阅读、🔗有空调看、➕添加待尝试
   - 是否需要调整？

2. **优先级算法调整**：当前算法是否符合预期？
   - 基础分：50
   - 高优先级阈值：70
   - 中优先级阈值：40
   - 是否需要调整权重？

3. **开发优先级**：下一步应该：
   - A) 先部署测试 Edge Functions（推荐）
   - B) 直接开发 T-302 对话框
   - C) 其他？

请告诉我下一步应该做什么！

---

**生成时间**: 2026-02-15 (自动更新)
