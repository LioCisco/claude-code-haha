import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, setUser, setLoading, login } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await res.json()

        if (data.success && data.data?.user) {
          setUser(data.data.user)
        } else {
          // Token invalid, clear it
          useAuthStore.getState().logout()
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        useAuthStore.getState().logout()
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [token, setUser, setLoading])

  return <>{children}</>
}
