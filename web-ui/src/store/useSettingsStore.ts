import { create } from 'zustand'
import type {
  UserSettings,
  UserIntegration,
  TeamMember,
  NotificationSettings,
} from '@/types'
import * as settingsApi from '@/api/settings'

interface SettingsState {
  settings: UserSettings | null
  integrations: UserIntegration[]
  teamMembers: TeamMember[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  updateNotifications: (notifications: NotificationSettings) => Promise<void>
  fetchIntegrations: () => Promise<void>
  toggleIntegration: (platform: string, isConnected: boolean) => Promise<void>
  fetchTeamMembers: () => Promise<void>
  addTeamMember: (member: Omit<TeamMember, 'id' | 'status' | 'invitedAt' | 'joinedAt'>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>
  removeTeamMember: (id: string) => Promise<void>
  clearError: () => void
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  integrations: [],
  teamMembers: [],
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await settingsApi.getSettings()
      set({ settings, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await settingsApi.updateSettings({
        displayName: updates.displayName,
        email: updates.email,
        phone: updates.phone,
        region: updates.region,
        avatarUrl: updates.avatarUrl,
        notifications: updates.notifications,
        security: updates.security,
      })
      set({ settings: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  updateNotifications: async (notifications) => {
    const { settings } = get()
    if (!settings) return

    set({ isLoading: true, error: null })
    try {
      const updated = await settingsApi.updateSettings({ notifications })
      set({ settings: updated, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchIntegrations: async () => {
    set({ isLoading: true, error: null })
    try {
      const integrations = await settingsApi.getIntegrations()
      set({ integrations, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  toggleIntegration: async (platform, isConnected) => {
    set({ isLoading: true, error: null })
    try {
      await settingsApi.updateIntegration(platform, { isConnected })
      const integrations = await settingsApi.getIntegrations()
      set({ integrations, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchTeamMembers: async () => {
    set({ isLoading: true, error: null })
    try {
      const members = await settingsApi.getTeamMembers()
      set({ teamMembers: members, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  addTeamMember: async (member) => {
    set({ isLoading: true, error: null })
    try {
      await settingsApi.addTeamMember({
        name: member.name,
        email: member.email,
        role: member.role,
        avatar: member.avatar,
      })
      const members = await settingsApi.getTeamMembers()
      set({ teamMembers: members, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  uploadAvatar: async (file) => {
    set({ isLoading: true, error: null })
    try {
      const { avatarUrl } = await settingsApi.uploadAvatar(file)
      // Refresh settings to get updated avatar URL
      const settings = await settingsApi.getSettings()
      set({ settings, isLoading: false })
      return avatarUrl
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  updateTeamMember: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      await settingsApi.updateTeamMember(id, updates)
      const members = await settingsApi.getTeamMembers()
      set({ teamMembers: members, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  removeTeamMember: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await settingsApi.deleteTeamMember(id)
      const members = await settingsApi.getTeamMembers()
      set({ teamMembers: members, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
