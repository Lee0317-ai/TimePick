import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Loader2, Tag, Folder as FolderIcon, FileText, LayoutGrid, List, Image, Layers } from 'lucide-react';
import { Resource, TreeNode, Folder, ViewType, ResourceInitData } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewPreference } from '@/hooks/useViewPreference';

type DisplayMode = 'folder-and-resource' | 'resource-only';

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>('folder-and-resource');
  const [viewType, setViewType] = useViewPreference('view', 'grid');
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef<number>(0);

  // 递归获取所有子文件夹ID
  const getAllSubFolderIds = useCallback(async (folderId: string): Promise<string[]> => {
    const { data: folders } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('parent_id', folderId);

    if (!folders || folders.length === 0) return [];

    const childIds = folders.map(f => f.id);
    const allIds = [...childIds];

    for (const childId of childIds) {
      const grandChildIds = await getAllSubFolderIds(childId);
      allIds.push(...grandChildIds);
    }

    return allIds;
  }, [user]);

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
        sections:section_id(name, type)
      `)
      .eq('user_id', user.id);

    if (selectedNode?.type === 'folder') {
      if (displayMode === 'resource-only') {
        // 仅资料模式：获取当前文件夹及所有子文件夹中的资料
        const folderId = selectedNode.data.id;
        const subFolderIds = await getAllSubFolderIds(folderId);
        const allFolderIds = [folderId, ...subFolderIds];

        query = query.in('folder_id', allFolderIds);
      } else {
        // 文件夹+资料模式：只获取当前文件夹中的资料
        query = query.eq('folder_id', selectedNode.data.id);
      }
    } else if (selectedNode?.type === 'tags') {
      // 标签视图不需要额外的过滤，由 selectedTags 处理
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
  }, [user, selectedNode, selectedTags, displayMode, getAllSubFolderIds]);

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

  // 保存滚动位置
  const saveScrollPosition = () => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      savedScrollTop.current = viewport.scrollTop;
    }
  };

  // 恢复滚动位置
  const restoreScrollPosition = () => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport && savedScrollTop.current > 0) {
      viewport.scrollTop = savedScrollTop.current;
    }
  };

  // 包装 onRefresh，保存滚动位置后刷新
  const handleRefresh = () => {
    saveScrollPosition();
    onRefresh();
  };

  useEffect(() => {
    if (selectedNode) {
      loadResources();
    }
  }, [selectedNode, user, refreshTrigger, loadResources]);

  // 监听数据变化，恢复滚动位置
  useEffect(() => {
    if (!loading && (resources.length > 0 || subFolders.length > 0)) {
      // 延迟恢复，确保DOM已更新
      const timer = setTimeout(() => {
        restoreScrollPosition();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, resources, subFolders]);

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
          ) : selectedNode.type === 'tags' ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="font-semibold">
                  {selectedNode.data.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
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

  // 视图样式切换按钮组
  const renderViewStyleSwitcher = () => (
    <div className="flex items-center gap-1">
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
          {/* 显示模式切换和视图样式切换 */}
          {(subFolders.length > 0 || resources.length > 0) && (
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              {/* 显示模式切换 */}
              <div className="flex items-center gap-0 bg-muted/50 rounded-md p-0.5">
                <Button
                  variant={displayMode === 'folder-and-resource' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDisplayMode('folder-and-resource')}
                  title="文件夹+资料"
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={displayMode === 'resource-only' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDisplayMode('resource-only')}
                  title="仅资料"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* 竖线分隔符 */}
              <div className="w-px h-5 bg-border mx-1" />

              {/* 视图样式切换 */}
              {renderViewStyleSwitcher()}
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

      <ScrollArea ref={scrollRef} className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : subFolders.length === 0 && resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-12">
            <EmptyState
              icon={displayMode === 'resource-only' ? <FileText className="h-16 w-16 text-primary" /> : <FolderIcon className="h-16 w-16 text-primary" />}
              title={displayMode === 'resource-only' ? '暂无资料' : '暂无文件夹或资源'}
              description={
                selectedNode?.type === 'all'
                  ? '点击右下角按钮开始创建文件夹或添加资源，让您的资源管理井井有条！'
                  : selectedNode?.type === 'folder'
                  ? displayMode === 'resource-only'
                  ? '此文件夹及其子文件夹中暂无资料，尝试切换到"文件夹+资料"模式查看文件夹结构。'
                  : '在此文件夹中添加子文件夹或资源，开始您的资源管理之旅。'
                  : selectedNode?.type === 'tags'
                  ? '暂无匹配的标签资源，尝试选择其他标签或添加新资源。'
                  : '点击右下角"+"按钮开始添加资源，构建您的资源库。'
              }
            />
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
                viewType={viewType}
                defaultOpen={false}
              />
            )}

            {/* 显示子文件夹 - 只在文件夹+资料模式下显示 */}
            {displayMode === 'folder-and-resource' && subFolders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span>文件夹</span>
                  <span className="text-xs">({subFolders.length})</span>
                </h2>
                <div className={
                  isMobile
                    ? 'flex flex-col gap-2'
                    : viewType === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : viewType === 'list'
                        ? 'flex flex-col gap-2'
                        : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'
                }>
                  {subFolders.map((folder) => (
                    <SubFolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={(folder) => onNodeSelect?.({ type: 'folder', data: folder })}
                      onEdit={(folder) => onEditFolder?.(folder)}
                      onDelete={handleRefresh}
                      onResourceMove={handleRefresh}
                      compact={isMobile || viewType === 'list' || viewType === 'thumbnail'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 显示资源 */}
            {resources.length > 0 && (
              <div>
                {(displayMode === 'folder-and-resource' && subFolders.length > 0) && (
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <span>资源</span>
                    <span className="text-xs">({resources.length})</span>
                  </h2>
                )}
                <div className={
                  viewType === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : viewType === 'list'
                      ? 'flex flex-col gap-2'
                      : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2'
                }>
                  {resources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onDelete={handleRefresh}
                      viewType={viewType}
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
