import { createRoot } from 'react-dom/client'
import "react-calendar/dist/Calendar.css";
import './index.css'
import App from './app/App'
import { AuthProvider } from './app/providers/authProvider'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)