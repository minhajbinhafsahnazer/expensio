import React from 'react';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  // To be integrated with a lightweight toast library (e.g. sonner or react-hot-toast)
  return (
    <>
      {children}
      <div id="toast-container" className="fixed bottom-0 right-0 p-4 z-50"></div>
    </>
  );
};
