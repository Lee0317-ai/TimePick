import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Profile as ProfileType } from '@/types';
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

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [resourceCount, setResourceCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data as ProfileType);
    }
  }, [user]);

  const loadResourceStats = useCallback(async () => {
    if (!user) return;

    const { count } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setResourceCount(count || 0);
  }, [user]);

  useEffect(() => {
    document.title = '个人中心 - 拾光';
    trackEvent('profile_page_expose');
    loadProfile();
    loadResourceStats();
  }, [user, loadProfile, loadResourceStats]);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 6) {
      toast.error('密码至少需要6位');
      return false;
    }
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    if (!hasLetter || !hasNumber) {
      toast.error('密码必须同时包含字母和数字');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('两次密码不一致');
      return;
    }

    setIsLoading(true);

    // 验证旧密码
    const email = `${profile?.username}@shiguang.local`;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    });

    if (signInError) {
      setIsLoading(false);
      toast.error('旧密码错误');
      return;
    }

    // 更新密码
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      toast.error('密码修改失败');
    } else {
      toast.success('密码修改成功');
      setShowPasswordDialog(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);

  const handleSignOut = async () => {
    trackEvent('profile_logout_click');
    await signOut();
    toast.success('已退出登录');
    navigate('/login');
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.success('缓存已清除');
    navigate('/login');
  };

  const storagePercent = profile ? (profile.storage_used / profile.storage_limit) * 100 : 0;
  const storageUsedMB = profile ? (profile.storage_used / 1024 / 1024).toFixed(2) : 0;
  const storageLimitMB = profile ? (profile.storage_limit / 1024 / 1024).toFixed(0) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">个人中心</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>昵称</Label>
              <div className="text-lg font-medium">{profile?.nickname}</div>
            </div>
            <div>
              <Label>账号ID</Label>
              <div className="text-sm text-muted-foreground">{profile?.username}</div>
            </div>
            <div>
              <Label>注册时间</Label>
              <div className="text-sm text-muted-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleString('zh-CN') : '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使用统计 */}
        <Card>
          <CardHeader>
            <CardTitle>使用统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>已录入资源数</Label>
              <div className="text-2xl font-bold">{resourceCount}</div>
            </div>
            <div>
              <Label>占用空间</Label>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{storageUsedMB} MB</span>
                  <span>{storageLimitMB} MB</span>
                </div>
                <Progress value={storagePercent} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 账户操作 */}
        <Card>
          <CardHeader>
            <CardTitle>账户操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(true);
                trackEvent('profile_pwd_click');
              }}
            >
              修改密码
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowClearCacheDialog(true)}
            >
              清除本地缓存
            </Button>
            <Button
              className="w-full"
              variant="destructive"
              onClick={() => setShowSignOutDialog(true)}
            >
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 修改密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">旧密码</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="至少6位，需含字母+数字"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              取消
            </Button>
            <Button onClick={handleChangePassword} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 退出登录确认对话框 */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录</AlertDialogTitle>
            <AlertDialogDescription>
              确定要退出登录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清除缓存确认对话框 */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清除缓存</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清除本地缓存吗？这将清除所有本地存储的数据并重新登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
