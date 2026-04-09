import { Elysia, t } from 'elysia'
import {
  getUserSettings,
  updateUserSettings,
  getUserIntegrations,
  updateIntegration,
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  updateTokenUsage,
} from '../db'

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })
  // Get user settings
  .get('/', async ({ query }) => {
    const userId = (query.userId as string) || 'default-user'
    const settings = await getUserSettings(userId)

    if (!settings) {
      return { success: false, message: 'Settings not found' }
    }

    return {
      success: true,
      settings: {
        id: settings.id,
        userId: settings.user_id,
        displayName: settings.display_name,
        email: settings.email,
        phone: settings.phone,
        region: settings.region,
        avatarUrl: settings.avatar_url,
        notifications: {
          email: Boolean(settings.notify_email),
          push: Boolean(settings.notify_push),
          sms: Boolean(settings.notify_sms),
          marketing: Boolean(settings.notify_marketing),
        },
        security: {
          twoFactorEnabled: Boolean(settings.two_factor_enabled),
        },
        subscription: {
          plan: settings.plan,
          tokensLimit: settings.tokens_limit,
          tokensUsed: settings.tokens_used,
          tokensResetAt: settings.tokens_reset_at,
        },
      },
    }
  })

  // Update user settings
  .put('/', async ({ body, query }) => {
    const userId = (query.userId as string) || 'default-user'

    const success = await updateUserSettings(userId, {
      display_name: body.displayName,
      email: body.email,
      phone: body.phone,
      region: body.region,
      avatar_url: body.avatarUrl,
      notify_email: body.notifications?.email,
      notify_push: body.notifications?.push,
      notify_sms: body.notifications?.sms,
      notify_marketing: body.notifications?.marketing,
      two_factor_enabled: body.security?.twoFactorEnabled,
    })

    if (!success) {
      return { success: false, message: 'Failed to update settings' }
    }

    const updated = await getUserSettings(userId)
    if (!updated) {
      return { success: false, message: 'Settings not found after update' }
    }

    return {
      success: true,
      settings: {
        id: updated.id,
        userId: updated.user_id,
        displayName: updated.display_name,
        email: updated.email,
        phone: updated.phone,
        region: updated.region,
        avatarUrl: updated.avatar_url,
        notifications: {
          email: Boolean(updated.notify_email),
          push: Boolean(updated.notify_push),
          sms: Boolean(updated.notify_sms),
          marketing: Boolean(updated.notify_marketing),
        },
        security: {
          twoFactorEnabled: Boolean(updated.two_factor_enabled),
        },
        subscription: {
          plan: updated.plan,
          tokensLimit: updated.tokens_limit,
          tokensUsed: updated.tokens_used,
          tokensResetAt: updated.tokens_reset_at,
        },
      },
    }
  }, {
    body: t.Object({
      displayName: t.Optional(t.String()),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      region: t.Optional(t.String()),
      avatarUrl: t.Optional(t.String()),
      notifications: t.Optional(t.Object({
        email: t.Optional(t.Boolean()),
        push: t.Optional(t.Boolean()),
        sms: t.Optional(t.Boolean()),
        marketing: t.Optional(t.Boolean()),
      })),
      security: t.Optional(t.Object({
        twoFactorEnabled: t.Optional(t.Boolean()),
      })),
    }),
  })

  // Get user integrations
  .get('/integrations', async ({ query }) => {
    const userId = (query.userId as string) || 'default-user'
    const integrations = await getUserIntegrations(userId)

    return {
      success: true,
      integrations: integrations.map(i => ({
        id: i.id,
        platform: i.platform,
        platformName: i.platform_name,
        icon: i.icon,
        isConnected: Boolean(i.is_connected),
        storeUrl: i.store_url,
        storeName: i.store_name,
        metadata: i.metadata ? JSON.parse(i.metadata) : null,
        connectedAt: i.connected_at,
      })),
    }
  })

  // Update integration
  .put('/integrations/:platform', async ({ params, body, query }) => {
    const userId = (query.userId as string) || 'default-user'

    const success = await updateIntegration(userId, params.platform, {
      is_connected: body.isConnected,
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
      store_url: body.storeUrl,
      store_name: body.storeName,
      metadata: body.metadata,
    })

    if (!success) {
      return { success: false, message: 'Failed to update integration' }
    }

    const integrations = await getUserIntegrations(userId)
    const updated = integrations.find(i => i.platform === params.platform)

    if (!updated) {
      return { success: false, message: 'Integration not found' }
    }

    return {
      success: true,
      integration: {
        id: updated.id,
        platform: updated.platform,
        platformName: updated.platform_name,
        icon: updated.icon,
        isConnected: Boolean(updated.is_connected),
        storeUrl: updated.store_url,
        storeName: updated.store_name,
        metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
        connectedAt: updated.connected_at,
      }
    }
  }, {
    body: t.Object({
      isConnected: t.Boolean(),
      accessToken: t.Optional(t.String()),
      refreshToken: t.Optional(t.String()),
      storeUrl: t.Optional(t.String()),
      storeName: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })

  // Get team members
  .get('/team', async ({ query }) => {
    const ownerId = (query.userId as string) || 'default-user'
    const members = await getTeamMembers(ownerId)

    return {
      success: true,
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        avatar: m.avatar,
        status: m.status,
        invitedAt: m.invited_at,
        joinedAt: m.joined_at,
      })),
    }
  })

  // Add team member
  .post('/team', async ({ body, query }) => {
    const ownerId = (query.userId as string) || 'default-user'

    const id = await addTeamMember({
      owner_id: ownerId,
      name: body.name,
      email: body.email,
      role: body.role,
      avatar: body.avatar,
    })

    return { success: true, memberId: id }
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String(),
      role: t.Union([t.Literal('admin'), t.Literal('member')]),
      avatar: t.Optional(t.String()),
    }),
  })

  // Update team member
  .put('/team/:id', async ({ params, body, query, set }) => {
    const ownerId = (query.userId as string) || 'default-user'

    const success = await updateTeamMember(params.id, ownerId, {
      name: body.name,
      role: body.role,
      status: body.status,
    })

    if (!success) {
      set.status = 404
      return { success: false, message: 'Member not found' }
    }

    return { success: true }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      role: t.Optional(t.Union([t.Literal('admin'), t.Literal('member')])),
      status: t.Optional(t.Union([t.Literal('active'), t.Literal('pending'), t.Literal('inactive')])),
    }),
  })

  // Delete team member
  .delete('/team/:id', async ({ params, query, set }) => {
    const ownerId = (query.userId as string) || 'default-user'

    const success = await deleteTeamMember(params.id, ownerId)

    if (!success) {
      set.status = 404
      return { success: false, message: 'Member not found or cannot delete owner' }
    }

    return { success: true, message: 'Member deleted' }
  })

  // Update token usage
  .post('/tokens/use', async ({ body, query }) => {
    const userId = (query.userId as string) || 'default-user'
    await updateTokenUsage(userId, body.tokens)
    return { success: true }
  }, {
    body: t.Object({
      tokens: t.Number(),
    }),
  })
