import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Sparkles, Loader2, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResourcePreview } from './ResourcePreview';
import { ResourceDialog } from './ResourceDialog';
import { Resource } from '@/types';
import { trackEvent } from '@/lib/analytics';
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

interface ResourceCardProps {
  resource: Resource;
  onDelete?: () => void;
  highlightKeyword?: string;
  onView?: () => void;
}

export function ResourceCard({ resource, onDelete, highlightKeyword, onView }: ResourceCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const handleDelete = async () => {
    trackEvent('item_delete_confirm', { resourceId: resource.id });
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resource.id);

    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('删除成功');
      onDelete?.();
    }
    setShowDeleteDialog(false);
  };

  // 自动识别
  const handleAutoRecognize = async () => {
    if (!resource.url) {
      toast.error('该资源没有网址信息');
      return;
    }

    setIsRecognizing(true);
    trackEvent('auto_recognize_from_card', { resourceId: resource.id, url: resource.url });

    try {
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnltaXNqZnZpb3lheWx6a2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Nzc1MTQsImV4cCI6MjA4MzI1MzUxNH0.OIhpRNX9rbWWMqV_l0CSX4QTEbxqZYFjPafigjlB1es';

      const response = await fetch(
        'https://glfymisjfvioyaylzkdj.supabase.co/functions/v1/auto-recognize',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: resource.url })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '识别服务请求失败');
      }

      const data = await response.json();

      // 下载并上传图片
      let thumbnailUrl = '';
      if (data.img) {
        try {
          const imageResponse = await fetch(data.img);
          const imageBlob = await imageResponse.blob();
          
          const fileName = `recognized_${Date.now()}.jpg`;
          const filePath = `${resource.user_id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('resources')
            .upload(filePath, imageBlob, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('resources')
              .getPublicUrl(filePath);
            
            thumbnailUrl = publicUrl;
          }
        } catch (imgError) {
          console.error('Failed to upload image:', imgError);
        }
      }

      // 更新资源信息
      const updateData: { name?: string; content?: string; thumbnail_url?: string } = {};
      if (data.title) updateData.name = data.title;
      if (data.content) updateData.content = data.content;
      if (thumbnailUrl) updateData.thumbnail_url = thumbnailUrl;

      const { error: updateError } = await supabase
        .from('resources')
        .update(updateData)
        .eq('id', resource.id);

      if (updateError) throw updateError;

      toast.success('识别成功！');
      onDelete?.(); // 触发刷新
      trackEvent('auto_recognize_from_card_success', { resourceId: resource.id });
    } catch (error: unknown) {
      console.error('Auto recognize error:', error);
      toast.error('识别失败，请重试');
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      trackEvent('auto_recognize_from_card_fail', { resourceId: resource.id, error: errorMessage });
    } finally {
      setIsRecognizing(false);
    }
  };

  const getThumbnail = () => {
    if (resource.thumbnail_url) {
      return resource.thumbnail_url;
    }
    
    const section = resource.sections;
    switch (section?.type) {
      case 'webpage':
        return '/placeholder.svg';
      case 'document':
        return '/placeholder.svg';
      case 'image':
        return resource.url || '/placeholder.svg';
      // 视频类型已隐藏，保留此处以兼容旧数据
      case 'video':
        return resource.thumbnail_url || '/placeholder.svg';
      default:
        return '/placeholder.svg';
    }
  };

  const highlightText = (text: string) => {
    if (!highlightKeyword || !text) return text;
    const regex = new RegExp(`(${highlightKeyword})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-move"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('resourceId', resource.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <div className="aspect-video bg-muted relative overflow-hidden">
          <img
            src={getThumbnail()}
            alt={resource.name}
            className="object-cover w-full h-full"
          />
          <Badge className="absolute top-2 right-2">
            {resource.sections?.name || '未分类'}
          </Badge>
        </div>
        <CardContent className="pt-4">
          <h3
            className="font-semibold truncate mb-2"
            dangerouslySetInnerHTML={{ __html: highlightText(resource.name) }}
          />
          {resource.modules?.name && (
            <Badge variant="outline" className="mb-2">
              {resource.modules.name}
            </Badge>
          )}
          
          {/* 显示标签 */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {resource.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{resource.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* 显示简介（content） */}
          {resource.content && (
            <p
              className="text-sm text-muted-foreground line-clamp-3 mb-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightText(resource.content) }}
            />
          )}
          {/* 显示备注（notes） */}
          {resource.notes && (
            <p
              className="text-xs text-muted-foreground line-clamp-2 italic"
              dangerouslySetInnerHTML={{ __html: highlightText(resource.notes) }}
            />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(resource.created_at).toLocaleDateString('zh-CN')}
          </p>
        </CardContent>
        <CardFooter className="gap-2 pt-0">
          {resource.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoRecognize}
              disabled={isRecognizing}
              className="flex-1"
            >
              {isRecognizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  识别中
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  识别
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={resource.url ? "" : "flex-1"}
            onClick={() => {
              setShowPreview(true);
              if (onView) {
                onView();
              } else {
                trackEvent('item_view_click', { resourceId: resource.id });
              }
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            查看
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEdit(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowDeleteDialog(true);
              trackEvent('item_delete_click', { resourceId: resource.id });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <ResourcePreview
        resource={resource}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      <ResourceDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        editResource={resource}
        onSuccess={onDelete}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除资源"{resource.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
