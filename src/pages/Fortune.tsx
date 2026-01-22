import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, Sparkles, Loader2, User, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Fortune() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是拾光的运势助手。请告诉我你的生辰八字或想咨询的事情，我来为你推算今年的运势。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = '算运势 - 拾光';
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`请求失败 (${response.status}): ${errorText}`);
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        console.log('Streaming response detected');
        
        // 先结束加载状态，添加助手消息用于流式更新
        setIsLoading(false);
        const assistantMessageIndex = messages.length + 1;
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = ''; // 累积未完成的数据
        let fullText = '';
        let currentDataBlock = ''; // 累积当前事件的 data 字段

        if (!reader) {
          throw new Error('无法读取响应流');
        }

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream complete, final text length:', fullText.length);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // 按双换行分割完整的 SSE 事件
          const events = buffer.split('\n\n');
          // 保留最后不完整的事件
          buffer = events.pop() || '';
          
          for (const event of events) {
            const lines = event.split('\n');
            currentDataBlock = '';
            
            for (const line of lines) {
              if (line.startsWith('data:')) {
                // 累积 data 字段（可能跨多行）
                currentDataBlock += line.substring(5).trim();
              }
            }
            
            if (currentDataBlock) {
              try {
                if (currentDataBlock === '[DONE]') {
                  console.log('Stream finished with [DONE]');
                  continue;
                }
                
                const data = JSON.parse(currentDataBlock);
                
                // 提取文本内容
                if (data.output?.text) {
                  fullText = data.output.text;
                  
                  // 实时更新消息
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[assistantMessageIndex] = {
                      role: 'assistant',
                      content: fullText
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略解析错误（可能是不完整的 JSON）
                console.log('Parse error, waiting for more data');
              }
            }
          }
        }

        if (!fullText) {
          throw new Error('未收到有效响应');
        }
      } else {
        // 非流式响应，按原方式处理
        const data = await response.json();
        console.log('Response data:', data);
        
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

        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('Fortune error:', error);
      
      let errorMessage = '';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '请求超时，AI 正在思考较复杂的问题，请稍后重试';
        } else if (error.message.includes('Failed to fetch')) {
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
              <Card className={`p-3 max-w-[80%] shadow-sm ${
                msg.role === 'user' ? 'bg-purple-600 text-white border-none' : 'bg-white'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <Card className="p-3 bg-white shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
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
