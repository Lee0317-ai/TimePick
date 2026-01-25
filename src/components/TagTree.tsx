import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Plus, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { TagStat, TreeNode } from '@/types';
import { cn } from '@/lib/utils';
import { TagManageDialog } from './TagManageDialog';

interface TagTreeProps {
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  onNodeSelect?: (node: TreeNode) => void;
}

export function TagTree({ selectedTags, onTagSelect, onNodeSelect }: TagTreeProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<TagStat[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['freq_high']));
  const [loading, setLoading] = useState(true);
  const [showManageDialog, setShowManageDialog] = useState(false);

  const loadTags = useCallback(async () => {
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

      const tagStats: TagStat[] = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.tag.localeCompare(b.tag, 'zh-CN');
        });

      setTags(tagStats);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleTagToggle = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    onTagSelect(newSelectedTags);
    
    if (onNodeSelect) {
      onNodeSelect({
        type: 'tags',
        data: { id: 'tags', name: '标签筛选', tags: newSelectedTags }
      });
    }
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // 预设标签颜色
  const tagColors = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635',
    '#34d399', '#22d3ee', '#818cf8', '#c084fc',
    '#f472b6', '#94a3b8'
  ];

  // 根据标签名生成稳定的颜色
  const getTagColor = (tagName: string) => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return tagColors[Math.abs(hash) % tagColors.length];
  };

  // 按使用频率分组（更细粒度）
  const getFrequencyGroup = (count: number) => {
    if (count >= 20) return { key: 'freq_very_high', label: '高频 (20+)', order: 0 };
    if (count >= 10) return { key: 'freq_high', label: '常用 (10-19)', order: 1 };
    if (count >= 5) return { key: 'freq_medium', label: '中频 (5-9)', order: 2 };
    if (count >= 2) return { key: 'freq_low', label: '偶尔 (2-4)', order: 3 };
    return { key: 'freq_rare', label: '少用 (1)', order: 4 };
  };

  const groupedTags = tags.reduce((acc, tagStat) => {
    const group = getFrequencyGroup(tagStat.count);
    if (!acc[group.key]) {
      acc[group.key] = { label: group.label, tags: [] };
    }
    acc[group.key].tags.push(tagStat);
    return acc;
  }, {} as Record<string, { label: string; tags: TagStat[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-2">
        {/* 标签管理按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4" />
            标签 ({tags.length})
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowManageDialog(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            管理
          </Button>
        </div>

        {/* 已选标签 */}
        {selectedTags.length > 0 && (
          <div className="p-3 bg-primary/10 rounded-lg space-y-2 mb-4">
            <div className="text-xs font-medium text-primary">
              已选择 {selectedTags.length} 个标签
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                  <span className="ml-1">×</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 标签列表 - 按频率分组 */}
        {tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无标签</p>
            <p className="text-xs mt-1">在资源中添加标签后会显示在这里</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-1">
              {Object.entries(groupedTags).map(([groupKey, { label, tags: groupTags }]) => {
                const isExpanded = expandedGroups.has(groupKey);
                
                return (
                  <div key={groupKey}>
                    {/* 分组标题 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 h-8 hover:bg-accent"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronRight className="h-3 w-3 mr-1" />
                      )}
                      <span className="text-xs text-muted-foreground flex-1 text-left">
                        {label}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {groupTags.length}
                      </Badge>
                    </Button>

                    {/* 标签列表 */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1">
                        {groupTags.map(({ tag, count }) => (
                          <div
                            key={tag}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded hover:bg-accent cursor-pointer transition-colors',
                              selectedTags.includes(tag) && 'bg-primary/10'
                            )}
                            onClick={() => handleTagToggle(tag)}
                          >
                            <Checkbox
                              checked={selectedTags.includes(tag)}
                              onCheckedChange={() => handleTagToggle(tag)}
                              className="shrink-0"
                            />
                            {/* 颜色指示器 */}
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getTagColor(tag) }}
                            />
                            <span className="flex-1 text-sm truncate">{tag}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* 标签管理对话框 */}
      <TagManageDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        onTagsUpdated={loadTags}
      />
    </>
  );
}
