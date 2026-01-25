import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Folder } from '@/types';

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editFolder?: Folder;
  parentId?: string;
}

export function FolderDialog({ open, onOpenChange, onSuccess, editFolder, parentId }: FolderDialogProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderName, setFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState('');

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
      loadFolders();
      
      if (editFolder) {
        setFolderName(editFolder.name);
        setSelectedParentId(editFolder.parent_id || 'none');
      } else if (parentId) {
        setSelectedParentId(parentId);
      }
    } else {
      resetForm();
    }
  }, [open, editFolder, parentId, loadFolders]);

  const resetForm = () => {
    setFolderName('');
    setSelectedParentId('none');
    setNameError('');
  };

  const checkFolderExists = async (name: string, currentParentId: string | null): Promise<boolean> => {
    if (!user) return false;

    let query = supabase
      .from('folders')
      .select('name')
      .eq('user_id', user.id)
      .eq('name', name);

    // 检查同一父文件夹下的名称冲突
    if (currentParentId) {
      query = query.eq('parent_id', currentParentId);
    } else {
      query = query.is('parent_id', null);
    }

    // 如果是编辑模式，排除当前文件夹
    if (editFolder) {
      query = query.neq('id', editFolder.id);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  };

  const handleNameBlur = async () => {
    if (!folderName.trim()) {
      setNameError('');
      return;
    }

    const parentIdValue = selectedParentId === 'none' ? null : selectedParentId;
    const exists = await checkFolderExists(folderName.trim(), parentIdValue);
    
    if (exists) {
      setNameError('该位置已存在同名文件夹');
    } else {
      setNameError('');
    }
  };

  const handleSubmit = async () => {
    if (!user || !folderName.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }

    const parentIdValue = selectedParentId === 'none' ? null : selectedParentId;
    const exists = await checkFolderExists(folderName.trim(), parentIdValue);
    
    if (exists) {
      setNameError('该位置已存在同名文件夹');
      return;
    }

    // 检查是否形成循环引用
    if (editFolder && parentIdValue) {
      let currentParent = folders.find(f => f.id === parentIdValue);
      while (currentParent) {
        if (currentParent.id === editFolder.id) {
          toast.error('不能将文件夹移动到其子文件夹下');
          return;
        }
        currentParent = folders.find(f => f.id === currentParent!.parent_id);
      }
    }

    setIsLoading(true);

    try {
      const folderData = {
        user_id: user.id,
        name: folderName.trim(),
        parent_id: parentIdValue,
      };

      if (editFolder) {
        // 更新
        const { error } = await supabase
          .from('folders')
          .update(folderData)
          .eq('id', editFolder.id);

        if (error) throw error;
        toast.success('文件夹更新成功');
      } else {
        // 新增
        const { error } = await supabase
          .from('folders')
          .insert(folderData);

        if (error) throw error;
        toast.success('文件夹创建成功');
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

  // 递归构建文件夹树选项（用于显示层级）
  const buildFolderOptions = (
    parentId: string | null = null, 
    prefix: string = ''
  ): JSX.Element[] => {
    const children = folders.filter(f => f.parent_id === parentId);
    const options: JSX.Element[] = [];

    children.forEach(folder => {
      // 编辑时不能选择自己作为父文件夹
      if (editFolder?.id !== folder.id) {
        options.push(
          <SelectItem key={folder.id} value={folder.id}>
            {prefix}{folder.name}
          </SelectItem>
        );
        // 递归添加子文件夹
        options.push(...buildFolderOptions(folder.id, prefix + '　'));
      }
    });

    return options;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editFolder ? '编辑文件夹' : '新建文件夹'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">文件夹名称 *</Label>
            <Input
              id="folderName"
              placeholder="请输入文件夹名称"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onBlur={handleNameBlur}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentFolder">父文件夹（可选）</Label>
            <Select 
              value={selectedParentId} 
              onValueChange={setSelectedParentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择父文件夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">根目录</SelectItem>
                {buildFolderOptions()}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              不选择则创建在根目录
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !!nameError}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editFolder ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
