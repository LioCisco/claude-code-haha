import type {
  UserSettings,
  UserIntegration,
  TeamMember,
  NotificationSettings,
  SecuritySettings,
  SubscriptionInfo,
} from '@/types'

// Get user settings
export async function getSettings(): Promise<UserSettings> {
  const res = await fetch('/api/settings')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch settings')
  }
  return data.settings
}

// Update user settings
export async function updateSettings(settings: {
  displayName?: string
  email?: string
  phone?: string
  region?: string
  avatarUrl?: string
  notifications?: NotificationSettings
  security?: SecuritySettings
}): Promise<UserSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to update settings')
  }
  return data.settings
}

// Get user integrations
export async function getIntegrations(): Promise<UserIntegration[]> {
  const res = await fetch('/api/settings/integrations')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch integrations')
  }
  return data.integrations
}

// Update integration
export async function updateIntegration(
  platform: string,
  updates: {
    isConnected: boolean
    accessToken?: string
    refreshToken?: string
    storeUrl?: string
    storeName?: string
    metadata?: Record<string, unknown>
  }
): Promise<UserIntegration> {
  const res = await fetch(`/api/settings/integrations/${platform}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to update integration')
  }
  return data.integration
}

// Get team members
export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/settings/team')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch team members')
  }
  return data.members
}

// Add team member
export async function addTeamMember(member: {
  name: string
  email: string
  role: 'admin' | 'member'
  avatar?: string
}): Promise<string> {
  const res = await fetch('/api/settings/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to add team member')
  }
  return data.memberId
}

// Update team member
export async function updateTeamMember(
  id: string,
  updates: {
    name?: string
    role?: 'admin' | 'member'
    status?: 'active' | 'pending' | 'inactive'
  }
): Promise<void> {
  const res = await fetch(`/api/settings/team/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to update team member')
  }
}

// Delete team member
export async function deleteTeamMember(id: string): Promise<void> {
  const res = await fetch(`/api/settings/team/${id}`, {
    method: 'DELETE',
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to delete team member')
  }
}

// Use tokens
export async function useTokens(tokens: number): Promise<void> {
  const res = await fetch('/api/settings/tokens/use', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens }),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to update token usage')
  }
}
