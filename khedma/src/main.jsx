import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './i18n/config'
import './index.css'
import './styles/refinements.css'
import './styles/scroll-experience.css'
import './styles/scroll-hero.css'
import './styles/phone-experience.css'
import './styles/desktop-design.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
