import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mic,
  MicOff,
  Save,
  Trash2,
  Edit,
  MapPin,
  Lightbulb,
  Plus,
  Loader2,
  X,
  FileText,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Inspiration, ResourceInitData } from '@/types';
import { trackEvent } from '@/lib/analytics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InspirationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertToResource?: (data: ResourceInitData) => void;
}

export function InspirationDrawer({ open, onOpenChange, onConvertToResource }: InspirationDrawerProps) {
  const { user } = useAuth();
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 表单状态
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 语音识别状态
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  
  // 删除确认
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConverted, setShowConverted] = useState(false);

  // 初始化语音识别
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsRecognitionSupported(true);
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'zh-CN';

        recognitionInstance.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setContent(prev => prev + (prev ? ' ' : '') + finalTranscript);
          }
        };

        recognitionInstance.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          
          if (event.error === 'not-allowed') {
            toast.error('请允许麦克风权限以使用语音输入');
          } else if (event.error === 'no-speech') {
            toast.error('未检测到语音');
          } else {
            toast.error('语音识别失败，请重试');
          }
        };

        recognitionInstance.onend = () => {
          setIsRecording(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  // 加载灵感列表
  const loadInspirations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('inspirations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (!error && data) {
      setInspirations(data as Inspiration[]);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadInspirations();
      trackEvent('inspiration_drawer_open');
    }
  }, [open, loadInspirations]);

  // 切换语音录制
  const toggleRecording = () => {
    if (!recognition) {
      toast.error('您的浏览器不支持语音识别');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      trackEvent('voice_recording_stop');
    } else {
      recognition.start();
      setIsRecording(true);
      trackEvent('voice_recording_start');
      toast.success('开始语音输入...');
    }
  };

  // 保存灵感
  const handleSave = async () => {
    if (!user || !content.trim()) {
      toast.error('请输入灵感内容');
      return;
    }

    const inspirationData = {
      user_id: user.id,
      content: content.trim(),
      location: location.trim() || null,
    };

    if (editingId) {
      // 更新
      const { error } = await supabase
        .from('inspirations')
        .update(inspirationData)
        .eq('id', editingId);

      if (error) {
        toast.error('更新失败');
      } else {
        toast.success('灵感已更新');
        trackEvent('inspiration_update', { id: editingId });
      }
    } else {
      // 新增
      const { error } = await supabase
        .from('inspirations')
        .insert(inspirationData);

      if (error) {
        toast.error('保存失败');
      } else {
        toast.success('灵感已保存');
        trackEvent('inspiration_create');
      }
    }

    resetForm();
    loadInspirations();
  };

  // 编辑灵感
  const handleEdit = (inspiration: Inspiration) => {
    setContent(inspiration.content);
    setLocation(inspiration.location || '');
    setEditingId(inspiration.id);
    trackEvent('inspiration_edit_start', { id: inspiration.id });
  };

  // 删除灵感
  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('inspirations')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('灵感已删除');
      trackEvent('inspiration_delete', { id: deleteId });
      loadInspirations();
    }

    setShowDeleteDialog(false);
    setDeleteId(null);
  };

  const handleConvertToResource = async (inspiration: Inspiration) => {
    if (!onConvertToResource) return;

    try {
      // 标记灵感为已转换
      const { error } = await supabase
        .from('inspirations')
        .update({ status: 'converted' })
        .eq('id', inspiration.id);

      if (error) throw error;

      // 通知父组件打开资源对话框
      onConvertToResource({
        name: inspiration.content.substring(0, 100),
        notes: inspiration.content,
        location: inspiration.location,
        inspirationId: inspiration.id
      });

      toast.success('已转为资源，请继续完善信息');
      loadInspirations();
      trackEvent('inspiration_convert', { id: inspiration.id });
    } catch (error) {
      console.error('Convert error:', error);
      toast.error('转换失败');
    }
  };

  // 重置表单
  const resetForm = () => {
    setContent('');
    setLocation('');
    setEditingId(null);
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-full p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              灵感记录
            </SheetTitle>
            <SheetDescription>
              记录你的想法和灵感，支持语音输入
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 输入区域 */}
            <div className="p-6 border-b space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">灵感内容 *</Label>
                  {isRecognitionSupported && (
                    <Button
                      type="button"
                      variant={isRecording ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={toggleRecording}
                      className="flex items-center gap-2"
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-4 w-4" />
                          停止录音
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          语音输入
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Textarea
                  id="content"
                  placeholder="输入你的灵感... (也可使用语音输入)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className={isRecording ? 'border-red-500 animate-pulse' : ''}
                />
                {isRecording && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    正在录音...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  位置（可选）
                </Label>
                <Input
                  id="location"
                  placeholder="记录灵感的地点"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? '更新' : '保存'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                )}
              </div>
            </div>

            {/* 灵感列表 */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  我的灵感 ({inspirations.filter(i => showConverted ? true : i.status === 'active').length})
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    id="show-converted"
                    checked={showConverted}
                    onChange={(e) => setShowConverted(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="show-converted" className="cursor-pointer select-none">
                    显示已转换
                  </label>
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : inspirations.filter(i => showConverted ? true : i.status === 'active').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">暂无灵感记录</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      点击上方开始记录你的想法
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inspirations
                      .filter(i => showConverted ? true : i.status === 'active')
                      .map((inspiration) => (
                      <div
                        key={inspiration.id}
                        className={`p-4 bg-card border rounded-lg hover:shadow-md transition-all ${
                          inspiration.status === 'converted' ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' : ''
                        }`}
                      >
                        {inspiration.status === 'converted' && (
                          <Badge className="mb-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100">
                            <Check className="h-3 w-3 mr-1" />
                            已转换为资源
                          </Badge>
                        )}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm flex-1 whitespace-pre-wrap">
                            {inspiration.content}
                          </p>
                          <div className="flex gap-1 shrink-0">
                            {inspiration.status === 'active' && onConvertToResource && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => handleConvertToResource(inspiration)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                转资源
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(inspiration)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                setDeleteId(inspiration.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {inspiration.location && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {inspiration.location}
                            </Badge>
                          )}
                          <span>
                            {new Date(inspiration.created_at).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条灵感记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
