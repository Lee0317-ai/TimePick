import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight, FileText, MapPin } from 'lucide-react';
import { Inspiration, ResourceInitData } from '@/types';

interface RecentInspirationsProps {
  onConvertToResource: (data: ResourceInitData) => void;
  onViewAll: () => void;
}

export function RecentInspirations({ onConvertToResource, onViewAll }: RecentInspirationsProps) {
  const { user } = useAuth();
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);

  useEffect(() => {
    if (user) {
      loadRecentInspirations();
    }
  }, [user]);

  const loadRecentInspirations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('inspirations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3);

    setInspirations(data || []);
  };

  if (inspirations.length === 0) return null;

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
            最近的灵感
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-yellow-700 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
        >
          查看全部
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        {inspirations.map((inspiration) => (
          <div
            key={inspiration.id}
            className="flex items-start gap-3 p-3 bg-white/80 dark:bg-gray-900/50 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2 mb-1">{inspiration.content}</p>
              {inspiration.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {inspiration.location}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs h-7"
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
        ))}
      </div>
    </Card>
  );
}
