import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerGsap } from './gsap/registerGsap';
import './styles/global.css';

// Single GSAP registration point, called once at app entry (ARCHITECTURE.md §7)
// before any component mounts.
registerGsap();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
