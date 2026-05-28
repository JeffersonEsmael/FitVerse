import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationSettingsStore = create(
  persist(
    (set, get) => ({
      settings: {
        followers: true,
        shapes: true,
        comments: true,
        messages: true,
        mentions: true,
      },

      toggleSetting: (key) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: !state.settings[key],
          },
        }));
      },
    }),
    {
      name: 'fitverse-notification-settings-cache',
    }
  )
);
