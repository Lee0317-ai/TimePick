import { useState, useEffect } from "react";
import { ListTodo, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");

  // 加载链接列表
  useEffect(() => {
    const loadLinks = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.id) {
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
          priority_level: (link.priority_level || "medium") as "high" | "medium" | "low",
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-0">任务清单</h1>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <Input
          placeholder="搜索链接、标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 主内容区 */}
      {links.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无任务</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 高优先级 */}
          {links.filter(l => l.priority_level === 'high').map(link => (
            <div key={link.id} className="mb-4">
              <h3 className="text-lg font-bold mb-2">🔴 高优先级</h3>
              <LinkCardSimple link={link} />
            </div>
          ))}

          {/* 中优先级 */}
          {links.filter(l => l.priority_level === 'medium').map(link => (
            <div key={link.id} className="mb-4">
              <h3 className="text-lg font-bold mb-2">🟡 中优先级</h3>
              <LinkCardSimple link={link} />
            </div>
          ))}

          {/* 低优先级 */}
          {links.filter(l => l.priority_level === 'low').map(link => (
            <div key={link.id} className="mb-4">
              <h3 className="text-lg font-bold mb-2">🟢 低优先级</h3>
              <LinkCardSimple link={link} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 简单链接卡片组件（简化版）
function LinkCardSimple({ link }: { link: TodoItem }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="space-y-3">
        {/* 标题和优先级 */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium truncate">{link.title}</div>
          <Badge variant="outline" className="text-xs ml-2">
            {link.priority_level === 'high' ? '🔴 高' : link.priority_level === 'medium' ? '🟡 中' : '🟢 低'}
          </Badge>
          </div>
        </div>

        {/* 状态 */}
        <Badge variant={link.status === 'completed' ? 'secondary' : 'outline'}>
          {link.status === 'unstarted' ? '未开始' :
           link.status === 'trying' ? '尝试中' : '已完成'}
        </Badge>

        {/* 标签 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {link.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        {/* 时间 */}
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(link.created_at)}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button size="icon" variant="outline" onClick={() => window.open(link.url, '_blank')}>
          打开
        </Button>

        <Button size="icon" variant="outline" onClick={() => console.log('详情')}>
          详情
        </Button>
      </div>
    </div>
  );
  }
}
