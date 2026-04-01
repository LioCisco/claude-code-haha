import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StoreProject, Product } from '@/types'

interface StoreBuilderState {
  projects: StoreProject[]
  currentProject: StoreProject | null
  products: Product[]
  currentStep: number

  // Actions
  addProject: (project: Omit<StoreProject, 'id' | 'createdAt'>) => void
  setCurrentProject: (project: StoreProject | null) => void
  updateProject: (id: string, updates: Partial<StoreProject>) => void
  addProduct: (product: Omit<Product, 'id'>) => void
  removeProduct: (id: string) => void
  setCurrentStep: (step: number) => void
}

export const useStoreBuilderStore = create<StoreBuilderState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      products: [],
      currentStep: 0,

      addProject: (project) => {
        const newProject: StoreProject = {
          ...project,
          id: Math.random().toString(36).substring(2, 15),
          createdAt: new Date(),
        }
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProject: newProject,
        }))
      },

      setCurrentProject: (project) => set({ currentProject: project }),

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        }))
      },

      addProduct: (product) => {
        const newProduct: Product = {
          ...product,
          id: Math.random().toString(36).substring(2, 15),
        }
        set((state) => ({
          products: [...state.products, newProduct],
        }))
      },

      removeProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }))
      },

      setCurrentStep: (step) => set({ currentStep: step }),
    }),
    {
      name: 'accio-store-builder',
    }
  )
)
