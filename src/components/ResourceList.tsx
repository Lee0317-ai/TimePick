import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ResourceCard } from './ResourceCard';
import { SubFolderCard } from './SubFolderCard';
import { Loader2, Tag } from 'lucide-react';
import { Resource, TreeNode, Folder } from '@/types';

interface ResourceListProps {
  selectedNode: TreeNode | null;
  refreshTrigger: number;
  onRefresh: () => void;
  onNodeSelect?: (node: TreeNode) => void;
  onEditFolder?: (folder: Folder) => void;
  selectedTags?: string[];
}

export function ResourceList({ selectedNode, refreshTrigger, onRefresh, onNodeSelect, onEditFolder, selectedTags = [] }: ResourceListProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);

  const loadResources = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    
    // 如果是文件夹视图，需要加载子文件夹
    if (selectedNode?.type === 'folder') {
      const folderId = selectedNode.data.id;
      
      // 加载子文件夹
      const { data: folders } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .eq('parent_id', folderId)
        .order('sort_order');
      
      setSubFolders(folders || []);
      
      // 加载文件夹路径（面包屑）
      await loadFolderPath(folderId);
    } else if (selectedNode?.type === 'all') {
      // 全部资源视图 - 加载根文件夹
      const { data: folders } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .is('parent_id', null)
        .order('sort_order');
      
      setSubFolders(folders || []);
      setFolderPath([]);
    } else {
      setSubFolders([]);
      setFolderPath([]);
    }
    
    // 加载资源
    let query = supabase
      .from('resources')
      .select(`
        *,
        sections:section_id(name, type),
        modules:module_id(name)
      `)
      .eq('user_id', user.id);

    if (selectedNode?.type === 'folder') {
      query = query.eq('folder_id', selectedNode.data.id);
    } else if (selectedNode?.type === 'section') {
      query = query.eq('section_id', selectedNode.data.id);
      if (selectedNode.module) {
        query = query.eq('module_id', selectedNode.module.id);
      }
    } else if (selectedNode?.type === 'module') {
      query = query.eq('module_id', selectedNode.data.id);
      if (selectedNode.section) {
        query = query.eq('section_id', selectedNode.section.id);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    setLoading(false);

    if (!error && data) {
      let filteredResources = data as Resource[];
      
      // 应用标签过滤
      if (selectedTags && selectedTags.length > 0) {
        filteredResources = filteredResources.filter(resource => {
          if (!resource.tags || resource.tags.length === 0) return false;
          // 检查资源是否包含所有选中的标签
          return selectedTags.every(selectedTag => resource.tags?.includes(selectedTag));
        });
      }
      
      setResources(filteredResources);
    }
  }, [user, selectedNode, selectedTags]);

  // 加载文件夹路径（用于面包屑）
  const loadFolderPath = async (folderId: string) => {
    const path: Folder[] = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('id', currentId)
        .single();
      
      if (data) {
        path.unshift(data as Folder);
        currentId = data.parent_id;
      } else {
        break;
      }
    }
    
    setFolderPath(path);
  };

  useEffect(() => {
    if (selectedNode) {
      loadResources();
    }
  }, [selectedNode, user, refreshTrigger, loadResources]);

  const renderBreadcrumb = () => {
    if (!selectedNode) return null;

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              className="cursor-pointer hover:text-primary"
              onClick={() => onNodeSelect?.({ type: 'all', data: { id: 'all', name: '全部资源' } })}
            >
              首页
            </BreadcrumbLink>
          </BreadcrumbItem>
          {selectedNode.type === 'all' ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="font-semibold">全部资源</BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : selectedNode.type === 'folder' ? (
            <>
              {/* 显示文件夹路径 */}
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      className={index === folderPath.length - 1 ? "font-semibold" : "cursor-pointer hover:text-primary"}
                      onClick={() => {
                        if (index < folderPath.length - 1) {
                          onNodeSelect?.({ type: 'folder', data: folder });
                        }
                      }}
                    >
                      {folder.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </div>
              ))}
            </>
          ) : (
            <>
              {selectedNode.section && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink>{selectedNode.section.name}</BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              {selectedNode.module && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink>{selectedNode.module.name}</BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="font-semibold">
                  {selectedNode.data.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        请从左侧选择一个分类
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 space-y-3">
        {renderBreadcrumb()}
        
        {/* 标签过滤提示 */}
        {selectedTags && selectedTags.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">已筛选标签：</span>
            <div className="flex flex-wrap gap-1">
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <span className="text-muted-foreground">({resources.length} 个结果)</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : subFolders.length === 0 && resources.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {selectedNode?.type === 'folder' || selectedNode?.type === 'all' ? '暂无文件夹或资源' : '暂无资源'}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* 显示子文件夹 */}
            {subFolders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span>文件夹</span>
                  <span className="text-xs">({subFolders.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subFolders.map((folder) => (
                    <SubFolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={(folder) => onNodeSelect?.({ type: 'folder', data: folder })}
                      onEdit={(folder) => onEditFolder?.(folder)}
                      onDelete={onRefresh}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* 显示资源 */}
            {resources.length > 0 && (
              <div>
                {subFolders.length > 0 && (
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <span>资源</span>
                    <span className="text-xs">({resources.length})</span>
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onDelete={onRefresh}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
