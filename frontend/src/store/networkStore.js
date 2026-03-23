import { create } from 'zustand'

export const useNetworkStore = create((set) => ({
  apiUrl: null,
  socketTransport: null,
  setApiUrl: (url) => set({ apiUrl: url }),
  setSocketTransport: (t) => set({ socketTransport: t }),
}))

export default useNetworkStore
