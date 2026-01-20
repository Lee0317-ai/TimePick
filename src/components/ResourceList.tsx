import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ResourceCard } from './ResourceCard';
import { Loader2 } from 'lucide-react';
import { Resource, TreeNode } from '@/types';

interface ResourceListProps {
  selectedNode: TreeNode | null;
  refreshTrigger: number;
  onRefresh: () => void;
}

export function ResourceList({ selectedNode, refreshTrigger, onRefresh }: ResourceListProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const loadResources = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('resources')
      .select(`
        *,
        sections:section_id(name, type),
        modules:module_id(name)
      `)
      .eq('user_id', user.id);

    if (selectedNode?.type === 'section') {
      query = query.eq('section_id', selectedNode.data.id);
      if (selectedNode.module) {
        query = query.eq('module_id', selectedNode.module.id);
      }
    } else if (selectedNode?.type === 'module') {
      query = query.eq('module_id', selectedNode.data.id);
      if (selectedNode.section) {
        query = query.eq('section_id', selectedNode.section.id);
      }
    } else if (selectedNode?.type === 'all') {
      // 不添加额外过滤条件，查询所有资源
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    setLoading(false);

    if (!error && data) {
      setResources(data as Resource[]);
    }
  }, [user, selectedNode]);

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
            <BreadcrumbLink>首页</BreadcrumbLink>
          </BreadcrumbItem>
          {selectedNode.type === 'all' ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="font-semibold">全部资源</BreadcrumbLink>
              </BreadcrumbItem>
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
      <div className="border-b p-4">
        {renderBreadcrumb()}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : resources.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            暂无资源
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDelete={onRefresh}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
