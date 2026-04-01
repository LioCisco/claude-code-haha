import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Agents from './pages/Agents'
import Skills from './pages/Skills'
import StoreBuilder from './pages/StoreBuilder'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'

function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="agents" element={<Agents />} />
        <Route path="skills" element={<Skills />} />
        <Route path="store-builder" element={<StoreBuilder />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
