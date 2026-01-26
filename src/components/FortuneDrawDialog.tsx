import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Sparkles, Loader2, Calendar, Briefcase, GraduationCap, Heart, Activity, Download, ZoomIn } from 'lucide-react';
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
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    if (open && user) {
      checkAndDraw();
    }
  }, [open, user]);

  const checkAndDraw = async () => {
    if (!user) return;

    // 先检查是否有出生日期
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('birth_date')
      .eq('id', user.id)
      .single();

    console.log('Profile check:', { profile, profileError });

    if (profileError) {
      toast.error('获取个人信息失败');
      return;
    }

    if (!profile?.birth_date) {
      console.log('Birth date not set, showing input dialog');
      setNeedBirthDate(true);
      toast.info('请先设置您的出生日期');
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
      console.log('=== Starting fortune draw ===');
      console.log('User ID:', user.id);
      
      // 获取出生日期
      const { data: profile } = await supabase
        .from('profiles')
        .select('birth_date')
        .eq('id', user.id)
        .single();

      if (!profile?.birth_date) {
        setNeedBirthDate(true);
        toast.error('请先设置您的出生日期');
        return;
      }

      console.log('Birth date:', profile.birth_date);

      // 使用fetch直接调用，像识别功能一样
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnltaXNqZnZpb3lheWx6a2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Nzc1MTQsImV4cCI6MjA4MzI1MzUxNH0.OIhpRNX9rbWWMqV_l0CSX4QTEbxqZYFjPafigjlB1es';

      console.log('Calling draw-fortune function...');
      const response = await fetch(
        'https://glfymisjfvioyaylzkdj.supabase.co/functions/v1/draw-fortune',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: user.id,
            birthDate: profile.birth_date
          })
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        toast.error('抽签服务暂时不可用，请稍后重试');
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!data.success) {
        console.error('Operation failed:', data);
        toast.error(data.error || data.message || '识别失败，请重试');
        return;
      }

      console.log('=== Success ===');
      setFortuneData(data.data);
      trackEvent('fortune_draw_success', { cached: data.cached || false });

      if (data.cached) {
        toast.success('今日运势已为您准备好了');
      } else {
        toast.success('抽签成功！');
      }
    } catch (error) {
      console.error('=== Exception caught ===');
      console.error('Exception:', error);
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

  // 解析运势内容
  const parseFortuneContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const sections: { [key: string]: { trend: string; advice: string } } = {};
    let currentSection = '';
    let constellation = '';
    let date = '';

    lines.forEach(line => {
      // 提取星座
      if (line.includes('**星座**')) {
        constellation = line.split('：')[1]?.trim() || '';
      }
      // 提取时间
      else if (line.includes('**时间**')) {
        date = line.split('：')[1]?.trim() || '';
      }
      // 提取各维度
      else if (line.includes('「事业」')) {
        currentSection = 'career';
        sections[currentSection] = { trend: '', advice: '' };
      }
      else if (line.includes('「学业」')) {
        currentSection = 'study';
        sections[currentSection] = { trend: '', advice: '' };
      }
      else if (line.includes('「感情」')) {
        currentSection = 'love';
        sections[currentSection] = { trend: '', advice: '' };
      }
      else if (line.includes('「健康」')) {
        currentSection = 'health';
        sections[currentSection] = { trend: '', advice: '' };
      }
      // 提取趋势和建议
      else if (currentSection) {
        if (line.includes('▶️ 趋势')) {
          sections[currentSection].trend = line.split('：')[1]?.trim() || '';
        }
        else if (line.includes('▶️ 建议')) {
          sections[currentSection].advice = line.split('：')[1]?.trim() || '';
        }
      }
    });

    return { constellation, date, sections };
  };

  // 获取维度图标和颜色
  const getSectionConfig = (key: string) => {
    const configs = {
      career: { icon: Briefcase, label: '事业', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
      study: { icon: GraduationCap, label: '学业', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
      love: { icon: Heart, label: '感情', color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
      health: { icon: Activity, label: '健康', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    };
    return configs[key as keyof typeof configs] || configs.career;
  };

  // 渲染抽签结果
  const renderFortuneResult = () => {
    if (!fortuneData) return null;

    const { constellation, date, sections } = parseFortuneContent(fortuneData.fortune_content);
    const isMobile = window.innerWidth < 768;

    return (
      <div className="space-y-4 pb-4">
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
          {/* 左侧：运势图片 */}
          <div className="space-y-3">
            <div 
              className={`${isMobile ? 'aspect-[16/9]' : 'aspect-square'} rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg border-2 border-purple-100 flex items-center justify-center cursor-pointer relative group`}
              onClick={() => setShowImagePreview(true)}
            >
              <img
                src={fortuneData.image_url}
                alt="运势签"
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<div class="text-muted-foreground flex flex-col items-center justify-center gap-2"><Sparkles class="h-12 w-12" /><p>运势签图</p></div>';
                }}
              />
              {/* 悬浮提示 */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div className="text-white text-sm flex items-center gap-2">
                  <ZoomIn className="h-5 w-5" />
                  <span>点击查看</span>
                </div>
              </div>
            </div>
            
            {/* 星座和日期信息 */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">{constellation}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {date || new Date(fortuneData.draw_date).toLocaleDateString('zh-CN')}
              </Badge>
            </div>
          </div>

          {/* 右侧：运势内容 */}
          <div className={`${isMobile ? '' : 'overflow-y-auto max-h-[500px] pr-3'}`}>
            <div className="space-y-4">
              {/* 标题 */}
              <div className="text-center pb-3 border-b">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    今日运势
                  </h3>
                </div>
              </div>

              {/* 各维度运势 */}
              {Object.entries(sections).map(([key, data]) => {
                const config = getSectionConfig(key);
                const Icon = config.icon;

                return (
                  <div 
                    key={key}
                    className={`p-4 rounded-xl border-2 ${config.borderColor} ${config.bgColor} transition-all hover:shadow-md`}
                  >
                    {/* 维度标题 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-lg bg-white shadow-sm ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
                    </div>

                    {/* 趋势 */}
                    {data.trend && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">趋势</p>
                        <p className="text-sm leading-relaxed text-gray-700">
                          {data.trend}
                        </p>
                      </div>
                    )}

                    {/* 建议 */}
                    {data.advice && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">建议</p>
                        <p className="text-sm leading-relaxed text-gray-700">
                          {data.advice}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 抽签日期 */}
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  抽签日期：{new Date(fortuneData.draw_date).toLocaleDateString('zh-CN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          onClick={handleClose}
        >
          知道了
        </Button>
      </div>
    );
  };

  // 下载图片
  const handleDownloadImage = async () => {
    if (!fortuneData?.image_url) return;

    try {
      const response = await fetch(fortuneData.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `运势签_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('图片下载成功');
      trackEvent('fortune_image_download');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('图片下载失败');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="px-6 pt-6">
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
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {isDrawing && renderDrawingAnimation()}
            {!isDrawing && needBirthDate && renderBirthDateInput()}
            {!isDrawing && !needBirthDate && fortuneData && renderFortuneResult()}
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative bg-black">
            <img
              src={fortuneData?.image_url}
              alt="运势签大图"
              className="w-full h-full object-contain max-h-[85vh]"
              crossOrigin="anonymous"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm">运势签 - {new Date().toLocaleDateString('zh-CN')}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadImage}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  下载图片
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
