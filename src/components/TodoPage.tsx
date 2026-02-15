import { useState, useEffect, useMemo } from "react";
import { ArrowRightCircle, CheckCircle2, Circle, MoreHorizontal, Plus, Star, AlertCircle, ArrowLeft, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AddTodoDialog from "@/components/AddTodoDialog";
import CompleteTodoDialog from "@/components/CompleteTodoDialog";

// 类型定义
interface TodoItem {
  id: string;
  url: string;
  title: string;
  priority_level: "high" | "medium" | "low";
  priority_score: number;
  status: "unstarted" | "trying" | "completed" | "deferred" | "abandoned";
  tags: string[];
  start_time: string | null;
  complete_time: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 优先级对应的颜色和图标
const PRIORITY_CONFIG = {
  high: {
    color: "text-red-600 bg-red-50",
    icon: <AlertCircle className="h-4 w-4" />,
    label: "高优先级",
  },
  medium: {
    color: "text-yellow-600 bg-yellow-50",
    icon: <AlertCircle className="h-4 w-4" />,
    label: "中优先级",
  },
  low: {
    color: "text-green-600 bg-green-50",
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "低优先级",
  },
};

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}秒前`;
  if (diffMins < 3600) return `${Math.floor(diffMins / 60)}分钟前`;
  if (diffMins < 864000) return `${Math.floor(diffMins / 3600)}小时前`;
  return date.toLocaleString('zh-CN');
};

export default function TryQueuePage() {
  const navigate = useNavigate();

  // 状态
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unstarted" | "trying" | "completed" | "deferred" | "abandoned">('all');
  const [selectedLink, setSelectedLink] = useState<TodoItem | null>(null);
  const [links, setLinks] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [completingLink, setCompletingLink] = useState<TodoItem | null>(null);

  // 加载链接列表
  useEffect(() => {
    const loadLinks = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.id) {
          setIsLoading(false);
          return;
        }

        let query = supabase
          .from("try_queue_links")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // 状态过滤
        if (statusFilter !== 'all') {
          query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        setLinks((data || []).map(link => ({
          id: link.id,
          url: link.url,
          title: link.title || "",
          priority_level: (link.priority_level || "medium") as "high" | "medium" | "low",
          priority_score: link.priority_score || 50,
          status: (link.status || "unstarted") as "unstarted" | "trying" | "completed" | "deferred" | "abandoned",
          tags: link.tags || [],
          start_time: link.start_time,
          complete_time: link.complete_time,
          rating: link.rating,
          notes: link.notes,
          created_at: link.created_at || "",
          updated_at: link.updated_at || "",
        })));
      } catch (error) {
        console.error("Error loading links:", error);
        toast.error("加载失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadLinks();
  }, [statusFilter, refreshTrigger]);

  // 根据状态和筛选条件过滤链接
  const filteredLinks = useMemo(() => {
    let result = links;

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(link => link.status === statusFilter);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(link =>
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        (link.tags && link.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    return result;
  }, [viewMode, statusFilter, searchQuery, links]);

  // 处理开始尝试
  const handleStartTry = async (link: TodoItem) => {
    try {
      const { error } = await supabase
        .from("try_queue_links")
        .update({
          status: "trying",
          start_time: new Date().toISOString(),
        })
        .eq("id", link.id);

      if (error) throw error;

      // 更新本地状态
      setLinks(links.map(l =>
        l.id === link.id
          ? { ...l, status: 'trying' as const, start_time: new Date().toISOString() }
          : l
      ));

      toast.success("开始任务", { description: `开始任务：${link.title}` });

      // 在新标签页打开链接
      window.open(link.url, '_blank');
    } catch (error) {
      console.error("Error starting try:", error);
      toast.error("操作失败");
    }
  };

  // 处理继续尝试（从暂不尝试恢复）
  const handleResumeTry = async (link: TodoItem) => {
    try {
      const { error } = await supabase
        .from("try_queue_links")
        .update({
          status: "trying",
          start_time: new Date().toISOString(),
        })
        .eq("id", link.id);

      if (error) throw error;

      // 更新本地状态
      setLinks(links.map(l =>
        l.id === link.id
          ? { ...l, status: 'trying' as const, start_time: new Date().toISOString() }
          : l
      ));

      toast.success("继续尝试", { description: `继续任务：${link.title}` });

      // 在新标签页打开链接
      window.open(link.url, '_blank');
    } catch (error) {
      console.error("Error resuming try:", error);
      toast.error("操作失败");
    }
  };

  // 打开链接
  const handleOpenLink = (link: TodoItem) => {
    window.open(link.url, '_blank');
  };

  // 查看详情
  const handleViewDetail = (link: TodoItem) => {
    setSelectedLink(link as TodoItem);
  };

  // 删除链接
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      const { error } = await supabase
        .from("try_queue_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLinks(links.filter(l => l.id !== id));

      toast.success("已删除", { description: "该记录已删除" });
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("删除失败");
    }
  };

  // 处理完成任务对话框
  const handleOpenCompleteDialog = (link: TodoItem) => {
    setCompletingLink(link);
  };

  // 处理添加对话框关闭
  const handleAddDialogClose = (open: boolean) => {
    console.log('[TryQueue] Dialog open changed:', open);
    setShowAddDialog(open);
    if (!open) {
      // 对话框关闭时刷新列表
      console.log('[TryQueue] Dialog closed, refreshing list...');
      // 触发重新加载
      setRefreshTrigger(prev => {
        const newValue = prev + 1;
        console.log('[TryQueue] refreshTrigger updated to:', newValue);
        return newValue;
      });
    }
  };

  // 处理添加按钮点击
  const handleAddClick = () => {
    console.log('[TryQueue] Add button clicked');
    setShowAddDialog(true);
    console.log('[TryQueue] showAddDialog set to true');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground ml-2">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowRightCircle className="h-5 w-5 rotate-180" />
          </Button>
          <h1 className="text-3xl font-bold mb-0">任务清单</h1>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-2">
          {/* 添加任务按钮 */}
          <Button
            size="sm"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加任务
          </Button>

          {/* 视图切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} className="w-32">
                {viewMode === 'grouped' ? '按优先级' : '列表'}
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode('list')}>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  列表
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setViewMode('grouped')}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">🔊</Badge>
                  分组
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 状态过滤 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { value: 'all', label: '全部' },
          { value: 'unstarted', label: '未开始' },
          { value: 'trying', label: '尝试中' },
          { value: 'completed', label: '已完成' },
          { value: 'deferred', label: '暂不尝试' },
          { value: 'abandoned', label: '已放弃' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value as typeof statusFilter)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="flex-1">
        <Input
          placeholder="搜索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 主内容区 */}
      {selectedLink ? (
        // 链接详情视图
        <LinkDetailView
          link={selectedLink}
          onBack={() => setSelectedLink(null)}
          onStartTry={handleStartTry}
          onCompleteTry={handleOpenCompleteDialog}
          onOpenLink={handleOpenLink}
          onResumeTry={handleResumeTry}
        />
      ) : (
        // 链接列表视图
        <LinkListView
          links={filteredLinks}
          viewMode={viewMode}
          onStartTry={handleStartTry}
          onOpenLink={handleOpenLink}
          onViewDetail={handleViewDetail}
          onDelete={handleDelete}
          onCompleteTry={handleOpenCompleteDialog}
          onResumeTry={handleResumeTry}
        />
      )}

      {/* 添加任务对话框 */}
      <AddTodoDialog
        open={showAddDialog}
        onOpenChange={handleAddDialogClose}
      />

      {/* 完成任务对话框 */}
      {completingLink && (
        <CompleteTodoDialog
          link={completingLink}
          open={!!completingLink}
          onOpenChange={(open) => {
            if (!open) setCompletingLink(null);
          }}
          onSuccess={() => {
            setCompletingLink(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

// 链接详情组件
function LinkDetailView({
  link,
  onBack,
  onStartTry,
  onCompleteTry,
  onOpenLink,
  onResumeTry,
}: {
  link: TodoItem;
  onBack: () => void;
  onStartTry: (link: TodoItem) => void;
  onCompleteTry: (link: TodoItem) => void;
  onOpenLink: (link: TodoItem) => void;
  onResumeTry: (link: TodoItem) => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[link.priority_level];

  return (
    <div className="space-y-6 mt-4">
      {/* 返回按钮 */}
      <div className="mb-2">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
      </div>

      {/* 标题和状态 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold">{link.title}</h2>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline truncate block mt-1"
          >
            {link.url}
          </a>
        </div>
        <Badge variant={
          link.status === 'completed' ? 'secondary' :
          link.status === 'trying' ? 'default' : 'outline'
        }>
          {link.status === 'unstarted' ? '未开始' :
           link.status === 'trying' ? '尝试中' :
           link.status === 'completed' ? '已完成' :
           link.status === 'deferred' ? '暂不尝试' :
           link.status === 'abandoned' ? '已放弃' : ''}
        </Badge>
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-medium text-muted-foreground">优先级</div>
          <div className={`flex items-center gap-1 mt-1 ${priorityConfig.color}`}>
            {priorityConfig.icon}
            <span>{priorityConfig.label}</span>
          </div>
        </div>
        <div>
          <div className="font-medium text-muted-foreground">创建时间</div>
          <div className="mt-1">{formatDateTime(link.created_at)}</div>
        </div>

        {link.start_time && (
          <>
            <div>
              <div className="font-medium text-muted-foreground">开始时间</div>
              <div className="mt-1">{formatDateTime(link.start_time)}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">完成时间</div>
              <div className="mt-1">
                {link.complete_time ? formatDateTime(link.complete_time) : '—'}
              </div>
            </div>
          </>
        )}

        {link.tags && link.tags.length > 0 && (
          <div className="col-span-2">
            <div className="font-medium text-muted-foreground mb-1">标签</div>
            <div className="flex flex-wrap gap-1">
              {link.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        {link.rating != null && (
          <div className="col-span-2">
            <div className="font-medium text-muted-foreground mb-1">评分</div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${(link.rating ?? 0) > i ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-1">{link.rating}/5</span>
            </div>
          </div>
        )}

        {link.notes && (
          <div className="col-span-2">
            <div className="font-medium text-muted-foreground mb-1">备注</div>
            <div className="text-sm bg-muted/50 rounded p-2">{link.notes}</div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4 border-t">
        {link.status === 'unstarted' && (
          <Button onClick={() => onStartTry(link)} className="flex-1">
            <Plus className="h-4 w-4 mr-1" />
            开始任务
          </Button>
        )}

        {link.status === 'trying' && (
          <Button onClick={() => onCompleteTry(link)} className="flex-1">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            完成任务
          </Button>
        )}

        {link.status === 'deferred' && (
          <Button onClick={() => onResumeTry(link)} className="flex-1">
            <Play className="h-4 w-4 mr-1" />
            继续尝试
          </Button>
        )}

        {(link.status === 'unstarted' || link.status === 'trying' || link.status === 'deferred') && (
          <Button variant="outline" onClick={() => onOpenLink(link)} className="flex-1">
            <ArrowRightCircle className="h-4 w-4 mr-1" />
            打开链接
          </Button>
        )}
      </div>
    </div>
  );
}

// 链接列表视图组件
function LinkListView({
  links,
  viewMode,
  onStartTry,
  onOpenLink,
  onViewDetail,
  onDelete,
  onCompleteTry,
  onResumeTry,
}: {
  links: TodoItem[];
  viewMode: 'grouped' | 'list';
  onStartTry: (link: TodoItem) => void;
  onOpenLink: (link: TodoItem) => void;
  onViewDetail: (link: TodoItem) => void;
  onDelete: (id: string) => void;
  onCompleteTry: (link: TodoItem) => void;
  onResumeTry: (link: TodoItem) => void;
}) {
  if (links.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">暂无任务</p>
      </div>
    );
  }

  // 列表视图：按创建时间倒序排列
  if (viewMode === 'list') {
    const sortedLinks = [...links].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
      <div className="space-y-2">
        {sortedLinks.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            viewMode="list"
            onStartTry={onStartTry}
            onOpenLink={onOpenLink}
            onViewDetail={onViewDetail}
            onDelete={onDelete}
            onCompleteTry={onCompleteTry}
            onResumeTry={onResumeTry}
          />
        ))}
      </div>
    );
  }

  // 分组视图：按优先级分组
  const highPriorityLinks = links.filter(l => l.priority_level === 'high');
  const mediumPriorityLinks = links.filter(l => l.priority_level === 'medium');
  const lowPriorityLinks = links.filter(l => l.priority_level === 'low');

  return (
    <div className="space-y-6">
      {/* 高优先级 */}
      {highPriorityLinks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">🔴 高优先级</h3>
          {highPriorityLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              viewMode="grouped"
              onStartTry={onStartTry}
              onOpenLink={onOpenLink}
              onViewDetail={onViewDetail}
              onDelete={onDelete}
              onCompleteTry={onCompleteTry}
              onResumeTry={onResumeTry}
            />
          ))}
        </div>
      )}

      {/* 中优先级 */}
      {mediumPriorityLinks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">🟡 中优先级</h3>
          {mediumPriorityLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              viewMode="grouped"
              onStartTry={onStartTry}
              onOpenLink={onOpenLink}
              onViewDetail={onViewDetail}
              onDelete={onDelete}
              onCompleteTry={onCompleteTry}
              onResumeTry={onResumeTry}
            />
          ))}
        </div>
      )}

      {/* 低优先级 */}
      {lowPriorityLinks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">🟢 低优先级</h3>
          {lowPriorityLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              viewMode="grouped"
              onStartTry={onStartTry}
              onOpenLink={onOpenLink}
              onViewDetail={onViewDetail}
              onDelete={onDelete}
              onCompleteTry={onCompleteTry}
              onResumeTry={onResumeTry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 单个链接卡片组件
function LinkCard({
  link,
  viewMode,
  onStartTry,
  onOpenLink,
  onViewDetail,
  onDelete,
  onCompleteTry,
  onResumeTry,
}: {
  link: TodoItem;
  viewMode: 'grouped' | 'list';
  onStartTry: (link: TodoItem) => void;
  onOpenLink: (link: TodoItem) => void;
  onViewDetail: (link: TodoItem) => void;
  onDelete: (id: string) => void;
  onCompleteTry: (link: TodoItem) => void;
  onResumeTry: (link: TodoItem) => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[link.priority_level];

  const getButtonText = () => {
    if (link.status === 'unstarted') return '开始任务';
    if (link.status === 'trying') return '尝试中...';
    if (link.status === 'completed') return '已完成';
    return '';
  };

  return (
    <div className="group border-b hover:bg-accent/50 transition-colors rounded-lg p-4">
      <div className="space-y-2">
        {/* 标题和优先级 */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={priorityConfig.color}>
                {priorityConfig.icon}
              </div>
              <h4 className="text-sm font-medium truncate">
                {link.title || link.url}
              </h4>
            </div>
          </div>

          {/* 状态 Badge */}
          <Badge
            variant={link.status === 'completed' ? 'secondary' : 'outline'}
            className={link.status === 'unstarted' ? 'text-xs px-2 py-1 rounded-full' : 'text-xs px-2 py-1'}
          >
            {(link.status === 'unstarted' ? '未开始' :
             link.status === 'trying' ? '尝试中' :
             link.status === 'completed' ? '已完成' :
             link.status === 'deferred' ? '暂不尝试' :
             link.status === 'abandoned' ? '已放弃' : '未知状态')}
          </Badge>
        </div>

        {/* 标签 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {link.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
            {link.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">+{link.tags.length - 3}</Badge>
            )}
          </div>
        )}

        {/* 时间显示 */}
        <div className="text-xs text-muted-foreground">
          {formatDateTime(link.created_at)}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          {/* 详情按钮 */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onViewDetail(link)}
          >
            详情
          </Button>

          {/* 开始任务按钮 */}
          {link.status === 'unstarted' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onStartTry(link)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {getButtonText()}
            </Button>
          )}

          {/* 完成任务按钮（尝试中状态） */}
          {link.status === 'trying' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onCompleteTry(link)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              完成
            </Button>
          )}

          {/* 继续尝试按钮（暂不尝试状态） */}
          {link.status === 'deferred' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onResumeTry(link)}
            >
              <Play className="h-4 w-4 mr-1" />
              继续尝试
            </Button>
          )}

          {/* 打开链接按钮 */}
          {(link.status === 'unstarted' || link.status === 'trying' || link.status === 'deferred') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenLink(link)}
            >
              <ArrowRightCircle className="h-4 w-4 mr-1" />
              打开
            </Button>
          )}

          {/* 删除按钮 */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(link.id)}
          >
            <span className="text-xs">删除</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
