import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent libraries from trying to overwrite fetch, which is read-only in some environments
// This avoids "Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      get: () => originalFetch,
      set: () => { 
        console.warn('A library tried to overwrite window.fetch. This attempt was ignored to prevent a TypeError.');
      },
      configurable: true // Allow further redefinition if absolutely necessary, but protect the getter/setter
    });
  } catch (e) {
    // If it's already non-configurable, we can't do much, but the error might still happen
    // if the library tries a simple assignment.
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
