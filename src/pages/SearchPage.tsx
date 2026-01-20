import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceCard } from '@/components/ResourceCard';
import { Resource } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Resource[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupedResults, setGroupedResults] = useState<Record<string, Resource[]>>({});

  const loadSearchHistory = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('search_history')
      .select('keyword')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const uniqueKeywords = Array.from(new Set(data.map(item => item.keyword)));
      setHistory(uniqueKeywords);
    }
  }, [user]);

  const saveSearchHistory = useCallback(async (kw: string) => {
    if (!user || !kw.trim()) return;

    await supabase
      .from('search_history')
      .insert({ user_id: user.id, keyword: kw });

    loadSearchHistory();
  }, [user, loadSearchHistory]);

  const performSearch = useCallback(async (kw: string) => {
    if (!user || !kw.trim()) return;

    setLoading(true);
    saveSearchHistory(kw);

    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        sections:section_id(name, type),
        modules:module_id(name)
      `)
      .eq('user_id', user.id)
      .or(`name.ilike.%${kw}%,notes.ilike.%${kw}%,url.ilike.%${kw}%`);

    setLoading(false);

    if (error) {
      toast.error('搜索失败');
      return;
    }

    setResults(data as Resource[] || []);

    // 按板块分组
    const grouped: Record<string, Resource[]> = {};
    data?.forEach(item => {
      const sectionName = item.sections?.name || '未分类';
      if (!grouped[sectionName]) {
        grouped[sectionName] = [];
      }
      grouped[sectionName].push(item as Resource);
    });
    setGroupedResults(grouped);
  }, [user, saveSearchHistory]);

  useEffect(() => {
    document.title = '搜索 - 拾光';
    loadSearchHistory();
  }, [loadSearchHistory]);

  useEffect(() => {
    const initialKeyword = searchParams.get('q');
    if (initialKeyword) {
      setKeyword(initialKeyword);
      performSearch(initialKeyword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteSearchHistory = async (kw: string) => {
    if (!user) return;

    await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id)
      .eq('keyword', kw);

    loadSearchHistory();
  };

  const handleSearch = () => {
    if (!keyword.trim()) {
      toast.error('请输入搜索关键词');
      return;
    }
    performSearch(keyword);
  };

  const highlightKeyword = (text: string) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部导航 */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">全局搜索</h1>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="搜索资源..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            搜索
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <ScrollArea className="h-full">
          {/* 搜索历史 */}
          {!keyword && history.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground">搜索历史</h2>
              <div className="flex flex-wrap gap-2">
                {history.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 group"
                  >
                    <span onClick={() => {
                      setKeyword(item);
                      performSearch(item);
                    }}>{item}</span>
                    <Trash2
                      className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSearchHistory(item);
                      }}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 搜索结果 */}
          {keyword && (
            <div>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">搜索中...</div>
              ) : results.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">未找到相关资源</p>
                  <Button onClick={() => navigate('/home')}>
                    <Plus className="h-4 w-4 mr-2" />
                    去录入
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    找到 {results.length} 条结果
                  </div>
                  {Object.entries(groupedResults).map(([sectionName, items]) => (
                    <div key={sectionName}>
                      <h2 className="text-lg font-semibold mb-3">{sectionName}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((resource) => (
                          <ResourceCard
                            key={resource.id}
                            resource={resource}
                            highlightKeyword={keyword}
                            onDelete={() => performSearch(keyword)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
