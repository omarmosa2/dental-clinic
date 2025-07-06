import React from 'react'
import ReactDOM from 'react-dom/client'
import AppDemo from './AppDemo'
import './styles/globals.css'

console.log('🚀 Starting Dental Clinic Demo App...')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppDemo />
  </React.StrictMode>,
)

console.log('✅ Demo App initialized successfully')
