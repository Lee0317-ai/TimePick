import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = '登录 - 拾光';
    trackEvent('login_page_expose');
    // 如果已登录，跳转到首页
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  useEffect(() => {
    // 从注册页跳转过来时，自动填充账号
    const state = location.state as { username?: string };
    if (state?.username) {
      setUsername(state.username);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('login_btn_click');
    setIsLoading(true);

    const { error } = await signIn(username, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || '登录失败');
    } else {
      toast.success('登录成功');
      navigate('/role-select');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">拾光</CardTitle>
          <CardDescription className="text-center">
            登录您的账号以继续
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">账号</Label>
              <Input
                id="username"
                placeholder="请输入账号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录
            </Button>
            <div className="text-center text-sm">
              还没有账号？{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/register')}
              >
                立即注册
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
