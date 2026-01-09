import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, UserProfile } from '../api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const response = await api.getProfile();
      setUser(response.data);
    } catch {
      setUser(null);
      api.setToken(null);
    }
  };

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.login(username, password);
    api.setToken(response.token);
    await refreshProfile();
  };

  const register = async (username: string, password: string) => {
    const response = await api.register(username, password);
    api.setToken(response.token);
    await refreshProfile();
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

