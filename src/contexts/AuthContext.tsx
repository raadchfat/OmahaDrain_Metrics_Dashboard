import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('omahadrainuser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo credentials
    if (email === 'admin@omahadrain.com' && password === 'admin123') {
      const userData: User = {
        id: '1',
        email: 'admin@omahadrain.com',
        name: 'Admin User',
        role: 'admin'
      };
      setUser(userData);
      localStorage.setItem('omahadrainuser', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    }
    
    if (email === 'manager@omahadrain.com' && password === 'manager123') {
      const userData: User = {
        id: '2',
        email: 'manager@omahadrain.com',
        name: 'Manager User',
        role: 'manager'
      };
      setUser(userData);
      localStorage.setItem('omahadrainuser', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('omahadrainuser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};