import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/components.css'
import './styles/utilities.css'

// Registrar Service Worker para notificaciones y offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered:', reg.scope)
    }).catch(err => {
      console.log('SW registration failed:', err)
    })
  })
}

// Monta la SPA React en el nodo raíz definido por index.html.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);