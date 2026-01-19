import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (username: string, password: string, nickname?: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkUsernameExists: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    
    return !!data && !error;
  };

  const signUp = async (username: string, password: string, nickname?: string) => {
    // 检查用户名是否存在
    const exists = await checkUsernameExists(username);
    if (exists) {
      return { error: new Error('账号已存在') };
    }

    const email = `${username}@shiguang.local`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          nickname: nickname || username,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    return { error: error || null };
  };

  const signIn = async (username: string, password: string) => {
    const email = `${username}@shiguang.local`;
    
    // 先检查账号是否存在
    const exists = await checkUsernameExists(username);
    if (!exists) {
      return { error: new Error('账号或密码错误') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: new Error('账号或密码错误') };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, checkUsernameExists }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
