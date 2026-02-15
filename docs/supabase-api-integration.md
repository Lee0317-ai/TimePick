# 待尝试链接功能 - Supabase API 集成完成

> **TimePick - 待尝试链接管理功能**
>
> **集成完成日期**: 2026-02-15
> **组件数量**: 5 个
> **API 调用**: 15+ 个

---

## ✅ 已集成的组件

### 1. **AddTryQueueLinkDialog.tsx** (添加单个链接对话框)

#### API 调用:
- ✅ **获取当前用户**: `supabase.auth.getUser()`
- ✅ **检查重复 URL**: `supabase.rpc("check_url_exists", { p_url, p_user_id })`
- ✅ **插入链接**: `supabase.from("try_queue_links").insert()`
- ✅ **Edge Function**: `fetch-webpage-metadata` (获取网页元数据)
- ✅ **Edge Function**: `calculate-priority` (计算优先级)

#### 功能:
- 自动抓取网页标题、描述、favicon
- 自动计算优先级分数
- 检测并防止重复链接
- 添加自定义标签

---

### 2. **BatchImportDialog.tsx** (批量导入对话框)

#### API 调用:
- ✅ **获取当前用户**: `supabase.auth.getUser()`
- ✅ **批量插入链接**: `supabase.from("try_queue_links").insert()` (分批，每批 10 条)
- ✅ **Edge Function**: `batch-calculate-priority` (批量更新优先级)

#### 功能:
- 自动解析文本中的 URL
- 批量插入到数据库（每批 10 条，避免超时）
- 批量调用优先级计算
- 显示导入进度

---

### 3. **LearningFocusDialog.tsx** (学习重点设置对话框)

#### API 调用:
- ✅ **获取当前用户**: `supabase.auth.getUser()`
- ✅ **查询学习重点**: `supabase.from("learning_focus").select().eq("user_id")`
- ✅ **添加学习重点**: `supabase.from("learning_focus").insert()`
- ✅ **删除学习重点**: `supabase.from("learning_focus").delete().eq("id")`
- ✅ **更新同义词**: `supabase.from("learning_focus").update({ synonyms })`
- ✅ **Edge Function**: `batch-calculate-priority` (批量更新所有链接)

#### 功能:
- 查看所有学习重点
- 添加/删除学习重点
- 编辑同义词
- 批量更新所有链接的优先级

---

### 4. **TryQueuePage.tsx** (待尝试队列列表页面)

#### API 调用:
- ✅ **获取当前用户**: `supabase.auth.getUser()`
- ✅ **查询链接列表**: `supabase.from("try_queue_links").select().eq("user_id")`
- ✅ **更新状态**: `supabase.from("try_queue_links").update({ status, start_time })`
- ✅ **删除链接**: `supabase.from("try_queue_links").delete().eq("id")`

#### 功能:
- 按优先级分组显示（高/中/低）
- 按状态过滤（全部/未开始/已完成）
- 搜索过滤（标题、URL、标签）
- 开始尝试（更新状态为"trying"）
- 删除链接
- 查看详情

---

### 5. **CompleteTryQueueDialog.tsx** (完成对话框和评分系统)

#### API 调用:
- ✅ **获取当前用户**: `supabase.auth.getUser()`
- ✅ **查询文件夹列表**: `supabase.from("folders").select("id, name, icon")`
- ✅ **更新链接状态**: `supabase.from("try_queue_links").update({ status, rating, notes, complete_time })`
- ✅ **创建资源**: `supabase.from("resources").insert()` (如果选择转换为资源)

#### 功能:
- 选择完成状态（✅ 已完成 / ⏸️ 暂不尝试 / ❌ 已放弃）
- 1-5 星评分系统
- 添加备注
- 可选：转换为资源并选择文件夹

---

## 📊 数据库表结构

### try_queue_links 表:
```typescript
{
  id: string;                    // UUID
  user_id: string;               // 用户 UUID
  url: string;                   // 链接地址
  title: string | null;           // 标题
  description: string | null;      // 描述
  priority_level: string | null;   // 优先级等级: "high" | "medium" | "low"
  priority_score: number | null;   // 优先级分数: 0-100
  status: string | null;          // 状态: "unstarted" | "trying" | "completed" | "deferred" | "abandoned"
  tags: string[] | null;          // 标签数组
  start_time: string | null;      // 开始时间
  complete_time: string | null;   // 完成时间
  rating: number | null;          // 评分: 1-5
  notes: string | null;           // 备注
  is_priority_locked: boolean | null; // 是否锁定优先级
  queue_position: number | null;   // 队列位置
  archived_at: string | null;    // 归档时间
  converted_to_resource_id: string | null; // 转换为资源的 ID
  created_at: string | null;
  updated_at: string | null;
}
```

### learning_focus 表:
```typescript
{
  id: string;                   // UUID
  user_id: string;              // 用户 UUID
  name: string;                 // 学习重点名称
  weight: number | null;         // 权重: 0.5 | 1.0 | 2.0
  synonyms: string[] | null;     // 同义词数组
  is_paused: boolean | null;     // 是否暂停
  created_at: string | null;
  updated_at: string | null;
}
```

