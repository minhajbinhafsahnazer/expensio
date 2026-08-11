import React from 'react';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // To be integrated with Zustand session store
  return <>{children}</>;
};
