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
import ScheduledTasks from './pages/ScheduledTasks'
import TaskExecutionLog from './pages/TaskExecutionLog'
import WorkflowList from './pages/workflow/WorkflowList'
import WorkflowEditor from './pages/workflow/WorkflowEditor'
import Memories from './pages/Memories'
import Plugins from './pages/Plugins'
import PluginMarketplace from './pages/PluginMarketplace'
import PluginMarketplaceDetail from './pages/PluginMarketplaceDetail'
import Login from './pages/Login'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="agents" element={<Agents />} />
        <Route path="skills" element={<Skills />} />
        <Route path="store-builder" element={<StoreBuilder />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="scheduled-tasks" element={<ScheduledTasks />} />
        <Route path="scheduled-tasks/:taskId/log" element={<TaskExecutionLog />} />
        <Route path="workflows" element={<WorkflowList />} />
        <Route path="workflow/:id" element={<WorkflowEditor />} />
        <Route path="memories" element={<Memories />} />
        <Route path="plugins" element={<Plugins />} />
        <Route path="marketplace" element={<PluginMarketplace />} />
        <Route path="marketplace/:id" element={<PluginMarketplaceDetail />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
