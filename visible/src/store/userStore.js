//Zustand for Strong State Management
import { create } from 'zustand';

const useUserStore = create((set) => ({
    user: null,
    token: null,
    setUser: (userData) => set({ user: userData }),
    setToken: (token) => set({ token }),
    clearUser: () => {
        console.log("Clearing user data...");
        set({ user: null, token: null });
    }
}));

export default useUserStore;
