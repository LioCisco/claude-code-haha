import { Elysia, t } from 'elysia'

const stores: Array<{
  id: string
  name: string
  platform: string
  status: string
  createdAt: string
}> = []

export const storeRoutes = new Elysia({ prefix: '/api/stores' })
  .get('/', () => stores)
  .post('/', ({ body }) => {
    const store = {
      id: Date.now().toString(),
      ...body,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    stores.push(store)
    return store
  }, {
    body: t.Object({
      name: t.String(),
      platform: t.String(),
      description: t.Optional(t.String()),
    })
  })
  .get('/:id', ({ params }) => {
    const store = stores.find(s => s.id === params.id)
    if (!store) throw new Error('Store not found')
    return store
  })
  .put('/:id', ({ params, body }) => {
    const index = stores.findIndex(s => s.id === params.id)
    if (index === -1) throw new Error('Store not found')
    stores[index] = { ...stores[index], ...body }
    return stores[index]
  })
  .delete('/:id', ({ params }) => {
    const index = stores.findIndex(s => s.id === params.id)
    if (index === -1) throw new Error('Store not found')
    stores.splice(index, 1)
    return { success: true }
  })
