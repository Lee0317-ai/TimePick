import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ResourceCard } from './ResourceCard';
import { SubFolderCard } from './SubFolderCard';
import { EmptyState } from './EmptyState';
import { RecentInspirations } from './RecentInspirations';
import { Loader2, Tag, Folder as FolderIcon, FileText, LayoutGrid, List, Image } from 'lucide-react';
import { Resource, TreeNode, Folder, ViewType, ResourceInitData } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewPreference } from '@/hooks/useViewPreference';

interface ResourceListProps {
  selectedNode: TreeNode | null;
  refreshTrigger: number;
  onRefresh: () => void;
  onNodeSelect?: (node: TreeNode) => void;
  onEditFolder?: (folder: Folder) => void;
  selectedTags?: string[];
  onConvertToResource?: (data: ResourceInitData) => void;
  onViewAllInspirations?: () => void;
}

export function ResourceList({ selectedNode, refreshTrigger, onRefresh, onNodeSelect, onEditFolder, selectedTags = [], onConvertToResource, onViewAllInspirations }: ResourceListProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [resources, setResources] = useState<Resource[]>([]);
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [resourceViewType, setResourceViewType] = useViewPreference('resources', 'grid');
  const [folderViewType, setFolderViewType] = useViewPreference('folders', 'grid');

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

  // 视图切换按钮组
  const renderViewSwitcher = (viewType: ViewType, setViewType: (v: ViewType) => void, label: string) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">{label}:</span>
      <Button
        variant={viewType === 'grid' ? 'default' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setViewType('grid')}
        title="网格视图"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={viewType === 'list' ? 'default' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setViewType('list')}
        title="列表视图"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={viewType === 'thumbnail' ? 'default' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => setViewType('thumbnail')}
        title="缩略图视图"
      >
        <Image className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {renderBreadcrumb()}
          {/* 视图切换按钮 - PC端和手机端都显示 */}
          {(subFolders.length > 0 || resources.length > 0) && (
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              {subFolders.length > 0 && renderViewSwitcher(folderViewType, setFolderViewType, isMobile ? '夹' : '文件夹')}
              {resources.length > 0 && renderViewSwitcher(resourceViewType, setResourceViewType, isMobile ? '源' : '资源')}
            </div>
          )}
        </div>

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
          <div className="flex flex-col items-center justify-center h-full px-4 py-12">
            {selectedNode?.type === 'folder' || selectedNode?.type === 'all' ? (
              <EmptyState
                icon={<FolderIcon className="h-16 w-16 text-primary" />}
                title="暂无文件夹或资源"
                description={
                  selectedNode?.type === 'all' 
                    ? '点击右下角按钮开始创建文件夹或添加资源，让您的资源管理井井有条！' 
                    : '在此文件夹中添加子文件夹或资源，开始您的资源管理之旅。'
                }
              />
            ) : (
              <EmptyState
                icon={<FileText className="h-16 w-16 text-primary" />}
                title="暂无资源"
                description='点击右下角"+"按钮开始添加资源，构建您的资源库。'
              />
            )}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* 最近灵感 - 在全部资源或根目录时显示 */}
            {onConvertToResource && onViewAllInspirations &&
             (selectedNode?.type === 'all' || (selectedNode?.type === 'folder' && folderPath.length === 0)) && (
              <RecentInspirations
                onConvertToResource={onConvertToResource}
                onViewAll={onViewAllInspirations}
                refreshTrigger={refreshTrigger}
              />
            )}

            {/* 显示子文件夹 */}
            {subFolders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span>文件夹</span>
                  <span className="text-xs">({subFolders.length})</span>
                </h2>
                <div className={
                  isMobile
                    ? 'flex flex-col gap-2'
                    : folderViewType === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : folderViewType === 'list'
                        ? 'flex flex-col gap-2'
                        : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'
                }>
                  {subFolders.map((folder) => (
                    <SubFolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={(folder) => onNodeSelect?.({ type: 'folder', data: folder })}
                      onEdit={(folder) => onEditFolder?.(folder)}
                      onDelete={onRefresh}
                      compact={isMobile || folderViewType === 'list' || folderViewType === 'thumbnail'}
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
                <div className={
                  resourceViewType === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : resourceViewType === 'list'
                      ? 'flex flex-col gap-2'
                      : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'
                }>
                  {resources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onDelete={onRefresh}
                      viewType={resourceViewType}
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
