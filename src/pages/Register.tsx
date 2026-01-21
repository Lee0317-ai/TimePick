import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export default function Register() {
  const navigate = useNavigate();
  const { signUp, checkUsernameExists, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    document.title = '注册 - 拾光';
    trackEvent('register_page_expose');
    // 如果已登录，跳转到首页
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 6) {
      setPasswordError('密码至少需要6位');
      return false;
    }
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    if (!hasLetter || !hasNumber) {
      setPasswordError('密码必须同时包含字母和数字');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleUsernameBlur = async () => {
    if (!username) {
      setUsernameError('');
      return;
    }
    const exists = await checkUsernameExists(username);
    if (exists) {
      setUsernameError('账号已存在');
    } else {
      setUsernameError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value) {
      validatePassword(value);
    } else {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (value && value !== password) {
      setConfirmPasswordError('两次密码不一致');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('register_btn_click');

    // 最终校验
    if (!validatePassword(password)) {
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('两次密码不一致');
      return;
    }

    const exists = await checkUsernameExists(username);
    if (exists) {
      setUsernameError('账号已存在');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(username, password, nickname);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || '注册失败');
    } else {
      toast.success('注册成功！');
      navigate('/login', { state: { username } });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">拾光</CardTitle>
          <CardDescription className="text-center">
            注册新账号
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">账号 *</Label>
              <Input
                id="username"
                placeholder="请输入账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={handleUsernameBlur}
                required
              />
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6位，需含字母+数字"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                required
              />
              {confirmPasswordError && (
                <p className="text-sm text-destructive">{confirmPasswordError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称（选填）</Label>
              <Input
                id="nickname"
                placeholder="留空则默认使用账号"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !!usernameError || !!passwordError || !!confirmPasswordError}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              注册
            </Button>
            <div className="text-center text-sm">
              已有账号？{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/login')}
              >
                立即登录
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
