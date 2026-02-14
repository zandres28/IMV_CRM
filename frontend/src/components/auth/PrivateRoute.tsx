import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthService from '../../services/AuthService';

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const check = async () => {
      const token = AuthService.getAccessToken();
      if (!token) {
        setIsAuth(false);
        setChecking(false);
        return;
      }

      try {
        const API_AUTH = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/me`;
        await axios.get(API_AUTH);
        setIsAuth(true);
      } catch (err) {
        AuthService.logout();
        setIsAuth(false);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, []);

  if (checking) return null;

  if (!isAuth) return <Navigate to="/login" replace />;

  return children;
};

export default PrivateRoute;
