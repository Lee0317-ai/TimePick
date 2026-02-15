import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// 类型定义
interface LearningFocus {
  id: string;
  name: string;
  weight: 0.5 | 1.0 | 2.0;
  synonyms: string[];
  is_paused: boolean;
  user_id: string;
  created_at: string;
}

// 权重显示组件
const WeightBadge = ({ weight }: { weight: number }) => {
  if (weight === 0.5) return <span className="text-xs px-2 py-1 rounded text-gray-500 bg-gray-100">0.5x</span>;
  if (weight === 1.0) return <span className="text-xs px-2 py-1 rounded text-blue-600 bg-blue-100">1.0x</span>;
  if (weight === 2.0) return <span className="text-xs px-2 py-1 rounded text-red-600 bg-red-100">2.0x</span>;
  return <span className="text-xs px-2 py-1 rounded text-muted-foreground">{weight}x</span>;
};

export default function LearningFocusDialog() {
  const [open, onOpenChange] = useState(false);
  const [foci, setFoci] = useState<LearningFocus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  // 加载学习重点列表
  useEffect(() => {
    const loadFoci = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.id) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("learning_focus")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setFoci(data || []);
      } catch (error) {
        console.error("Error loading learning foci:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadFoci();
    }
  }, [open]);

  // 重置对话框
  const handleClose = () => {
    onOpenChange(false);
  };

  // 添加学习重点
  const handleAdd = async () => {
    const name = prompt("请输入学习重点名称", "例如：React");
    if (!name?.trim()) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error("未登录");
      }

      const { data, error } = await supabase
        .from("learning_focus")
        .insert({
          user_id: user.id,
          name: name.trim(),
          weight: 1.0,
          synonyms: [],
          is_paused: false,
        })
        .select()
        .single();

      if (error) throw error;

      setFoci([data, ...foci]);
      toast.success("已添加", { description: `学习重点 "${name}" 已添加` });
    } catch (error) {
      console.error("Error adding focus:", error);
      toast.error("添加失败", { description: error instanceof Error ? error.message : "未知错误" });
    }
  };

  // 删除学习重点
  const handleDelete = async (id: string) => {
    if (!confirm(`确定要删除这个学习重点吗？`)) return;

    try {
      const { error } = await supabase
        .from("learning_focus")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFoci(foci.filter(f => f.id !== id));

      toast.success("已删除", { description: "该学习重点已删除" });
    } catch (error) {
      console.error("Error deleting focus:", error);
      toast.error("删除失败", { description: error instanceof Error ? error.message : "未知错误" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>学习重点设置</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 说明文本 */}
          <p className="text-sm text-muted-foreground">
            设置你当前的学习重点，系统将根据这些重点自动调整待尝试链接的优先级。
          </p>

          {/* 添加按钮 */}
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={isLoading}>
              <Plus className="h-4 w-4" />
              添加学习重点
            </Button>
          </div>

          {/* 当前学习重点列表 */}
          <div className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <AlertCircle className="h-6 w-6 animate-spin" />
                <p className="text-sm text-muted-foreground mt-2">加载中...</p>
              </div>
            ) : foci.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">还没有设置学习重点</p>
                <p className="text-xs text-muted-foreground">点击上方"添加学习重点"开始</p>
              </div>
            ) : (
              <div className="space-y-3">
                {foci.map((focus) => (
                  <div
                    key={focus.id}
                    className="flex items-center justify-between p-3 border-b hover:bg-accent/50 transition-colors rounded-lg group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-x-4">
                        <span className="text-sm font-medium">{focus.name}</span>
                        <WeightBadge weight={focus.weight} />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {focus.is_paused ? (
                            <Badge variant="secondary" className="ml-2">已暂停</Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2">
                              {focus.synonyms.length} 个同义词
                            </Badge>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          const synonyms = prompt(
                            `编辑 ${focus.name} 的同义词`,
                            focus.synonyms?.join(", ") || ""
                          );
                          if (synonyms !== null) {
                            try {
                              const synonymArray = synonyms.split(",").map(s => s.trim()).filter(s => s);
                              const { error } = await supabase
                                .from("learning_focus")
                                .update({ synonyms: synonymArray })
                                .eq("id", focus.id);

                              if (error) throw error;

                              setFoci(foci.map(f =>
                                f.id === focus.id
                                  ? { ...f, synonyms: synonymArray }
                                  : f
                              ));
                            } catch (error) {
                              console.error("Error updating synonyms:", error);
                              toast.error("更新失败");
                            }
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(focus.id)}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 批量操作按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (foci.length === 0) {
                  toast.error("没有学习重点", { description: "请先添加学习重点" });
                  return;
                }

                try {
                  // 调用批量优先级计算 Edge Function
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-calculate-priority`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                      },
                      body: JSON.stringify({
                        link_ids: [], // 空数组表示重新计算所有链接
                      }),
                    }
                  );

                  if (!response.ok) {
                    throw new Error("批量更新失败");
                  }

                  toast.success("已更新", { description: "所有待尝试链接的优先级已更新" });
                  });
                } catch (error) {
                  console.error("Error batch updating:", error);
                  toast.error("更新失败");
                }
              }}
            >
              <span className="text-sm">批量更新优先级</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
