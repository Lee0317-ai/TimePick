import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronDown, Folder, FolderPlus, FilePlus, Trash2, Layers, Edit } from 'lucide-react';
import { Folder as FolderType, TreeNode } from '@/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import { toast } from 'sonner';

interface FolderTreeProps {
  onNodeSelect: (node: TreeNode) => void;
  onAddFolder: (parentId?: string) => void;
  onEditFolder: (folder: FolderType) => void;
  onAddResource: () => void;
  refreshTrigger: number;
  isCollector?: boolean;
  onResourceMove?: () => void;
}

export function FolderTree({ 
  onNodeSelect, 
  onAddFolder, 
  onEditFolder,
  onAddResource, 
  refreshTrigger, 
  isCollector = true, 
  onResourceMove 
}: FolderTreeProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadFolders = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order');

    if (data) {
      setFolders(data as FolderType[]);
      // 默认展开所有根文件夹
      setExpandedNodes(new Set(data.filter(f => !f.parent_id).map(f => f.id)));
    }
  }, [user]);

  useEffect(() => {
    loadFolders();
  }, [user, refreshTrigger, loadFolders]);

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderToDelete.id);

    if (error) {
      toast.error('删除文件夹失败');
    } else {
      toast.success('文件夹已删除');
      loadFolders();
      onResourceMove?.();
    }

    setShowDeleteDialog(false);
    setFolderToDelete(null);
  };

  const confirmDeleteFolder = (folder: FolderType) => {
    setFolderToDelete(folder);
    setShowDeleteDialog(true);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent/50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/50');
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/50');
    
    const resourceId = e.dataTransfer.getData('resourceId');
    if (!resourceId) return;

    try {
      const { error } = await supabase
        .from('resources')
        .update({ folder_id: targetFolderId })
        .eq('id', resourceId);

      if (error) throw error;
      
      toast.success('资源移动成功');
      onResourceMove?.();
    } catch (error) {
      toast.error('移动失败');
    }
  };

  // 递归渲染文件夹树
  const renderFolder = (folder: FolderType, level: number = 0) => {
    const isExpanded = expandedNodes.has(folder.id);
    const childFolders = folders.filter(f => f.parent_id === folder.id);
    const hasChildren = childFolders.length > 0;

    return (
      <div key={folder.id}>
        {isCollector ? (
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                style={{ paddingLeft: `${level * 12 + 12}px` }}
                onClick={() => {
                  onNodeSelect({ type: 'folder', data: folder });
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
              >
                {hasChildren && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(folder.id);
                    }}
                    className="hover:bg-accent/50 rounded p-0.5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-5" />}
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{folder.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => {
                onNodeSelect({ type: 'folder', data: folder });
                onAddFolder(folder.id);
              }}>
                <FolderPlus className="h-4 w-4 mr-2" />
                新建子文件夹
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                onNodeSelect({ type: 'folder', data: folder });
                onAddResource();
              }}>
                <FilePlus className="h-4 w-4 mr-2" />
                新增资料
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onEditFolder(folder)}>
                <Edit className="h-4 w-4 mr-2" />
                重命名
              </ContextMenuItem>
              <ContextMenuItem onClick={() => confirmDeleteFolder(folder)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                删除文件夹
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
            style={{ paddingLeft: `${level * 12 + 12}px` }}
            onClick={() => {
              onNodeSelect({ type: 'folder', data: folder });
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            {hasChildren && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(folder.id);
                }}
                className="hover:bg-accent/50 rounded p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{folder.name}</span>
          </div>
        )}

        {/* 递归渲染子文件夹 */}
        {isExpanded && hasChildren && (
          <div>
            {childFolders.map(childFolder => renderFolder(childFolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 获取根文件夹（没有父级的文件夹）
  const rootFolders = folders.filter(f => !f.parent_id);

  return (
    <>
      <div className="p-2 space-y-1">
        {/* 全部资源 */}
        <div
          className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer mb-2"
          onClick={() => onNodeSelect({ type: 'all', data: { id: 'all', name: '全部资源' } })}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <Layers className="h-4 w-4" />
          <span className="font-medium">全部资源</span>
        </div>

        {/* 渲染根文件夹 */}
        {rootFolders.map(folder => renderFolder(folder, 0))}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除文件夹</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文件夹 "{folderToDelete?.name}" 吗？此操作无法撤销。
              该文件夹下的子文件夹和资源将一并删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
