import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ModuleDialog({ open, onOpenChange, onSuccess }: ModuleDialogProps) {
  const { user } = useAuth();
  const [moduleName, setModuleName] = useState('');
  const [syncToAll, setSyncToAll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!open) {
      setModuleName('');
      setSyncToAll(true);
      setNameError('');
    }
  }, [open]);

  const checkModuleExists = async (name: string): Promise<boolean> => {
    if (!user) return false;

    const { data } = await supabase
      .from('modules')
      .select('name')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle();

    return !!data;
  };

  const handleNameBlur = async () => {
    if (!moduleName.trim()) {
      setNameError('');
      return;
    }

    const exists = await checkModuleExists(moduleName.trim());
    if (exists) {
      setNameError('模块名称已存在');
    } else {
      setNameError('');
    }
  };

  const handleSubmit = async () => {
    if (!user || !moduleName.trim()) {
      toast.error('请输入模块名称');
      return;
    }

    const exists = await checkModuleExists(moduleName.trim());
    if (exists) {
      setNameError('模块名称已存在');
      return;
    }

    setIsLoading(true);

    // 创建模块
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .insert({
        user_id: user.id,
        name: moduleName.trim(),
      })
      .select()
      .single();

    if (moduleError || !module) {
      setIsLoading(false);
      toast.error('创建模块失败');
      return;
    }

    // 如果勾选同步到所有板块
    if (syncToAll) {
      const { data: sections } = await supabase
        .from('sections')
        .select('id');

      if (sections) {
        const moduleSections = sections.map(section => ({
          module_id: module.id,
          section_id: section.id,
        }));

        await supabase
          .from('module_sections')
          .insert(moduleSections);
      }
    }

    setIsLoading(false);
    toast.success('模块创建成功');
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增模块</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moduleName">模块名称 *</Label>
            <Input
              id="moduleName"
              placeholder="请输入模块名称"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onBlur={handleNameBlur}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="syncToAll"
              checked={syncToAll}
              onCheckedChange={(checked) => setSyncToAll(checked as boolean)}
            />
            <label
              htmlFor="syncToAll"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              同步创建到其他板块
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            勾选后将在四大板块（网页、文档、图片、视频）中同时创建同名模块
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !!nameError}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
