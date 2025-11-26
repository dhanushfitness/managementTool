import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => set({ token, user, hydrated: true }),
      logout: () => set({ token: null, user: null, hydrated: true }),
      setHydrated: () => set({ hydrated: true })
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Error rehydrating auth store:', error)
          }
          // Set hydrated after rehydration completes
          if (state) {
            // Use setTimeout to ensure this runs after the store is fully rehydrated
            setTimeout(() => {
              useAuthStore.getState().setHydrated()
            }, 0)
          }
        }
      }
    }
  )
)

