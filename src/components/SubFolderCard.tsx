import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, Edit, Trash2, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Folder as FolderType } from '@/types';
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

interface SubFolderCardProps {
  folder: FolderType;
  onOpen: (folder: FolderType) => void;
  onEdit: (folder: FolderType) => void;
  onDelete?: () => void;
}

export function SubFolderCard({ folder, onOpen, onEdit, onDelete }: SubFolderCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subFolderCount, setSubFolderCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);

  const loadCounts = useCallback(async () => {
    // 统计子文件夹数量
    const { count: folderCount } = await supabase
      .from('folders')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', folder.id);

    // 统计资源数量
    const { count: resCount } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('folder_id', folder.id);

    setSubFolderCount(folderCount || 0);
    setResourceCount(resCount || 0);
  }, [folder.id]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const handleDelete = async () => {
    trackEvent('folder_delete_confirm', { folderId: folder.id });
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folder.id);

    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('文件夹已删除');
      onDelete?.();
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
        onClick={() => {
          onOpen(folder);
          trackEvent('folder_open_click', { folderId: folder.id });
        }}
      >
        <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden flex items-center justify-center">
          <div className="relative">
            <Folder className="h-20 w-20 text-primary/60 group-hover:text-primary transition-colors" />
            <FolderOpen className="h-20 w-20 text-primary absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <CardContent className="pt-4">
          <h3 className="font-semibold truncate mb-2 flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            {folder.name}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {subFolderCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {subFolderCount} 个文件夹
              </Badge>
            )}
            {resourceCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {resourceCount} 个资源
              </Badge>
            )}
            {subFolderCount === 0 && resourceCount === 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                空文件夹
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(folder.created_at).toLocaleDateString('zh-CN')}
          </p>
        </CardContent>
        <CardFooter className="gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(folder);
              trackEvent('folder_open_button_click', { folderId: folder.id });
            }}
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            打开
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(folder);
              trackEvent('folder_edit_click', { folderId: folder.id });
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
              trackEvent('folder_delete_click', { folderId: folder.id });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除文件夹</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文件夹"{folder.name}"吗？此操作无法撤销。
              该文件夹下的所有子文件夹和资源都将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
