import { useState } from "react";
import { Check } from "lucide-react";
import { AlertCircle } from "lucide-react";
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

interface ParsedLink {
  id: string;
  url: string;
  title: string;
  exists: boolean;
  level?: "high" | "medium" | "low";
}

interface PriorityEstimate {
  level: "high" | "medium" | "low";
  score: number;
}

export default function BatchImportDialog() {
  const [open, onOpenChange] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsedLinks, setParsedLinks] = useState<ParsedLink[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const navigate = useNavigate();

  // 重置对话框
  const resetDialog = () => {
    setRawText("");
    setParsedLinks([]);
    setIsParsing(false);
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleClose = () => {
    onOpenChange(false);
    resetDialog();
  };

  // URL 识别正则（支持多种格式）
  const parseUrls = (text: string): string[] => {
    const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@!~_\-%+]*/gi;
    const matches = text.match(urlPattern);
    return matches || [];
  };

  // 简单去重（不添加已存在的 URL）
  const deduplicateLinks = (links: ParsedLink[]) => {
    const seen = new Set<string>();
    return links.filter(link => {
      if (seen.has(link.url)) {
        return false;
      }
      seen.add(link.url);
      return true;
    });
  };

  // 估算优先级（基于关键词）
  const estimatePriority = (title: string): PriorityEstimate => {
    const text = title.toLowerCase();

    // 高优先级关键词
    const highKeywords = ['速查', '教程', '必读', '入门'];
    if (highKeywords.some(kw => text.includes(kw))) {
      return { level: 'high', score: 80 };
    }

    // 中优先级关键词
    const mediumKeywords = ['指南', '技巧', '实践'];
    if (mediumKeywords.some(kw => text.includes(kw))) {
      return { level: 'medium', score: 50 };
    }

    return { level: 'low', score: 30 };
  };

  // 自动解析文本
  const handleParseText = () => {
    const text = rawText.trim();
    if (!text) {
      return;
    }

    setIsParsing(true);

    // 模拟延迟（避免卡顿）
    setTimeout(() => {
      const urls = parseUrls(text);
      const links: ParsedLink[] = urls.map((url, index) => {
        const priority = estimatePriority(`链接 ${index + 1}`);
        return {
          id: `temp-${index}`,
          url,
          title: `链接 ${index + 1}`,
          exists: false,
          level: priority.level,
        };
      });

      setParsedLinks(links);
      setIsParsing(false);
    }, 100);
  };

  // 确认导入
  const handleImport = async () => {
    if (parsedLinks.length === 0) {
      toast.error("没有可导入的链接", { description: "请先粘贴包含链接的文本" });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedLinks.length });

    try {
      // 获取当前用户
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        throw new Error("未登录");
      }

      // 批量导入到数据库
      const linksToInsert = parsedLinks.map((link, index) => ({
        user_id: user.id,
        url: link.url,
        title: link.title,
        description: null,
        priority_level: link.level || "low",
        priority_score: link.level === "high" ? 80 : link.level === "medium" ? 50 : 30,
        tags: [],
        status: "unstarted" as const,
        is_priority_locked: false,
      }));

      // 分批插入（每批 10 条）
      const batchSize = 10;
      for (let i = 0; i < linksToInsert.length; i += batchSize) {
        const batch = linksToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from("try_queue_links")
          .insert(batch);

        if (error) throw error;

        setImportProgress({
          current: Math.min(i + batchSize, linksToInsert.length),
          total: linksToInsert.length,
        });
      }

      // 调用批量优先级计算
      const linkIds = parsedLinks.map(l => l.id);
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-calculate-priority`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ link_ids: linkIds }),
        }
      );

      toast.success("导入成功", { description: `成功导入 ${parsedLinks.length} 条链接` });

      onOpenChange(false);
      resetDialog();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("导入失败", { description: error instanceof Error ? error.message : "未知错误" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>批量导入链接</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 说明文本 */}
          <div className="text-sm text-muted-foreground mb-4">
            从微信复制多条消息，粘贴到下方。系统会自动识别所有链接。
          </div>

          {/* 文本输入框 */}
          <div className="space-y-2">
            <Label htmlFor="raw-text">粘贴消息内容</Label>
            <Textarea
              id="raw-text"
              placeholder="例如：推荐一篇好文章&#10;https://react.dev&#10;..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={isImporting}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {/* 解析状态 */}
          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 animate-spin" />
              <span>正在解析链接...</span>
            </div>
          )}

          {/* URL 统计 */}
          {parsedLinks.length > 0 && !isParsing && (
            <div className="text-sm text-muted-foreground">
              已识别 <span className="font-medium text-foreground">{parsedLinks.length}</span> 条链接
            </div>
          )}

          {/* 链接预览列表 */}
          {parsedLinks.length > 0 && (
            <div className="space-y-3">
              <div className="max-h-[400px] overflow-y-auto border rounded-md p-4">
                {parsedLinks.map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-start justify-between p-3 border-b"
                  >
                    <div className="flex-1 space-x-2">
                      <Badge variant={link.exists ? "secondary" : "outline"}>
                        {link.exists ? "重复" : `${index + 1}`}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{link.title}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {link.url}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {link.level && (
                        <span className={
                          link.level === 'high' ? 'text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-medium' :
                          link.level === 'medium' ? 'text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs font-medium' :
                          'text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-medium'
                        }>
                          {link.level === 'high' ? '高' : link.level === 'medium' ? '中' : '低'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={parsedLinks.length === 0 || isImporting || isParsing}>
            {isImporting ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                导入中 ({importProgress.current}/{importProgress.total})
              </>
            ) : (
              <>批量导入</>
            )}
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
