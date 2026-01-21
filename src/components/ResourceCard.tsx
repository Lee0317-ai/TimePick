import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2 } from 'lucide-react';
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
          {resource.notes && (
            <p
              className="text-sm text-muted-foreground line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightText(resource.notes) }}
            />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(resource.created_at).toLocaleDateString('zh-CN')}
          </p>
        </CardContent>
        <CardFooter className="gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
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
