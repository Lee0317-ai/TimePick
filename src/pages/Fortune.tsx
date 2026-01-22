import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Sparkles, User, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Fortune() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是拾光的运势助手。请告诉我您的基本信息，需要姓名，性别，出生地，出生日期，历法d等信息。另外再告知需要问的问题。（如综合运势、事业、财运、感情等），我来为你推算今年的运势。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = '算运势 - 拾光';
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 思考时间计时器
  useEffect(() => {
    if (isLoading) {
      setThinkingTime(0);
      thinkingTimerRef.current = setInterval(() => {
        setThinkingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      setThinkingTime(0);
    }
    
    return () => {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
      }
    };
  }, [isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    trackEvent('fortune_chat_send');

    try {
      console.log('=== Fortune Request ===');
      console.log('User message:', userMessage);
      
      // 使用 anon key 作为 Bearer token
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnltaXNqZnZpb3lheWx6a2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Nzc1MTQsImV4cCI6MjA4MzI1MzUxNH0.OIhpRNX9rbWWMqV_l0CSX4QTEbxqZYFjPafigjlB1es';
      
      const response = await fetch('https://glfymisjfvioyaylzkdj.supabase.co/functions/v1/fortune-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({ message: userMessage })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`请求失败 (${response.status}): ${errorText}`);
      }

      // 获取完整响应（非流式）
      const data = await response.json();
      console.log('Response data keys:', Object.keys(data));
      console.log('Has output:', !!data?.output);
      console.log('Output text length:', data?.output?.text?.length || 0);
      
      if (data?.error) {
        throw new Error(data.error);
      }

      let assistantMessage = '';
      if (data?.output?.text) {
        assistantMessage = data.output.text;
      } else if (data?.output?.choices?.[0]?.message?.content) {
        assistantMessage = data.output.choices[0].message.content;
      } else if (data?.message) {
        assistantMessage = data.message;
      } else {
        console.warn('Unexpected response format:', data);
        assistantMessage = JSON.stringify(data, null, 2);
      }

      console.log('Assistant message length:', assistantMessage.length);
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      
    } catch (error) {
      console.error('Fortune error:', error);
      
      let errorMessage = '';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = String(error);
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ ${errorMessage}` 
      }]);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-1.5 rounded-full">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">拾光运势助手</h1>
            <p className="text-xs text-muted-foreground mt-1">基于阿里云百炼 AI 智能体</p>
          </div>
        </div>
      </header>

      {/* 聊天区域 */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-purple-600' : 'bg-white border shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <User className="h-5 w-5 text-white" />
                ) : (
                  <Bot className="h-5 w-5 text-purple-600" />
                )}
              </div>
              <Card className={`p-4 max-w-[80%] shadow-sm ${
                msg.role === 'user' ? 'bg-purple-600 text-white border-none' : 'bg-white'
              }`}>
                {msg.role === 'assistant' && msg.content ? (
                  <div className="prose prose-sm max-w-none 
                    prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-4 first:prose-headings:mt-0
                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                    prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2
                    prose-strong:text-purple-600 prose-strong:font-semibold
                    prose-ul:my-2 prose-ol:my-2 prose-li:text-foreground prose-li:my-1
                    prose-blockquote:border-l-purple-600 prose-blockquote:bg-purple-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r
                    prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                    prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                    prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
                    prose-table:border-collapse prose-table:w-full
                    prose-th:border prose-th:border-slate-200 prose-th:bg-slate-50 prose-th:p-2 prose-th:text-left
                    prose-td:border prose-td:border-slate-200 prose-td:p-2
                  ">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-foreground" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-foreground" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-foreground" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-foreground" {...props} />,
                        h5: ({node, ...props}) => <h5 className="text-foreground" {...props} />,
                        h6: ({node, ...props}) => <h6 className="text-foreground" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-600 animate-pulse" />
              </div>
              <Card className="p-4 bg-white shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">正在推算运势...</span>
                  </div>
                  {thinkingTime > 0 && (
                    <div className="text-xs text-muted-foreground">
                      已思考 {thinkingTime} 秒
                      {thinkingTime > 30 && thinkingTime <= 60 && '，正在深度分析...'}
                      {thinkingTime > 60 && thinkingTime <= 120 && '，问题较复杂，请耐心等待...'}
                      {thinkingTime > 120 && '，马上就好...'}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="p-4 bg-white border-t">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            placeholder="输入您想咨询的内容..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
