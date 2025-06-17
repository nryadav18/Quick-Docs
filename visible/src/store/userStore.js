// stores/userStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_token';

const useUserStore = create((set, get) => ({
    user: null,
    token: null,
    deviceExpoNotificationToken: null,
    devicePin : null,

    setUser: (userData) => {
        console.log('Setting New User Data');
        set({ user: userData });
    },

    setToken: async (token) => {
        console.log('Setting New User Token');
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        set({ token });
    },

    setAlreadyLoggedIn: (status) => set({ alreadyLoggedIn: status }),

    setDeviceExpoNotificationToken: (token) => { 
        set ({deviceExpoNotificationToken: token}),
        console.log('Setting New Device Expo Token')
    },

    getDeviceExpoNotificationToken: () => {
        return get().deviceExpoNotificationToken;
    },

    setDevicePin : (devicePin) =>{
        set ({devicePin : devicePin})
        console.log('Setting New Device Pin')
    },

    getDevicePin : () => {
        return get().devicePin;
    },

    loadToken: async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
            console.log('Loaded token from secure storage');
            set({ token });
        }
    },

    clearUser: async () => {
        console.log('Clearing user data...');
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ user: null, token: null, deviceExpoNotificationToken : null });
    },

    incrementPromptCount: () =>
        set((state) => {
            if (!state.user) return {};
            return {
                user: {
                    ...state.user,
                    aipromptscount: (state.user.aipromptscount || 0) + 1,
                },
            };
        }),
}));

export default useUserStore;
