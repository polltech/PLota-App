import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { dbService } from '../services/database';
import { syncService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    _bootstrap();
  }, []);

  const _bootstrap = async () => {
    try {
      await dbService.init();
      setDbReady(true);
      syncService.startAutoSync().catch((e) => console.warn('Auto-sync start failed:', e));

      const storedToken = await SecureStore.getItemAsync('access_token');
      const storedUser = await SecureStore.getItemAsync('user_data');

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Auth bootstrap error:', e);
    } finally {
      setAuthReady(true);
    }
  };

  const register = async (data) => {
    const { authAPI } = require('../services/api');
    try {
      await authAPI.register(data);
      // Auto-login after successful registration
      return await login(data.email, data.password);
    } catch (e) {
      const detail = e.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : e.message || 'Registration failed';
      return { success: false, error: msg };
    }
  };

  const login = async (identifier, password) => {
    const { authAPI } = require('../services/api');

    let isOnline = false;
    try {
      const net = await Network.getNetworkStateAsync();
      isOnline = !!net.isConnected && net.isInternetReachable !== false;
    } catch (_) {}

    if (isOnline) {
      // ── Online login ───────────────────────────────────────────────────────
      try {
        const res = await authAPI.login(identifier, password);
        const { access_token } = res.data;
        await SecureStore.setItemAsync('access_token', access_token);

        const meRes = await authAPI.me();
        const userData = meRes.data;
        await SecureStore.setItemAsync('user_data', JSON.stringify(userData));

        // Cache credentials for offline use (SecureStore is hardware-encrypted)
        await SecureStore.setItemAsync('offline_id', identifier.trim().toLowerCase());
        await SecureStore.setItemAsync('offline_pwd', password);

        setUser(userData);
        return { success: true };
      } catch (e) {
        const detail = e.response?.data?.detail;
        const msg = typeof detail === 'string' ? detail : e.message || 'Login failed';
        return { success: false, error: msg };
      }
    } else {
      // ── Offline login using cached credentials ─────────────────────────────
      try {
        const cachedId  = await SecureStore.getItemAsync('offline_id');
        const cachedPwd = await SecureStore.getItemAsync('offline_pwd');
        const cachedUser = await SecureStore.getItemAsync('user_data');

        if (!cachedId || !cachedPwd || !cachedUser) {
          return {
            success: false,
            error: 'No offline credentials saved. Connect to the internet and log in once first.',
          };
        }

        if (cachedId !== identifier.trim().toLowerCase() || cachedPwd !== password) {
          return { success: false, error: 'Incorrect credentials.' };
        }

        setUser(JSON.parse(cachedUser));
        return { success: true, offline: true };
      } catch (e) {
        return { success: false, error: 'Offline login failed. Please try again.' };
      }
    }
  };

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user_data');
    } catch (_) {}
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const { authAPI } = require('../services/api');
    try {
      const res = await authAPI.refresh();
      const { access_token } = res.data;
      await SecureStore.setItemAsync('access_token', access_token);
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, dbReady, authReady, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
