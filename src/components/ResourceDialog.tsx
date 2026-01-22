import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Section, Module, Resource } from '@/types';
import { trackEvent } from '@/lib/analytics';

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editResource?: Resource;
  initialSectionId?: string;
  initialModuleId?: string;
}

export function ResourceDialog({ open, onOpenChange, onSuccess, editResource, initialSectionId, initialModuleId }: ResourceDialogProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedModule, setSelectedModule] = useState('none');
  const [resourceName, setResourceName] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedImageUrl, setRecognizedImageUrl] = useState('');

  const loadModules = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('modules')
      .select(`
        *,
        module_sections(section_id)
      `)
      .eq('user_id', user.id)
      .order('sort_order');

    if (data) {
      setModules(data as Module[]);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadSections();
      loadModules();
      
      if (editResource) {
        setSelectedSection(editResource.section_id);
        setSelectedModule(editResource.module_id || 'none');
        setResourceName(editResource.name);
        setUrl(editResource.url || '');
        setContent(editResource.content || '');
        setNotes(editResource.notes || '');
      } else {
        trackEvent('resource_add_expose');
        if (initialSectionId) setSelectedSection(initialSectionId);
        if (initialModuleId) setSelectedModule(initialModuleId);
      }
    } else {
      resetForm();
    }
  }, [open, editResource, loadModules, initialSectionId, initialModuleId]);

  useEffect(() => {
    if (selectedSection) {
      const filtered = modules.filter(m =>
        m.module_sections?.some((ms) => ms.section_id === selectedSection)
      );
      setFilteredModules(filtered);
    } else {
      setFilteredModules([]);
    }
  }, [selectedSection, modules]);

  const resetForm = () => {
    setSelectedSection('');
    setSelectedModule('none');
    setResourceName('');
    setUrl('');
    setContent('');
    setNotes('');
    setFiles([]);
    setRecognizedImageUrl('');
  };

  // 自动识别网址
  const handleAutoRecognize = async () => {
    if (!url || !url.trim()) {
      toast.error('请先输入网址');
      return;
    }

    setIsRecognizing(true);
    trackEvent('auto_recognize_click', { url });

    try {
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnltaXNqZnZpb3lheWx6a2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Nzc1MTQsImV4cCI6MjA4MzI1MzUxNH0.OIhpRNX9rbWWMqV_l0CSX4QTEbxqZYFjPafigjlB1es';

      const response = await fetch(
        'https://glfymisjfvioyaylzkdj.supabase.co/functions/v1/auto-recognize',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: url.trim() })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '识别服务请求失败');
      }

      const data = await response.json();

      console.log('Recognition response:', data);

      // 更新表单数据
      if (data.title) {
        setResourceName(data.title);
      }
      if (data.content) {
        setContent(data.content);
      }
      if (data.img) {
        setRecognizedImageUrl(data.img);
      }

      toast.success('识别成功！');
      trackEvent('auto_recognize_success', { url });
    } catch (error: unknown) {
      console.error('Auto recognize error:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error('识别失败，请重试');
      trackEvent('auto_recognize_fail', { url, error: errorMessage });
    } finally {
      setIsRecognizing(false);
    }
  };

  const loadSections = async () => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .order('sort_order');

    if (data) {
      setSections(data as Section[]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // 检查文件大小 (50MB)
      const validFiles = newFiles.filter(file => {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`文件 ${file.name} 超过 50MB 限制`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setFiles(validFiles);
      
      // 自动提取文件名
      if (!resourceName && validFiles.length > 0) {
        const fileName = validFiles[0].name;
        setResourceName(fileName.substring(0, fileName.lastIndexOf('.')) || fileName);
      }

      // 自动判断板块类型
      if (!selectedSection && validFiles.length > 0) {
        const file = validFiles[0];
        const fileType = file.type;
        
        let sectionType = '';
        if (fileType.startsWith('image/')) {
          sectionType = 'image';
        } else if (fileType.startsWith('video/')) {
          sectionType = 'video';
        } else {
          sectionType = 'document';
        }
        
        const section = sections.find(s => s.type === sectionType);
        if (section) {
          setSelectedSection(section.id);
        }
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!user || files.length === 0) return [];

    const urls: string[] = [];

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(fileName, file, {
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`文件 ${file.name} 上传失败: ${uploadError.message}`);
          continue;
        }

        const { data } = supabase.storage
          .from('resources')
          .getPublicUrl(fileName);

        // 确保 URL 包含 public 路径
        let publicUrl = data.publicUrl;
        if (publicUrl.includes('/storage/v1/object/') && !publicUrl.includes('/storage/v1/object/public/')) {
          publicUrl = publicUrl.replace('/storage/v1/object/', '/storage/v1/object/public/');
        }

        urls.push(publicUrl);
      } catch (err) {
        console.error('Unexpected upload error:', err);
        toast.error(`文件 ${file.name} 上传发生意外错误`);
      }
    }

    return urls;
  };

  const handleSubmit = async () => {
    if (!user) return;

    trackEvent('add_save_click');

    if (!resourceName.trim()) {
      toast.error('请输入资源名称');
      return;
    }

    if (!selectedSection) {
      toast.error('请选择所属板块');
      return;
    }

    setIsLoading(true);

    try {
      // 上传文件
      const uploadedUrls = await uploadFiles();
      
      // 处理识别的图片
      let thumbnailUrl = '';
      if (recognizedImageUrl) {
        try {
          // 下载图片
          const imageResponse = await fetch(recognizedImageUrl);
          const imageBlob = await imageResponse.blob();
          
          // 生成唯一文件名
          const fileName = `recognized_${Date.now()}.jpg`;
          const filePath = `${user.id}/${fileName}`;
          
          // 上传到 Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('resources')
            .upload(filePath, imageBlob, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('resources')
              .getPublicUrl(filePath);
            
            thumbnailUrl = publicUrl;
          }
        } catch (error) {
          console.error('Failed to upload recognized image:', error);
        }
      }
      
      // 确定最终的 URL
      let finalUrl = url;
      if (uploadedUrls.length > 0) {
        finalUrl = uploadedUrls[0];
      }

      // 确定板块（如果用户没有手动选择，则根据内容自动判断）
      let finalSectionId = selectedSection;
      if (!finalSectionId && finalUrl) {
        // 根据 URL 判断类型
        if (finalUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const imageSection = sections.find(s => s.type === 'image');
          finalSectionId = imageSection?.id || selectedSection;
        } else if (finalUrl.match(/\.(mp4|avi|mov|wmv)$/i)) {
          const videoSection = sections.find(s => s.type === 'video');
          finalSectionId = videoSection?.id || selectedSection;
        }
      }

      const resourceData = {
        user_id: user.id,
        section_id: finalSectionId,
        module_id: selectedModule && selectedModule !== 'none' ? selectedModule : null,
        name: resourceName.trim(),
        url: finalUrl,
        content,
        notes,
        file_size: files.length > 0 ? files[0].size : 0,
        ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
      };

      if (editResource) {
        // 更新
        const { error } = await supabase
          .from('resources')
          .update(resourceData)
          .eq('id', editResource.id);

        if (error) throw error;
        toast.success('资源更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('resources')
          .insert(resourceData);

        if (error) throw error;
        toast.success('资源录入成功');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editResource ? '编辑资源' : '录入资源'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section">所属板块 *</Label>
            <Select value={selectedSection} onValueChange={(val) => {
              setSelectedSection(val);
              trackEvent('add_plate_select', { sectionId: val });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="选择板块" />
              </SelectTrigger>
              <SelectContent>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module">所属模块（可选）</Label>
            <Select value={selectedModule} onValueChange={(val) => {
              setSelectedModule(val);
              trackEvent('add_module_select', { moduleId: val });
            }} disabled={!selectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="选择模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                {filteredModules.map(module => (
                  <SelectItem key={module.id} value={module.id}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">资源名称 *</Label>
            <Input
              id="name"
              placeholder="留空则自动提取"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">资源信息（网址或内容）</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="输入网址或资源链接"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              {url && url.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoRecognize}
                  disabled={isRecognizing}
                  className="shrink-0"
                >
                  {isRecognizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      识别中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      自动识别
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">内容描述</Label>
            <Textarea
              id="content"
              placeholder="输入文本段落或描述"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>

          {!editResource && (
            <div className="space-y-2">
              <Label htmlFor="files">上传文件</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="files" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    点击或拖拽文件到这里
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支持文档、图片、视频等多种格式
                  </p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              placeholder="添加备注信息"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editResource ? '保存' : '录入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
