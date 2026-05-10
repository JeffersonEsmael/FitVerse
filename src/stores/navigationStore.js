import { create } from 'zustand';

export const useNavigationStore = create((set, get) => ({
  // Current active screen
  currentScreen: 'splash',

  // Previous screen for back navigation
  previousScreen: null,

  // Navigation history stack
  history: [],

  // Active bottom nav tab
  activeTab: 'feed',

  // Screen transition direction
  transitionDirection: 'forward',

  // Modal/sheet state
  activeModal: null,
  modalData: null,

  // Navigate to a screen
  navigate: (screen, options = {}) => {
    const { currentScreen } = get();
    set({
      previousScreen: currentScreen,
      currentScreen: screen,
      transitionDirection: options.direction || 'forward',
      history: [...get().history, currentScreen],
    });
  },

  // Navigate back
  goBack: () => {
    const { history } = get();
    if (history.length > 0) {
      const previousScreen = history[history.length - 1];
      set({
        currentScreen: previousScreen,
        previousScreen: get().currentScreen,
        transitionDirection: 'back',
        history: history.slice(0, -1),
      });
    }
  },

  // Set active tab (bottom nav)
  setActiveTab: (tab) => {
    const tabScreenMap = {
      feed: 'feed',
      explore: 'explore',
      create: 'create',
      ranking: 'ranking',
      profile: 'profile',
    };
    set({
      activeTab: tab,
      currentScreen: tabScreenMap[tab] || tab,
      previousScreen: get().currentScreen,
      transitionDirection: 'none',
      history: [],
    });
  },

  // Open modal
  openModal: (modalName, data = null) => {
    set({ activeModal: modalName, modalData: data });
  },

  // Close modal
  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  // Reset navigation (e.g., on logout)
  resetNavigation: () => {
    set({
      currentScreen: 'auth',
      previousScreen: null,
      history: [],
      activeTab: 'feed',
      transitionDirection: 'forward',
      activeModal: null,
      modalData: null,
    });
  },
}));
