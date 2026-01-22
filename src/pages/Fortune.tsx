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
      console.log('=== Fortune Request Start ===');
      console.log('User message:', userMessage);
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);
      
      const invokeOptions = {
        body: { message: userMessage }
      };
      
      console.log('Invoke options:', invokeOptions);
      console.log('Calling supabase.functions.invoke...');
      
      const result = await supabase.functions.invoke('fortune-agent', invokeOptions);
      
      console.log('=== Fortune Response ===');
      console.log('Full result:', result);
      console.log('Response data:', result.data);
      console.log('Response error:', result.error);

      if (result.error) {
        console.error('Function invocation error details:', {
          name: result.error.name,
          message: result.error.message,
          context: result.error.context,
          details: result.error
        });
        
        // 尝试从错误中提取更多信息
        const errorMsg = result.error.message || 
                        result.error.context?.message || 
                        'Function call failed';
        throw new Error(errorMsg);
      }

      const data = result.data;

      // 检查返回数据的不同格式
      let assistantMessage = '';
      
      if (data?.output?.text) {
        assistantMessage = data.output.text;
      } else if (data?.output?.choices?.[0]?.message?.content) {
        assistantMessage = data.output.choices[0].message.content;
      } else if (data?.message) {
        assistantMessage = data.message;
      } else if (data?.error) {
        console.error('API returned error:', data.error, data.details);
        throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
      } else {
        console.warn('Unexpected response format. Full data:', data);
        assistantMessage = '收到了回复，但格式异常。完整响应：' + JSON.stringify(data);
      }

      console.log('Assistant message:', assistantMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      
    } catch (error) {
      console.error('=== Fortune Error ===');
      console.error('Error object:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ 出现错误：${errorMessage}\n\n可能原因：\n1. 服务未正确配置\n2. 网络连接问题\n3. API调用失败\n\n请联系管理员或稍后重试。` 
      }]);
      toast.error(`请求失败: ${errorMessage}`);
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
