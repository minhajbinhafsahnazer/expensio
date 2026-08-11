import React from 'react';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { NetworkProvider } from './NetworkProvider';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
};
