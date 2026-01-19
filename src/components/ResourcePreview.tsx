import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Resource } from '@/types';

interface ResourcePreviewProps {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResourcePreview({ resource, open, onOpenChange }: ResourcePreviewProps) {
  const [notes, setNotes] = useState(resource.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('resources')
      .update({ notes })
      .eq('id', resource.id);

    setIsSaving(false);

    if (error) {
      toast.error('保存失败');
    } else {
      toast.success('心得已保存');
    }
  };

  const renderPreview = () => {
    const section = resource.sections;
    
    switch (section?.type) {
      case 'webpage':
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">网页预览</p>
                <Button onClick={() => window.open(resource.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  在新窗口打开
                </Button>
              </div>
            </div>
            {resource.url && (
              <div className="text-sm">
                <span className="text-muted-foreground">网址：</span>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {resource.url}
                </a>
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <img
              src={resource.url}
              alt={resource.name}
              className="w-full rounded-lg"
            />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <video
              src={resource.url}
              controls
              className="w-full rounded-lg"
              poster={resource.thumbnail_url}
            />
          </div>
        );

      case 'document':
        return (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">文档预览</p>
                <Button onClick={() => window.open(resource.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  打开文档
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            无法预览此类型资源
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 预览区 */}
          {renderPreview()}

          {/* 内容信息 */}
          {resource.content && (
            <div className="space-y-2">
              <h3 className="font-semibold">内容</h3>
              <p className="text-sm whitespace-pre-wrap">{resource.content}</p>
            </div>
          )}

          {/* 心得区 */}
          <div className="space-y-2">
            <h3 className="font-semibold">写心得</h3>
            <Textarea
              placeholder="记录您的想法和心得..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
            />
            <Button onClick={handleSaveNotes} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存心得
            </Button>
          </div>

          {/* 元信息 */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>板块：{resource.sections?.name}</p>
            {resource.modules?.name && <p>模块：{resource.modules.name}</p>}
            <p>创建时间：{new Date(resource.created_at).toLocaleString('zh-CN')}</p>
            {resource.file_size && (
              <p>文件大小：{(resource.file_size / 1024 / 1024).toFixed(2)} MB</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
