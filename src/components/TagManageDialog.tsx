import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Edit, Loader2, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TagManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagsUpdated?: () => void;
}

export function TagManageDialog({ open, onOpenChange, onTagsUpdated }: TagManageDialogProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTag, setDeleteTag] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadTags();
    }
  }, [open, user]);

  const loadTags = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: resources } = await supabase
        .from('resources')
        .select('tags')
        .eq('user_id', user.id)
        .not('tags', 'is', null);

      const tagCounts: Record<string, number> = {};
      resources?.forEach((resource) => {
        resource.tags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const tagList = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => a.tag.localeCompare(b.tag, 'zh-CN'));

      setTags(tagList);
    } catch (error) {
      console.error('Failed to load tags:', error);
      toast.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    if (!user) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('delete_tag', {
        user_uuid: user.id,
        tag_name: tagToDelete
      });

      if (error) throw error;

      toast.success('标签已删除');
      setDeleteTag(null);
      await loadTags();
      onTagsUpdated?.();
    } catch (error) {
      console.error('Delete tag error:', error);
      toast.error('删除失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!user || !newTag.trim() || oldTag === newTag) {
      setEditingTag(null);
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('rename_tag', {
        user_uuid: user.id,
        old_tag_name: oldTag,
        new_tag_name: newTag.trim()
      });

      if (error) throw error;

      toast.success('标签已重命名');
      setEditingTag(null);
      setEditValue('');
      await loadTags();
      onTagsUpdated?.();
    } catch (error) {
      console.error('Rename tag error:', error);
      toast.error('重命名失败');
    } finally {
      setProcessing(false);
    }
  };

  const startEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
  };

  const confirmEdit = () => {
    if (editingTag) {
      handleRenameTag(editingTag, editValue);
    }
  };

  // 新增标签（创建一个隐藏的资源来承载新标签）
  const handleAddTag = async () => {
    if (!user || !newTagName.trim()) return;

    const tagName = newTagName.trim();

    // 检查标签是否已存在
    if (tags.some(t => t.tag.toLowerCase() === tagName.toLowerCase())) {
      toast.error('该标签已存在');
      return;
    }

    setIsAddingTag(true);
    try {
      // 通过 RPC 或直接更新一个已有资源来添加新标签
      // 为了简化，我们创建一个新的"占位资源"来承载这个标签
      // 或者我们可以使用 RPC 函数。这里我们采用更简单的方式：
      // 获取用户的第一个资源并添加标签
      const { data: resources } = await supabase
        .from('resources')
        .select('id, tags')
        .eq('user_id', user.id)
        .limit(1);

      if (resources && resources.length > 0) {
        const resource = resources[0];
        const existingTags = resource.tags || [];
        const newTags = [...existingTags, tagName];

        const { error } = await supabase
          .from('resources')
          .update({ tags: newTags })
          .eq('id', resource.id);

        if (error) throw error;

        toast.success('标签已创建');
        setNewTagName('');
        await loadTags();
        onTagsUpdated?.();
      } else {
        toast.error('请先创建一个资源后再添加标签');
      }
    } catch (error) {
      console.error('Add tag error:', error);
      toast.error('添加标签失败');
    } finally {
      setIsAddingTag(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>标签管理</DialogTitle>
          </DialogHeader>

          {/* 新增标签 */}
          <div className="flex gap-2">
            <Input
              placeholder="输入新标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagName.trim()) {
                  handleAddTag();
                }
              }}
              disabled={isAddingTag}
            />
            <Button
              onClick={handleAddTag}
              disabled={isAddingTag || !newTagName.trim()}
            >
              {isAddingTag ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </>
              )}
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            💡 提示：标签会在您创建或编辑资源时自动添加，这里可以批量管理现有标签。
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2">
                {tags.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>暂无标签</p>
                    <p className="text-xs mt-2">在资源中添加标签后会显示在这里</p>
                  </div>
                ) : (
                  tags.map(({ tag, count }) => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 p-3 rounded border hover:bg-accent transition-colors"
                    >
                      {editingTag === tag ? (
                        <>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            disabled={processing}
                            autoFocus
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            onClick={confirmEdit}
                            disabled={processing || !editValue.trim()}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={cancelEdit}
                            disabled={processing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{tag}</span>
                          <Badge variant="secondary">{count} 个资源</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEdit(tag)}
                            disabled={processing}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTag(tag)}
                            disabled={processing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签 <span className="font-semibold">"{deleteTag}"</span> 吗？
              <br />
              这将从所有资源中移除该标签。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTag && handleDeleteTag(deleteTag)}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
