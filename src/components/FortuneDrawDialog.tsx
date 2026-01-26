import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { FortuneDrawResponse } from '@/types';
import { trackEvent } from '@/lib/analytics';

interface FortuneDrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FortuneDrawDialog({ open, onOpenChange }: FortuneDrawDialogProps) {
  const { user } = useAuth();
  const [isDrawing, setIsDrawing] = useState(false);
  const [fortuneData, setFortuneData] = useState<FortuneDrawResponse['data'] | null>(null);
  const [needBirthDate, setNeedBirthDate] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [isSavingBirthDate, setIsSavingBirthDate] = useState(false);

  useEffect(() => {
    if (open && user) {
      checkAndDraw();
    }
  }, [open, user]);

  const checkAndDraw = async () => {
    if (!user) return;

    // 检查是否有出生日期
    const { data: profile } = await supabase
      .from('profiles')
      .select('birth_date')
      .eq('id', user.id)
      .single();

    if (!profile?.birth_date) {
      setNeedBirthDate(true);
      return;
    }

    // 开始抽签
    await performDraw();
  };

  const performDraw = async () => {
    if (!user) return;

    setIsDrawing(true);
    setFortuneData(null);
    trackEvent('fortune_draw_start');

    try {
      console.log('Calling draw-fortune function...');
      
      const { data, error } = await supabase.functions.invoke('draw-fortune', {
        method: 'POST',
      });

      console.log('Draw fortune response:', { data, error });

      if (error) {
        console.error('Draw fortune error:', error);
        
        // 检查是否是出生日期未设置的错误
        if (error.message?.includes('birth_date_required') || 
            data?.error === 'birth_date_required') {
          setNeedBirthDate(true);
          toast.error('请先设置您的出生日期');
          return;
        }
        
        // 显示详细错误信息
        const errorMsg = error.message || data?.error || '识别失败，请重试';
        toast.error(errorMsg);
        return;
      }

      if (!data?.success) {
        console.error('Draw fortune failed:', data);
        const errorMsg = data?.error || data?.message || '识别失败，请重试';
        toast.error(errorMsg);
        return;
      }

      setFortuneData(data.data);
      trackEvent('fortune_draw_success', { cached: data.cached });

      if (data.cached) {
        toast.success('今日运势已为您准备好了');
      } else {
        toast.success('抽签成功！');
      }
    } catch (error) {
      console.error('Draw fortune exception:', error);
      toast.error('网络错误，请检查连接后重试');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleSaveBirthDate = async () => {
    if (!birthDate) {
      toast.error('请选择出生日期');
      return;
    }

    setIsSavingBirthDate(true);

    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: birthDate })
      .eq('id', user?.id);

    setIsSavingBirthDate(false);

    if (error) {
      toast.error('保存失败');
      return;
    }

    toast.success('出生日期已保存');
    setNeedBirthDate(false);
    trackEvent('fortune_birth_date_set');

    // 保存成功后立即抽签
    await performDraw();
  };

  const handleClose = () => {
    setFortuneData(null);
    setNeedBirthDate(false);
    setBirthDate('');
    onOpenChange(false);
  };

  // 渲染抽签动画
  const renderDrawingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="relative">
        <div className="absolute inset-0 animate-ping">
          <Sparkles className="h-16 w-16 text-primary opacity-75" />
        </div>
        <Sparkles className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">正在为您抽签...</h3>
        <p className="text-muted-foreground">请稍候，运势正在计算中</p>
      </div>
      <div className="flex gap-2">
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  // 渲染出生日期输入
  const renderBirthDateInput = () => (
    <div className="py-6 space-y-6">
      <div className="text-center space-y-2">
        <Calendar className="h-12 w-12 text-primary mx-auto" />
        <h3 className="text-xl font-semibold">设置您的出生日期</h3>
        <p className="text-muted-foreground">
          抽签需要您的出生日期来计算星座运势
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="birthDate">出生日期</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <Button
          className="w-full"
          onClick={handleSaveBirthDate}
          disabled={!birthDate || isSavingBirthDate}
        >
          {isSavingBirthDate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存并抽签
        </Button>
      </div>
    </div>
  );

  // 渲染抽签结果
  const renderFortuneResult = () => {
    if (!fortuneData) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧：运势图片 */}
          <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            <img
              src={fortuneData.image_url}
              alt="运势签"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="text-muted-foreground">图片加载失败</div>';
              }}
            />
          </div>

          {/* 右侧：运势内容 */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">今日运势</h3>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {fortuneData.fortune_content}
              </div>
              <div className="pt-4 text-xs text-muted-foreground">
                抽签日期：{new Date(fortuneData.draw_date).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </ScrollArea>
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={handleClose}
        >
          知道了
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            每日运势抽签
          </DialogTitle>
          <DialogDescription>
            {needBirthDate 
              ? '首次使用需要设置出生日期' 
              : fortuneData 
              ? '查看今日运势' 
              : '每天只能抽一次签哦'}
          </DialogDescription>
        </DialogHeader>

        {isDrawing && renderDrawingAnimation()}
        {!isDrawing && needBirthDate && renderBirthDateInput()}
        {!isDrawing && !needBirthDate && fortuneData && renderFortuneResult()}
      </DialogContent>
    </Dialog>
  );
}
