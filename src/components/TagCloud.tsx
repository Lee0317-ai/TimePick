import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface TagCloudProps {
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  onClearAll: () => void;
}

export function TagCloud({ selectedTags, onTagSelect, onTagRemove, onClearAll }: TagCloudProps) {
  const { user } = useAuth();
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTags = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    
    // 获取所有资源的标签
    const { data } = await supabase
      .from('resources')
      .select('tags')
      .eq('user_id', user.id)
      .not('tags', 'is', null);

    if (data) {
      // 统计标签出现次数
      const tagCounts: Record<string, number> = {};
      
      data.forEach((resource) => {
        if (resource.tags) {
          resource.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      // 转换为数组并排序
      const tagArray = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      setAllTags(tagArray);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagRemove(tag);
      trackEvent('tag_filter_remove', { tag });
    } else {
      onTagSelect(tag);
      trackEvent('tag_filter_select', { tag });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        加载标签中...
      </div>
    );
  }

  if (allTags.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        <Tag className="h-4 w-4 mr-2" />
        暂无标签
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 已选中的标签 */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md border border-primary/20">
          <span className="text-sm font-medium text-primary flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" />
            已选择
          </span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="px-2 py-0.5 cursor-pointer hover:bg-primary/90"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClearAll();
              trackEvent('tag_filter_clear_all');
            }}
            className="h-7 text-xs"
          >
            清除
          </Button>
        </div>
      )}

      {/* 所有标签云 */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-md">
        {allTags.map(({ tag, count }) => {
          const isSelected = selectedTags.includes(tag);
          const fontSize = Math.min(Math.max(count / 2 + 10, 11), 16);
          
          return (
            <Badge
              key={tag}
              variant={isSelected ? 'default' : 'secondary'}
              className={`px-3 py-1 cursor-pointer transition-all hover:scale-110 ${
                isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:bg-secondary/80'
              }`}
              style={{ fontSize: `${fontSize}px` }}
              onClick={() => handleTagClick(tag)}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </Badge>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        共 {allTags.length} 个标签，点击标签进行筛选
      </p>
    </div>
  );
}