### folders 表:
```typescript
{
  id: string;                   // UUID
  user_id: string;              // 用户 UUID
  name: string;                 // 文件夹名称
  parent_id: string | null;      // 父文件夹 ID
  icon: string | null;           // 图标
  sort_order: number | null;     // 排序
  created_at: string | null;
  updated_at: string | null;
}
```

### resources 表:
```typescript
{
  id: string;                   // UUID
  user_id: string;              // 用户 UUID
  folder_id: string | null;     // 所属文件夹 ID
  name: string;                 // 资源名称
  url: string | null;           // URL
  content: string | null;        // 文本内容
  file_type: string | null;      // 文件类型
  file_size: number | null;      // 文件大小
  tags: string[] | null;         // 标签数组
  notes: string | null;          // 备注
  thumbnail_url: string | null;   // 缩略图 URL
  parent_id: string | null;      // 父资源 ID
  section_id: string | null;     // 所属章节
  module_id: string | null;      // 所属模块
  source_inspiration_id: string | null; // 来源灵感 ID
  created_at: string | null;
  updated_at: string | null;
}
```

---

## 🔌 Edge Functions

### 1. fetch-webpage-metadata
- **路径**: `/functions/v1/fetch-webpage-metadata`
- **方法**: POST
- **输入**: `{ url: string }`
- **输出**: `{ title, description, keywords, favicon }`
- **超时**: 10 秒

### 2. calculate-priority
- **路径**: `/functions/v1/calculate-priority`
- **方法**: POST
- **输入**: `{ url, title, description, user_id, tags }`
- **输出**: `{ score, level, breakdown }`
- **计算规则**:
  - 基础分: 50
  - 关键词匹配: ±30 / ±10 / -20
  - 学习相关性: ±40 / ±10
  - 标签调整: ±10

### 3. batch-calculate-priority
- **路径**: `/functions/v1/batch-calculate-priority`
- **方法**: POST
- **输入**: `{ link_ids: string[] }`
- **输出**: `{ updated_count, failed_count, errors }`
- **并发控制**: 最多 5 个并发请求

---

## 📝 使用示例

### 添加单个链接:
```typescript
// 用户输入 URL
// 1. 自动调用 fetch-webpage-metadata 获取标题
// 2. 自动调用 calculate-priority 计算优先级
// 3. 用户选择标签
// 4. 点击保存，插入到 try_queue_links 表
```

### 批量导入链接:
```typescript
// 1. 用户粘贴包含多个 URL 的文本
// 2. 正则解析所有 URL
// 3. 批量插入到 try_queue_links 表（每批 10 条）
// 4. 调用 batch-calculate-priority 批量更新优先级
```

### 开始尝试链接:
```typescript
// 1. 点击"开始尝试"按钮
// 2. 更新 status: "trying", start_time: new Date().toISOString()
```

### 完成链接:
```typescript
// 1. 点击链接进入详情页
// 2. 点击"完成"按钮
// 3. 选择完成状态（completed/deferred/abandoned）
// 4. 如果 completed，进行 1-5 星评分
// 5. 可选：转换为资源并选择文件夹
// 6. 更新 status, rating, notes, complete_time
```

---

## 🔐 安全性

### RLS (Row Level Security) 策略:
- ✅ 所有查询都带有 `user_id` 过滤
- ✅ 使用 Supabase Auth 认证
- ✅ Edge Functions 使用 ANON_KEY + Authorization header
- ✅ 前端直接调用不暴露 SERVICE_ROLE_KEY

### 输入验证:
- ✅ URL 格式验证（正则）
- ✅ 必填字段检查
- ✅ 重复 URL 检测（使用 RPC 函数）

---

## 🚀 性能优化

### 批量操作:
- ✅ 批量导入时每批 10 条（避免超时）
- ✅ 使用批量优先级计算 Edge Function
- ✅ 并发控制（最多 5 个并发）

### 前端优化:
- ✅ 使用 `useMemo` 缓存过滤和排序结果
- ✅ 使用 `useEffect` 仅在依赖项变化时重新加载
- ✅ 本地状态更新减少数据库查询

---

## 📋 下一步建议

1. **测试**:
   - 测试所有 API 调用是否正常
   - 测试错误处理是否友好
   - 测试并发操作

2. **优化**:
   - 添加缓存机制（React Query）
   - 添加乐观更新（Optimistic Updates）
   - 添加分页（如果数据量大）

3. **功能扩展**:
   - 添加编辑链接功能
   - 添加批量删除
   - 添加拖拽排序
   - 添加统计图表

---

## ✅ 验收标准

- [x] 所有组件都使用真实的 Supabase API
- [x] 所有 API 调用都有错误处理
- [x] 所有操作都有 Toast 提示
- [x] 用户认证状态检查完整
- [x] 类型安全（使用 TypeScript Database 类型）
- [x] 数据库结构与类型定义一致

---

**集成完成！** 所有组件已可以使用真实数据进行测试。
