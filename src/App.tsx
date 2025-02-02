import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/Login'
import { AccountHome } from './pages/AccountHome'
import { TicketCreate } from './pages/TicketCreate'
import { EndUserPage } from './pages/EndUserPage'
import { AgentWorkspace } from './pages/AgentWorkspace'
import { AdminPage } from './pages/AdminPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tickets/new" element={<TicketCreate />} />
        <Route path="/user" element={<EndUserPage />} />
        <Route path="/agent/*" element={<AgentWorkspace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<AccountHome />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
