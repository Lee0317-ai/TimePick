# 部署 Supabase Edge Functions 指南

## 📋 概述

本文档指导如何部署"待尝试队列"功能所需的 Supabase Edge Functions。

## 🔧 需要部署的函数

### 1. fetch-webpage-metadata
**路径**: `supabase/functions/fetch-webpage-metadata/index.ts`

**功能**:
- 获取网页 HTML 内容
- 提取标题和描述
- 计算基础优先级分数

### 2. calculate-priority
**路径**: `supabase/functions/calculate-priority/index.ts`

**功能**:
- 根据标题、域名计算优先级
- 检查学习相关性（使用 learning_focus 表）
- 应用标签调整

## 🚀 部署方法

### 方法 1: 使用 Supabase Dashboard（推荐）

1. 访问: https://supabase.com/dashboard
2. 选择你的项目: `glfymisjfvioaylzkdj`
3. 点击左侧菜单: **Edge Functions**
4. 点击 **New Function** 按钮
5. 对于每个函数：
   a. 函数名称输入: `fetch-webpage-metadata` 或 `calculate-priority`
   b. 选择 **Deno** 运行时
   c. **Verify URL**: 确认函数 URL 是 `https://deno.land/std@0.168.0/http/server.ts`
   d. 点击 **Save**
6. 在代码编辑器中粘贴对应 `index.ts` 文件的全部内容
7. 点击右上角 **Deploy** 按钮
8. 等待部署完成（会有绿色对勾）

**重要**:
- 使用 `@0.168.0` 版本的 Deno 库
- 不需要额外的 CORS 依赖
- 手动添加 CORS 头到每个 Response

### 方法 2: 使用 Supabase CLI（快速）

```bash
# 安装 Supabase CLI（如果还没安装）
npm install -g supabase

# 登录 Supabase
supabase login

# 链接到你的项目
cd D:\AIWork\TimePick
supabase link --project-ref glfymisjfvioaylzkdj

# 部署函数
supabase functions deploy fetch-webpage-metadata
supabase functions deploy calculate-priority

# 验证部署
supabase functions list
```

## ✅ 验证部署

部署完成后，在首页测试：

1. 点击"添加链接"按钮
2. 输入一个网页 URL（如：`https://www.github.com`）
3. 等待自动获取标题
4. 应该看到：
   - 成功提示："网页信息获取成功"
   - 标题自动填充
   - 优先级自动选择

## 📝 故障排除

### 如果 404 错误 persists

1. 检查函数 URL 是否正确：
   - `https://glfymisjfvioaylzkdj.supabase.co/functions/v1/fetch-webpage-metadata`
   - `https://glfymisjfvioaylzkdj.supabase.co/functions/v1/calculate-priority`

2. 在 Supabase Dashboard 查看函数状态：
   - 应该显示为 **Active**
   - 查看函数日志确认是否有错误

3. 确认 RLS 已禁用：
   ```sql
   ALTER TABLE "try_queue_links"
   DISABLE ROW LEVEL SECURITY;
   ```

### 如果响应慢

Edge Functions 可能有冷启动时间（1-2秒），这是正常的。

### 如果自动识别不准确

这是预期行为，优先级计算是基于简单规则：
- GitHub/StackOverflow/GitLab → 高优先级 (80分)
- YouTube/Bilibili → 中优先级 (50分)
- 其他网站 → 低优先级 (20分)

用户可以手动调整。

## 🔗 相关文件

- 前端组件: `src/components/AddTryQueueLinkDialog.tsx`
- Fetch 函数: `supabase/functions/fetch-webpage-metadata/index.ts`
- Priority 函数: `supabase/functions/calculate-priority/index.ts`
- 禁用 RLS 文档: `docs/disable-rls.sql`

## 📱 下一步优化

可以考虑：
1. 添加更多网站的优先级规则
2. 使用 AI 来智能评分
3. 添加 OCR 功能识别网页截图
4. 缓存常用网站的元数据
