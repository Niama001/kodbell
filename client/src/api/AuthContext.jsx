import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('mm_user');
    return stored ? JSON.parse(stored) : null;
  });

  function login(user, token) {
    localStorage.setItem('mm_token', token);
    localStorage.setItem('mm_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
