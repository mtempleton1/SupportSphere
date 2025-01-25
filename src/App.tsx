import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/Login'
import { AccountHome } from './pages/AccountHome'
import { TicketCreate } from './pages/TicketCreate'
import { EndUserPage } from './pages/EndUserPage'
import { AgentWorkspace } from './pages/AgentWorkspace'
import { AdminPage } from './pages/AdminPage'
import { SupportSphereHome } from './pages/SupportSphereHome'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SupportSphereHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/:subdomain">
          <Route index element={<AccountHome />} />
          <Route path="tickets/new" element={<TicketCreate />} />
          <Route path="user" element={<EndUserPage />} />
          <Route path="agent/*" element={<AgentWorkspace />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
