import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from './context/ToastContext.jsx'
import { LoaderProvider } from './context/LoaderContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <LoaderProvider>
        <App />
      </LoaderProvider>
    </ToastProvider>
  </React.StrictMode>,
)

