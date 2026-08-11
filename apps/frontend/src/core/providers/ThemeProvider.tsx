import React from 'react';

// Basic theme setup to be expanded with Zustand or Context later
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="theme-dark">
      {children}
    </div>
  );
};
