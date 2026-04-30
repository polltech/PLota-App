import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbService } from '../services/database';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    dbService.init().then(() => setDbReady(true));
  }, []);

  return (
    <AuthContext.Provider value={{ dbReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
