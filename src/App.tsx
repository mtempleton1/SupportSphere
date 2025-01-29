import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/Login'
import { AccountHome } from './pages/AccountHome'
import { TicketCreate } from './pages/TicketCreate'
import { AgentWorkspace } from './pages/AgentWorkspace'
import { AdminPage } from './pages/AdminPage'
import { SupportSphereHome } from './pages/SupportSphereHome'
import { GuidePage } from './pages/GuidePage'
import { ToastProvider } from './contexts/ToastContext'
import './App.css'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SupportSphereHome />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/:subdomain">
            <Route index element={<AccountHome />} />
            <Route path="tickets/new" element={<TicketCreate />} />
            <Route path="agent/*" element={<AgentWorkspace />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="guide" element={<GuidePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
