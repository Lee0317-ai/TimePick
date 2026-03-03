import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, Sparkles, Tag, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Section, Module, Resource, Folder, ResourceInitData } from '@/types';
import { trackEvent } from '@/lib/analytics';

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editResource?: Resource;
  initialFolderId?: string;
  initialData?: ResourceInitData;
}

export function ResourceDialog({ open, onOpenChange, onSuccess, editResource, initialFolderId, initialData }: ResourceDialogProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('none');
  const [resourceName, setResourceName] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedImageUrl, setRecognizedImageUrl] = useState('');
  const [inspirationId, setInspirationId] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order');

    if (data) {
      setFolders(data as Folder[]);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadSections();
      loadFolders();

      if (editResource) {
        setSelectedSection(editResource.section_id);
        setSelectedFolder(editResource.folder_id || 'none');
        setResourceName(editResource.name);
        setUrl(editResource.url || '');
        setContent(editResource.content || '');
        setNotes(editResource.notes || '');
        setTags(editResource.tags || []);
      } else {
        trackEvent('resource_add_expose');
        if (initialFolderId) setSelectedFolder(initialFolderId);
        if (initialData) {
          setResourceName(initialData.name);
          setNotes(initialData.notes || '');
          setInspirationId(initialData.inspirationId || null);
          if (initialData.location) {
            setNotes((prev) => prev + (prev ? '\n\n' : '') + `📍 位置：${initialData.location}`);
          }
        }
      }
    } else {
      resetForm();
    }
  }, [open, editResource, loadFolders, initialFolderId]);

  const resetForm = () => {
    setSelectedSection('');
    setSelectedFolder('none');
    setResourceName('');
    setUrl('');
    setContent('');
    setNotes('');
    setTags([]);
    setTagInput('');
    setFiles([]);
    setRecognizedImageUrl('');
  };

  // 标签管理函数
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) {
      toast.error('标签不能为空');
      return;
    }
    if (tags.includes(trimmedTag)) {
      toast.error('标签已存在');
      return;
    }
    if (tags.length >= 10) {
      toast.error('最多添加10个标签');
      return;
    }
    setTags([...tags, trimmedTag]);
    setTagInput('');
    trackEvent('tag_add', { tag: trimmedTag });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    trackEvent('tag_remove', { tag: tagToRemove });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
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
      // 使用 Supabase Edge Functions 调用
      const { data, error } = await supabase.functions.invoke('auto-recognize', {
        body: { url: url.trim() }
      });

      if (error) {
        throw new Error(error.message || '识别服务请求失败');
      }

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
        } else {
          // 视频上传已隐藏，默认为文档
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

  // 递归构建文件夹树选项
  const buildFolderOptions = (
    parentId: string | null = null, 
    prefix: string = ''
  ): JSX.Element[] => {
    const children = folders.filter(f => f.parent_id === parentId);
    const options: JSX.Element[] = [];

    children.forEach(folder => {
      options.push(
        <SelectItem key={folder.id} value={folder.id}>
          {prefix}{folder.name}
        </SelectItem>
      );
      // 递归添加子文件夹
      options.push(...buildFolderOptions(folder.id, prefix + '　'));
    });

    return options;
  };

  const handleSubmit = async () => {
    if (!user) return;

    trackEvent('add_save_click');

    if (!resourceName.trim()) {
      toast.error('请输入资源名称');
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
        // 根据 URL 判断类型（视频上传已隐藏）
        if (finalUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const imageSection = sections.find(s => s.type === 'image');
          finalSectionId = imageSection?.id || selectedSection;
        }
      }

      const resourceData = {
        user_id: user.id,
        section_id: finalSectionId || null,
        folder_id: selectedFolder && selectedFolder !== 'none' ? selectedFolder : null,
        name: resourceName.trim(),
        url: finalUrl,
        content,
        notes,
        tags: tags.length > 0 ? tags : null,
        source_inspiration_id: inspirationId || null,
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
            <Label htmlFor="folder">所属文件夹（可选）</Label>
            <Select
              value={selectedFolder}
              onValueChange={(val) => {
                setSelectedFolder(val);
                trackEvent('add_folder_select', { folderId: val });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择文件夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                {buildFolderOptions()}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择文件夹后，资源将按文件夹组织
            </p>
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
                    支持文档、图片等多种格式（视频上传功能暂时隐藏）
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
            <Label htmlFor="tags" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              标签
            </Label>
            <div className="space-y-3">
              {/* 标签输入 */}
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="输入标签并按回车"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </div>
              
              {/* 已添加的标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md">
                  {tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="px-3 py-1 flex items-center gap-1 hover:bg-secondary/80"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {tags.length > 0 ? `已添加 ${tags.length}/10 个标签` : '标签可帮助您更好地组织和查找资源'}
              </p>
            </div>
          </div>

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
