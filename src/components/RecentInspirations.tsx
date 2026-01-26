import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Lightbulb, ArrowRight, FileText, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Inspiration, ResourceInitData, ViewType } from '@/types';

interface RecentInspirationsProps {
  onConvertToResource: (data: ResourceInitData) => void;
  onViewAll: () => void;
  refreshTrigger?: number;
  viewType?: ViewType;
  defaultOpen?: boolean;
}

export function RecentInspirations({ onConvertToResource, onViewAll, refreshTrigger, viewType = 'grid', defaultOpen = false }: RecentInspirationsProps) {
  const { user } = useAuth();
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const loadRecentInspirations = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('inspirations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3);

    setInspirations((data as Inspiration[]) || []);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRecentInspirations();
    }
  }, [user, refreshTrigger, loadRecentInspirations]);

  if (inspirations.length === 0) return null;

  // 根据视图类型渲染灵感项
  const renderInspirationItem = (inspiration: Inspiration) => {
    switch (viewType) {
      case 'list':
        return (
          <div
            key={inspiration.id}
            className="flex items-center justify-between p-2 hover:bg-accent/30 rounded transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-1">{inspiration.content}</p>
              {inspiration.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {inspiration.location}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-xs h-6 ml-2"
              onClick={() => onConvertToResource({
                name: inspiration.content.substring(0, 100),
                notes: inspiration.content,
                location: inspiration.location,
                inspirationId: inspiration.id
              })}
            >
              <FileText className="h-3 w-3" />
            </Button>
          </div>
        );

      case 'thumbnail':
        return (
          <Card
            key={inspiration.id}
            className="p-2 hover:shadow-sm transition-shadow cursor-pointer group"
            onClick={() => onConvertToResource({
              name: inspiration.content.substring(0, 100),
              notes: inspiration.content,
              location: inspiration.location,
              inspirationId: inspiration.id
            })}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <FileText className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
              </div>
              <p className="text-xs line-clamp-2 mt-1">{inspiration.content}</p>
              {inspiration.location && (
                <p className="text-xs text-muted-foreground truncate">
                  {inspiration.location}
                </p>
              )}
            </div>
          </Card>
        );

      case 'grid':
      default:
        return (
          <Card
            key={inspiration.id}
            className="p-3 hover:shadow-md transition-shadow"
          >
            <div className="space-y-2">
              <p className="text-sm line-clamp-2">{inspiration.content}</p>
              {inspiration.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {inspiration.location}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => onConvertToResource({
                    name: inspiration.content.substring(0, 100),
                    notes: inspiration.content,
                    location: inspiration.location,
                    inspirationId: inspiration.id
                  })}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  转资源
                </Button>
              </div>
            </div>
          </Card>
        );
    }
  };

  // 根据视图类型确定容器类名
  const getContainerClass = () => {
    switch (viewType) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
      case 'list':
        return 'flex flex-col gap-1';
      case 'thumbnail':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
    }
  };

  return (
    <Card className="p-3 mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-transparent p-0 h-auto [&[data-state=open]]:text-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="font-semibold text-foreground">
                  最近的灵感 ({inspirations.length})
                </h3>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-muted-foreground hover:text-foreground"
          >
            查看全部
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <CollapsibleContent className="mt-3">
          <div className={getContainerClass()}>
            {inspirations.map(renderInspirationItem)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
