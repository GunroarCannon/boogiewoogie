import { h, render } from 'preact';
import { App } from './app.jsx';
import './styles/paper.css';

// Register Service Worker for PWA offline shell if in production
if ('serviceWorker' in navigator && !window.location.hostname.includes('localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.update().catch(() => {});
    }).catch(() => {});
  });
}

render(<App />, document.getElementById('app'));
