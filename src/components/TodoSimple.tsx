import { useState, useEffect } from "react";
import { CheckCircle2, Circle, MoreHorizontal, Plus, AlertCircle, ArrowRightCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 类型定义
interface TodoItem {
  id: string;
  url: string;
  title: string;
  priority_level: "high" | "medium" | "low";
  priority_score: number;
  status: "unstarted" | "trying" | "completed" | "deferred" | "abandoned";
  tags: string[];
  created_at: string;
}

export default function TodoSimplePage() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载链接列表
  useEffect(() => {
    const loadLinks = async () => {
      try {
        const { data: { user } = await supabase.auth.getUser();
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("try_queue_links")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setLinks((data || []).map(link => ({
          id: link.id,
          url: link.url,
          title: link.title || "",
          priority_level: (link.priority_level || "medium"),
          priority_score: link.priority_score || 50,
          status: (link.status || "unstarted") as "unstarted" | "trying" | "completed" | "deferred" | "abandoned",
          tags: link.tags || [],
          created_at: link.created_at || "",
        })));
      } catch (error) {
        console.error("Error loading links:", error);
        toast.error("加载失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadLinks();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground ml-2">加载中...</p>
        </div>
    );
  }

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

  // 打开链接
  const handleOpenLink = (link: TodoItem) => {
    window.open(link.url, '_blank');
  };

  // 查看详情
  const handleViewDetail = (link: TodoItem) => {
    setSelectedLink(link);
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-0">任务清单</h1>
      </div>

      {/* 链接列表 */}
      <div className="space-y-4">
        {links.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">暂无任务</p>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              {/* 标题和优先级 */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">{link.title}</div>
                <Badge variant="outline" className="text-xs">
                  {link.priority_level === 'high' ? '🔴 高' :
                   link.priority_level === 'medium' ? '🟡 中' :
                   '🟢 低'}
                </Badge>
              </div>

              {/* 状态和标签 */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {link.status === 'unstarted' ? '未开始' :
                   link.status === 'trying' ? '尝试中' :
                   link.status === 'completed' ? '已完成' : '未知状态'}
                </Badge>

                {link.tags && link.tags.length > 0 && (
                  <span className="ml-2">
                    {link.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={`${tag}-${i}`} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                )}
              </div>

              {/* 时间 */}
              <div className="text-xs text-muted-foreground mt-1">
                {formatDateTime(link.created_at)}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2 mt-3">
                {link.status === 'unstarted' && (
                  <Button
                    size="icon"
                    onClick={() => handleStartTry(link)}
                  >
                    <Plus className="h-4 w-4" />
                    开始任务
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleOpenLink(link)}
                  >
                    <ArrowRightCircle className="h-4 w-4" />
                    打开
                  </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
              </div>
            </div>
          );
        })}

        {/* 无链接提示 */}
        {links.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">暂无任务</p>
          </div>
        )}
      </div>
    );
  }
}
