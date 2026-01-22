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
  isStreaming?: boolean;
}

export default function Fortune() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是拾光的运势助手。请告诉我你的生辰八字或想咨询的事情，我来为你推算今年的运势。' }
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

    // 添加一个空的助手消息用于流式更新
    const newMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      console.log('=== Fortune Request (Streaming) ===');
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
      console.log('Content-Type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`请求失败 (${response.status}): ${errorText}`);
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        console.log('Processing SSE stream...');
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream complete, final length:', fullText.length);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // 按事件分割（以双换行分隔）
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // 保留最后不完整的
          
          for (const event of events) {
            if (!event.trim()) continue;
            
            // 提取 data: 行
            const lines = event.split('\n');
            let dataLine = '';
            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataLine = line.substring(5).trim();
                break;
              }
            }
            
            if (!dataLine || dataLine === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataLine);
              if (data.output?.text) {
                fullText = data.output.text;
                
                // 实时更新消息
                setMessages(prev => {
                  const updated = [...prev];
                  updated[newMessageIndex] = {
                    role: 'assistant',
                    content: fullText,
                    isStreaming: true
                  };
                  return updated;
                });
              }
            } catch (e) {
              console.warn('Failed to parse:', dataLine.substring(0, 50));
            }
          }
        }

        // 完成流式传输
        setMessages(prev => {
          const updated = [...prev];
          updated[newMessageIndex] = {
            role: 'assistant',
            content: fullText || '未收到回复',
            isStreaming: false
          };
          return updated;
        });
        
      } else {
        // 非流式响应
        const data = await response.json();
        
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
          assistantMessage = JSON.stringify(data, null, 2);
        }

        setMessages(prev => {
          const updated = [...prev];
          updated[newMessageIndex] = {
            role: 'assistant',
            content: assistantMessage,
            isStreaming: false
          };
          return updated;
        });
      }
      
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
      
      setMessages(prev => {
        const updated = [...prev];
        updated[newMessageIndex] = {
          role: 'assistant',
          content: `❌ ${errorMessage}`,
          isStreaming: false
        };
        return updated;
      });
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
                  <Bot className={`h-5 w-5 text-purple-600 ${msg.isStreaming ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <Card className={`p-3 max-w-[80%] shadow-sm ${
                msg.role === 'user' ? 'bg-purple-600 text-white border-none' : 'bg-white'
              }`}>
                {msg.role === 'assistant' && msg.content ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
