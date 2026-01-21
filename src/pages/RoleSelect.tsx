import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Search, FolderOpen } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'collector' | 'searcher' | null>(null);

  useEffect(() => {
    trackEvent('role_select_expose');
  }, []);

  const handleRoleSelect = async (role: 'collector' | 'searcher') => {
    if (!user) return;

    trackEvent('role_select_click', { role });
    setIsLoading(true);
    setSelectedRole(role);

    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role });

    setIsLoading(false);

    if (error) {
      toast.error('角色设置失败');
      setSelectedRole(null);
      return;
    }

    localStorage.setItem('userRole', role);
    toast.success('角色设置成功');
    navigate('/home');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-8">选择您的角色</h1>
        <div className="grid md:grid-cols-2 gap-8">
          {/* 收集者 */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2"
            onClick={() => !isLoading && handleRoleSelect('collector')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">收集者</CardTitle>
              <CardDescription>
                整理和管理您的资源
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 录入各类资源（网页、文档、图片、视频）</p>
              <p>• 创建和管理模块分类</p>
              <p>• 添加备注和心得</p>
              <p>• 构建个人知识库</p>
              <Button
                className="w-full mt-4"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelect('collector');
                }}
              >
                {isLoading && selectedRole === 'collector' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                选择收集者
              </Button>
            </CardContent>
          </Card>

          {/* 查询者 */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2"
            onClick={() => !isLoading && handleRoleSelect('searcher')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">查询者</CardTitle>
              <CardDescription>
                快速查找和浏览资源
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 全局搜索所有资源</p>
              <p>• 按板块和模块浏览</p>
              <p>• 多维度查询切换</p>
              <p>• 快速定位内容</p>
              <Button
                className="w-full mt-4"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelect('searcher');
                }}
              >
                {isLoading && selectedRole === 'searcher' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                选择查询者
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
