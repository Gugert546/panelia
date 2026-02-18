
// Denne filen sin eneste hensikt er å starte appen / nettsiden. Ingenting annet. 

import { createRoot } from 'react-dom/client'
import "react-calendar/dist/Calendar.css";
import './index.css'
import App from '../src/app/App'


createRoot(document.getElementById('root')!).render(
  <App />
)

import "./test-news"; //<-- Midlertidig linje for å teste News-api call
