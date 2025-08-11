// src/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');

  if (!user?.userid) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
