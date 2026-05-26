import { create } from 'zustand';

export const useNavigationStore = create((set, get) => ({
  currentScreen: 'splash',
  previousScreen: null,
  history: [],
  activeTab: 'feed',
  transitionDirection: 'forward',
  activeModal: null,
  modalData: null,

  // Params for passing data between screens (e.g. conversationId)
  screenParams: {},

  // Navigate to a screen with optional params
  navigate: (screen, options = {}) => {
    const { currentScreen } = get();
    const tabScreenMapReversed = {
      feed: 'feed',
      explore: 'explore',
      conversations: 'messages',
      notifications: 'notifications',
      profile: 'profile',
    };
    const nextTab = tabScreenMapReversed[screen];

    set({
      previousScreen: currentScreen,
      currentScreen: screen,
      transitionDirection: options.direction || 'forward',
      history: [...get().history, currentScreen],
      screenParams: options.params || {},
      activeTab: nextTab || get().activeTab,
    });
  },

  goBack: () => {
    const { history } = get();
    if (history.length > 0) {
      const previousScreen = history[history.length - 1];
      const tabScreenMapReversed = {
        feed: 'feed',
        explore: 'explore',
        conversations: 'messages',
        notifications: 'notifications',
        profile: 'profile',
      };
      const nextTab = tabScreenMapReversed[previousScreen];

      set({
        currentScreen: previousScreen,
        previousScreen: get().currentScreen,
        transitionDirection: 'back',
        history: history.slice(0, -1),
        screenParams: {},
        activeTab: nextTab || get().activeTab,
      });
    }
  },

  // Set active tab — maps tab id to screen name
  setActiveTab: (tab) => {
    const tabScreenMap = {
      feed: 'feed',
      explore: 'explore',
      messages: 'conversations',
      notifications: 'notifications',
      profile: 'profile',
    };
    set({
      activeTab: tab,
      currentScreen: tabScreenMap[tab] || tab,
      previousScreen: get().currentScreen,
      transitionDirection: 'none',
      history: [],
      screenParams: {},
    });
  },

  openModal: (modalName, data = null) => {
    set({ activeModal: modalName, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  resetNavigation: () => {
    set({
      currentScreen: 'auth',
      previousScreen: null,
      history: [],
      activeTab: 'feed',
      transitionDirection: 'forward',
      activeModal: null,
      modalData: null,
      screenParams: {},
    });
  },
}));
