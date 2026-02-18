import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from './app/router';
import { I18nProvider } from './i18n';
import { tx } from './i18n/tx';
import './index.css';
function applyRedirectedPathFrom404() {
    const redirectedPath = new URLSearchParams(window.location.search).get('p');
    if (!redirectedPath) {
        return;
    }
    try {
        const targetUrl = new URL(redirectedPath, window.location.origin);
        if (targetUrl.origin !== window.location.origin) {
            return;
        }
        const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
        window.history.replaceState(null, '', nextPath);
    }
    catch {
        // Ignore malformed redirect payloads.
    }
}
applyRedirectedPathFrom404();
globalThis.__tx = tx;
const router = createAppRouter();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
            // Ignore SW registration failures to avoid blocking app bootstrap.
        });
    });
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <I18nProvider>
      <RouterProvider router={router}/>
    </I18nProvider>
  </React.StrictMode>);
