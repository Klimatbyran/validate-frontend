import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '@/contexts/I18nContext';
import { getPipelineTarget, getUnearthTarget } from '@/config/api-env';

// Dev: show active API targets in console
if (import.meta.env.DEV) {
  console.log("[validate] unearth target:", getUnearthTarget(), "| pipeline target:", getPipelineTarget());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
