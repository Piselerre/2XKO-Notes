import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { useAppStore } from '@2xko/core';
import App from './App';
import { preloadAppImages } from './utils/preloadAppImages';
import './index.css';

preloadAppImages();
document.documentElement.lang = useAppStore.getState().locale ?? 'en';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
