import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '../api/client';
import { saveToken, getToken, saveUser, getUser, clearAll } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading,     setLoading]     = useState(true); // true while restoring session

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const cached = await getUser();
          if (cached) {
            setUser(cached.user);
            setPermissions(cached.permissions || []);
          }
          // Verify token is still valid
          const { data } = await authAPI.me();
          setUser(data.user);
          setPermissions(data.permissions || []);
          await saveUser(data);
        }
      } catch {
        await clearAll();
        setUser(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const { data } = await authAPI.login(email, password);
    await saveToken(data.token);
    await saveUser({ user: data.user, permissions: data.permissions });
    setUser(data.user);
    setPermissions(data.permissions || []);
    return data;
  }

  async function logout() {
    await clearAll();
    setUser(null);
    setPermissions([]);
  }

  function hasPermission(module, action) {
    return permissions.includes(`${module}:${action}`);
  }

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
