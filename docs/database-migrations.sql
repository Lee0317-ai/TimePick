-- TimePick Database Migration Script
-- 功能：待尝试链接管理（阶段六）
-- 版本：2.0
-- 日期：2026-02-15
-- 作者：Claude (Sonnet 4.5)

-- ============================================================================
-- 1. 创建新表：try_queue_links (待尝试链接)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.try_queue_links (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 用户关联
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 链接信息
    url TEXT NOT NULL,
    title TEXT,
    description TEXT, -- 网页 meta description

    -- 优先级相关
    priority_score INTEGER DEFAULT 50, -- 原始分数
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('high', 'medium', 'low')),
    queue_position INTEGER, -- 队列位置（第几位）
    is_priority_locked BOOLEAN DEFAULT false, -- 是否锁定优先级

    -- 标签和分类
    tags TEXT[] DEFAULT '{}', -- 标签数组（如['React', '学习']）

    -- 状态管理
    status TEXT DEFAULT 'unstarted' CHECK (status IN (
        'unstarted',   -- 未开始
        'trying',      -- 尝试中
        'completed',   -- 已完成
        'deferred',    -- 暂不尝试
        'abandoned',   -- 放弃
        'archived'     -- 已归档
    )),

    -- 时间戳
    start_time TIMESTAMPTZ,       -- 开始尝试时间
    complete_time TIMESTAMPTZ,    -- 完成时间
    archived_at TIMESTAMPTZ,      -- 归档时间

    -- 评分和备注
    rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 1-5 星评分
    notes TEXT, -- 用户备注

    -- 资源关联
    converted_to_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. 创建新表：learning_focus (学习重点)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.learning_focus (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 用户关联
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 学习重点信息
    name TEXT NOT NULL, -- 学习重点名称（如"React"、"UI设计"）

    -- 权重和同义词
    weight NUMERIC(2, 1) DEFAULT 1.0 CHECK (weight BETWEEN 0.5 AND 2.0), -- 权重 0.5/1.0/2.0
    synonyms TEXT[] DEFAULT '{}', -- 同义词数组（如['React.js', 'ReactJS', '前端框架']）

    -- 状态管理
    is_paused BOOLEAN DEFAULT false, -- 是否暂停

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. 修改现有表：profiles (用户资料)
-- ============================================================================

-- 添加默认文件夹字段（转化资源时的默认选择）
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS default_try_queue_folder_id UUID
    REFERENCES folders(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. 创建索引（性能优化）
-- ============================================================================

-- try_queue_links 索引
CREATE INDEX IF NOT EXISTS idx_try_queue_links_user_id
    ON public.try_queue_links(user_id);

CREATE INDEX IF NOT EXISTS idx_try_queue_links_status
    ON public.try_queue_links(status);

CREATE INDEX IF NOT EXISTS idx_try_queue_links_priority_level
    ON public.try_queue_links(priority_level);

CREATE INDEX IF NOT EXISTS idx_try_queue_links_user_status
    ON public.try_queue_links(user_id, status);

CREATE INDEX IF NOT EXISTS idx_try_queue_links_user_priority
    ON public.try_queue_links(user_id, priority_level, queue_position);

CREATE INDEX IF NOT EXISTS idx_try_queue_links_url
    ON public.try_queue_links(url); -- 用于去重检测

-- learning_focus 索引
CREATE INDEX IF NOT EXISTS idx_learning_focus_user_id
    ON public.learning_focus(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_focus_is_paused
    ON public.learning_focus(is_paused);

-- ============================================================================
-- 5. 创建触发器：自动更新 updated_at 字段
-- ============================================================================

-- try_queue_links updated_at 触发器
CREATE OR REPLACE FUNCTION update_try_queue_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_try_queue_links_updated_at
    BEFORE UPDATE ON public.try_queue_links
    FOR EACH ROW
    EXECUTE FUNCTION update_try_queue_links_updated_at();

-- learning_focus updated_at 触发器
CREATE OR REPLACE FUNCTION update_learning_focus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learning_focus_updated_at
    BEFORE UPDATE ON public.learning_focus
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_focus_updated_at();

-- ============================================================================
-- 6. 启用 Row Level Security (RLS)
-- ============================================================================

-- try_queue_links RLS
ALTER TABLE public.try_queue_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own try_queue_links"
    ON public.try_queue_links FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own try_queue_links"
    ON public.try_queue_links FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own try_queue_links"
    ON public.try_queue_links FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own try_queue_links"
    ON public.try_queue_links FOR DELETE
    USING (auth.uid() = user_id);

-- learning_focus RLS
ALTER TABLE public.learning_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning_focus"
    ON public.learning_focus FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning_focus"
    ON public.learning_focus FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning_focus"
    ON public.learning_focus FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning_focus"
    ON public.learning_focus FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 7. 创建辅助函数：去重检测 URL
-- ============================================================================

-- 检查用户的待尝试队列中是否已存在某个 URL
CREATE OR REPLACE FUNCTION check_url_exists(
    p_user_id UUID,
    p_url TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.try_queue_links
        WHERE user_id = p_user_id
          AND url = p_url
          AND status NOT IN ('archived', 'abandoned')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. 创建辅助函数：自动归档（定时任务）
-- ============================================================================

-- 归档超过 30 天的"暂不尝试"链接
CREATE OR REPLACE FUNCTION archive_deferred_links()
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- 更新状态为 archived
    UPDATE public.try_queue_links
    SET
        status = 'archived',
        archived_at = NOW(),
        updated_at = NOW()
    WHERE status = 'deferred'
      AND complete_time < NOW() - INTERVAL '30 days'
      AND archived_at IS NULL;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. 创建视图：待尝试队列统计
-- ============================================================================

-- 用户待尝试队列统计（按状态和优先级）
CREATE OR REPLACE VIEW view_try_queue_stats AS
SELECT
    user_id,
    status,
    priority_level,
    COUNT(*) as count
FROM public.try_queue_links
WHERE status NOT IN ('archived', 'abandoned')
GROUP BY user_id, status, priority_level;

-- ============================================================================
-- 10. 数据迁移注释（用于版本控制）
-- ============================================================================

COMMENT ON TABLE public.try_queue_links IS '待尝试链接表 - PRD-002 阶段六';
COMMENT ON COLUMN public.try_queue_links.priority_score IS '优先级原始分数（0-100+）';
COMMENT ON COLUMN public.try_queue_links.priority_level IS '优先级等级：high(≥70) / medium(40-69) / low(<40)';
COMMENT ON COLUMN public.try_queue_links.is_priority_locked IS '是否锁定优先级（防止自动重新计算覆盖）';
COMMENT ON COLUMN public.try_queue_links.status IS '状态：unstarted/trying/completed/deferred/abandoned/archived';

COMMENT ON TABLE public.learning_focus IS '学习重点表 - PRD-002 阶段六';
COMMENT ON COLUMN public.learning_focus.weight IS '权重：0.5(次要) / 1.0(正常) / 2.0(最优先)';
COMMENT ON COLUMN public.learning_focus.synonyms IS '同义词数组，用于扩展关键词匹配范围';
COMMENT ON COLUMN public.learning_focus.is_paused IS '是否暂停（暂停后不计入优先级计算）';

COMMENT ON FUNCTION check_url_exists IS '检查用户的待尝试队列中是否已存在某个 URL';
COMMENT ON FUNCTION archive_deferred_links IS '归档超过 30 天的暂不尝试链接（定时任务）';

-- ============================================================================
-- 11. 示例数据（可选，仅用于测试）
-- ============================================================================

-- 注意：生产环境不执行此部分
-- 取消注释以插入测试数据

/*
-- 示例学习重点
INSERT INTO public.learning_focus (user_id, name, weight, synonyms)
VALUES
    (auth.uid(), 'React', 2.0, ARRAY['React.js', 'ReactJS', '前端框架']),
    (auth.uid(), 'UI设计', 1.0, ARRAY['UI/UX', '界面设计', 'Figma', 'Sketch']),
    (auth.uid(), 'TypeScript', 0.5, ARRAY['TS', '类型系统']);

-- 示例待尝试链接
INSERT INTO public.try_queue_links (
    user_id,
    url,
    title,
    priority_score,
    priority_level,
    tags,
    status
)
VALUES
    (auth.uid(), 'https://react.dev/blog/react-19', 'React 19 新特性介绍', 85, 'high', ARRAY['React', '学习'], 'unstarted'),
    (auth.uid(), 'https://typescriptlang.org/docs/handbook', 'TypeScript 官方文档', 60, 'medium', ARRAY['TypeScript', '文档'], 'unstarted'),
    (auth.uid(), 'https://figma.com/community', 'Figma 社区资源', 35, 'low', ARRAY['设计', '工具'], 'unstarted');
*/

-- ============================================================================
-- 迁移完成
-- ============================================================================

-- 验证迁移
DO $$
DECLARE
    v_try_queue_links_table_exists BOOLEAN;
    v_learning_focus_table_exists BOOLEAN;
    v_profiles_column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'try_queue_links'
    ) INTO v_try_queue_links_table_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'learning_focus'
    ) INTO v_learning_focus_table_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'default_try_queue_folder_id'
    ) INTO v_profiles_column_exists;

    IF v_try_queue_links_table_exists
       AND v_learning_focus_table_exists
       AND v_profiles_column_exists THEN
        RAISE NOTICE '✅ Migration 2.0 completed successfully!';
    ELSE
        RAISE EXCEPTION '❌ Migration 2.0 failed! Please check the errors above.';
    END IF;
END $$;
