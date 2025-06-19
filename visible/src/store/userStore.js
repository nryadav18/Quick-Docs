// stores/userStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_token';

const useUserStore = create((set, get) => ({
    user: null,
    token: null,
    deviceExpoNotificationToken: null,
    devicePin: null,
    dashboardData: {
        daily: [],
        weekly: [],
        monthly: [],
    },

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
        set({ deviceExpoNotificationToken: token }),
            console.log('Setting New Device Expo Token')
    },

    getDeviceExpoNotificationToken: () => {
        return get().deviceExpoNotificationToken;
    },

    setDevicePin: (devicePin) => {
        set({ devicePin: devicePin })
        console.log('Setting New Device Pin')
    },

    getDevicePin: () => {
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
        set({ user: null, token: null, deviceExpoNotificationToken: null, devicePin: null, dashboardData: { daily: [], weekly: [], monthly: [] } });
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

    // ✅ Set entire dashboard data (call after fetching from API)
    setDashboardData: (data) => {
        console.log('Setting dashboard data');
        set({ dashboardData: data });
    },

    // ✅ Get current dashboard data from state
    getDashboardData: () => {
        console.log('Getting Data from Dashboard')
        return get().dashboardData;
    },

    updateDashboardEntry: (type, count = 1) => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekStr = weekStart.toISOString().split('T')[0];

        const monthStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

        set((state) => {
            const updateArray = (arr, matchKey, keyValue) => {
                const index = arr.findIndex((item) => item[matchKey] === keyValue);
                if (index >= 0) {
                    return arr.map((item, i) =>
                        i === index
                            ? { ...item, [type]: (item[type] || 0) + count }
                            : item
                    );
                } else {
                    return [...arr, { [matchKey]: keyValue, chatbot: 0, voice: 0, [type]: count }];
                }
            };

            return {
                dashboardData: {
                    daily: updateArray(state.dashboardData.daily, 'date', dateStr),
                    weekly: updateArray(state.dashboardData.weekly, 'weekStart', weekStr),
                    monthly: updateArray(state.dashboardData.monthly, 'monthStart', monthStr),
                },
            };
        });

        console.log(`Zustand: Dashboard updated locally for ${type} (+${count})`);
    },


}));

export default useUserStore;
