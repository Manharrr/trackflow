import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.jsx'

import { GoogleOAuthProvider } from '@react-oauth/google'

createRoot(document.getElementById('root')).render(
  
    <GoogleOAuthProvider
      clientId={
        import.meta.env
          .VITE_GOOGLE_CLIENT_ID
      }
    >
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  
  
)
