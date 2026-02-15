import { useState } from "react";
import { Star, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Database } from "@/integrations/supabase/types";

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

interface ResourceFolder {
  id: string;
  name: string;
}

interface CompleteTodoDialogProps {
  link: TodoItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// 类型定义
type TodoItemRow = Database['public']['Tables']['try_queue_links']['Row'];

// 状态选项
const STATUS_OPTIONS = [
  {
    value: "completed" as const,
    label: "已完成",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600",
    description: "我已经尝试过这个链接",
  },
  {
    value: "deferred" as const,
    label: "暂不尝试",
    icon: <PauseCircle className="h-4 w-4" />,
    color: "text-yellow-600",
    description: "现在没时间，以后再说",
  },
  {
    value: "abandoned" as const,
    label: "已放弃",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600",
    description: "这个链接不合适或已失效",
  },
];

export default function CompleteTryQueueDialog({
  link,
  open,
  onOpenChange,
  onSuccess,
}: CompleteTryQueueDialogProps) {
  // 状态
  const [selectedStatus, setSelectedStatus] = useState<"completed" | "deferred" | "abandoned">("completed");
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [convertToResource, setConvertToResource] = useState<boolean>(false);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  // 加载文件夹列表
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.id) return;

        const { data, error } = await supabase
          .from("folders")
          .select("id, name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setFolders(data || []);
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };

    if (open && convertToResource) {
      loadFolders();
    }
  }, [open, convertToResource]);

  // 重置对话框
  const resetDialog = () => {
    setSelectedStatus("completed");
    setRating(0);
    setNotes("");
    setConvertToResource(false);
    setSelectedFolder("");
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  // 保存完成状态
  const handleSave = async () => {
    if (selectedStatus === "completed" && rating === 0) {
      toast.error("请评分", { description: "完成后请为这个链接打分" });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error("未登录");
      }

      // 更新链接状态
      const updateData: any = {
        status: selectedStatus,
        rating: selectedStatus === "completed" ? rating : null,
        notes: notes || null,
      };

      if (selectedStatus === "completed") {
        updateData.complete_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from("try_queue_links")
        .update(updateData)
        .eq("id", link.id);

      if (error) throw error;

      // 如果选择转换为资源
      if (convertToResource && selectedFolder) {
        const { error: resourceError } = await supabase
          .from("resources")
          .insert({
            user_id: user.id,
            folder_id: selectedFolder,
            url: link.url,
            name: link.title,
            tags: link.tags,
            notes: notes || null,
            file_type: null,
            content: null,
            section_id: null, // 任务转换的默认值
          });

        if (resourceError) throw resourceError;
      }

      toast.success(
        selectedStatus === "completed"
          ? "已完成并评分"
          : selectedStatus === "deferred"
          ? "已标记为暂不尝试"
          : "已放弃"
      );

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error completing link:", error);
      toast.error("操作失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>完成尝试</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 链接信息 */}
          <div className="space-y-2">
            <Label>链接信息</Label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium">{link.title}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {link.url}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {link.priority_level === "high"
                    ? "🔴 高"
                    : link.priority_level === "medium"
                    ? "🟡 中"
                    : "🟢 低"}
                </Badge>
                {link.tags && link.tags.length > 0 && (
                  <div className="flex gap-1">
                    {link.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 状态选择 */}
          <div className="space-y-2">
            <Label>
              完成状态 <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedStatus === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(option.value)}
                  className="flex-col h-auto py-3"
                  disabled={isLoading}
                >
                  <div className={option.color}>{option.icon}</div>
                  <div className="text-xs font-medium mt-1">{option.label}</div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {
                STATUS_OPTIONS.find((opt) => opt.value === selectedStatus)
                  ?.description
              }
            </p>
          </div>

          {/* 评分系统（仅在"已完成"状态显示） */}
          {selectedStatus === "completed" && (
            <div className="space-y-2">
              <Label>
                评分 <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="focus:outline-none transition-colors"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      disabled={isLoading}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= (hoveredStar || rating)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground ml-2">
                  {rating > 0 ? `${rating}/5` : "请评分"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>不值得</span>
                <span>一般</span>
                <span>非常值得</span>
              </div>
            </div>
          )}

          {/* 备注 */}
          <div className="space-y-2">
            <Label>备注（可选）</Label>
            <Textarea
              placeholder={
                selectedStatus === "completed"
                  ? "记录你的想法、收获等..."
                  : selectedStatus === "deferred"
                  ? "为什么暂不尝试？"
                  : "为什么放弃？"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* 转换为资源（仅在"已完成"状态显示） */}
          {selectedStatus === "completed" && (
            <div className="space-y-2">
              <Label>转换为资源（可选）</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="convert-to-resource"
                  checked={convertToResource}
                  onChange={(e) => setConvertToResource(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="convert-to-resource"
                  className="text-sm cursor-pointer"
                >
                  将此链接保存到资源库
                </label>
              </div>

              {convertToResource && (
                <div className="mt-2">
                  <Select
                    value={selectedFolder}
                    onValueChange={setSelectedFolder}
                    modal={false}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择文件夹" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      sideOffset={4}
                      align="start"
                      className="max-h-60 w-[var(--radix-select-trigger-width)] z-50"
                    >
                      {folders.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          暂无文件夹，请先创建文件夹
                        </div>
                      ) : (
                        folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            📁 {folder.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || (selectedStatus === "completed" && rating === 0)}
            >
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
