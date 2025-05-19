//Zustand for Strong State Management
import { create } from 'zustand';

const useUserStore = create((set) => ({
    user: null,
    token: null,
    setUser: (userData) => {
        console.log('Setting New User Data')
        set({ user: userData })
    },
    setToken: (token) => {
        console.log('Setting New User Token')
        set({ token })
    },
    clearUser: () => {
        console.log("Clearing user data...");
        set({ user: null, token: null });
    },
    incrementPromptCount: () =>
        set((state) => {
            if (!state.user) return {};
            return {
                user: {
                    ...state.user,
                    aipromptscount: (state.user.aipromptscount || 0) + 1
                }
            };
        }),
}));

export default useUserStore;
