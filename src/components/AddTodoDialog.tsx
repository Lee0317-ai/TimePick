import { useState, useEffect } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// 快速标签预设
const QUICK_TAGS = [
  { icon: "🔥", label: "紧急", value: "urgent" },
  { icon: "⭐", label: "必看", value: "important" },
  { icon: "📚", label: "学习", value: "learning" },
  { icon: "🛠️", label: "工具", value: "tool" },
  { icon: "🎨", label: "设计", value: "design" },
  { icon: "📝", label: "阅读", value: "reading" },
  { icon: "🔗", label: "有空再看", value: "later" },
  { icon: "➕", label: "添加任务", value: "add-to-try" },
] as const;

interface PriorityDisplay {
  level: "high" | "medium" | "low";
  score: number;
  breakdown: {
    base: number;
    keywords: number;
    learning: number;
    tags: number;
  };
}

interface AddTodoDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddTodoDialog({ open, onOpenChange }: AddTodoDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [priority, setPriority] = useState<PriorityDisplay | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const navigate = useNavigate();

  console.log('[AddTodoDialog] Render with open:', open);

  // 重置表单
  const resetForm = () => {
    setUrl("");
    setTitle("");
    setPriority(null);
    setSelectedTags([]);
    setIsSaving(false);
  };

  // 当 open prop 改变时，重置表单
  useEffect(() => {
    console.log('[AddTodoDialog] open prop changed:', open);
    if (!open) {
      resetForm();
    }
  }, [open]);

  // URL 输入处理（手动模式）
  const handleUrlChange = (value: string) => {
    setUrl(value);
    console.log("[AddTodoDialog] URL changed:", value);
  };

  // 切换标签
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  // 保存到任务清单
  const handleSave = async () => {
    // 验证
    if (!url.trim()) {
      toast.error("请输入链接");
      return;
    }

    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }

    setIsSaving(true);

    try {
      // 获取当前用户
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error("未登录");
      }

      // 保存到数据库（Supabase 唯一约束会处理重复 URL）
      const { error: insertError } = await supabase
        .from("try_queue_links")
        .insert({
          user_id: user.id,
          url: url.trim(),
          title: title.trim(),
          description: null,
          priority_score: priority?.score || 50,
          priority_level: priority?.level || "medium",
          tags: selectedTags,
          status: "unstarted",
          is_priority_locked: false,
        });

      if (insertError) {
        throw insertError;
      }

      toast.success("已添加到任务清单", {
        description: "可以在\"任务\"页面查看",
      });

      // 关闭对话框并重置表单
      onOpenChange?.(false);
      resetForm();
    } catch (error) {
      console.error("Error saving to try queue:", error);
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 优先级显示配置
  const priorityBadge = {
    high: "🔴 高",
    medium: "🟡 中",
    low: "🟢 低",
  } as const;

  // 获取优先级颜色
  const getPriorityColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-full">
        <DialogHeader>
          <DialogTitle>添加任务</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL 输入 */}
          <div className="space-y-2">
            <Label htmlFor="url">
              网页链接 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">标题 <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              placeholder="输入网页标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 优先级选择 */}
          <div className="space-y-2">
            <Label>优先级（可选）</Label>
            <div className="flex gap-2">
              {Object.entries(priorityBadge).map(([level, badge]) => (
                <Button
                  key={level}
                  type="button"
                  variant={priority?.level === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPriority({
                      level: level as "high" | "medium" | "low",
                      score: level === "high" ? 80 : level === "medium" ? 50 : 20,
                      breakdown: {
                        base: 50,
                        keywords: 0,
                        learning: 0,
                        tags: 0,
                      },
                    });
                  }}
                  className="flex-1"
                >
                  {badge}
                </Button>
              ))}
            </div>
          </div>

          {/* 标签选择 */}
          <div className="space-y-2">
            <Label>标签（可选）</Label>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-1 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagToggle(tag);
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* 快速标签 */}
          <div className="space-y-2">
            <Label>快速添加标签</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_TAGS.map((tag) => (
                <Button
                  key={tag.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedTags.includes(tag.label)) {
                      setSelectedTags((prev) => [...prev, tag.label]);
                    }
                  }}
                  disabled={selectedTags.includes(tag.label)}
                  className="justify-start"
                >
                  {tag.icon} {tag.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "添加到队列"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
