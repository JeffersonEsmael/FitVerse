import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigationStore } from './stores/navigationStore';
import { useAuthStore } from './stores/authStore';
import BottomNav from './components/layout/BottomNav';

// Screens
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import FeedScreen from './screens/FeedScreen';
import ExploreScreen from './screens/ExploreScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import RankingScreen from './screens/RankingScreen';
import ProfileScreen from './screens/ProfileScreen';
import NutriScanScreen from './screens/NutriScanScreen';
import NotificationsScreen from './screens/NotificationsScreen';

// Screens that show the bottom nav
const NAV_SCREENS = ['feed', 'explore', 'create', 'ranking', 'profile', 'nutriscan', 'notifications'];

// Screen components map
const SCREENS = {
  splash: SplashScreen,
  auth: AuthScreen,
  feed: FeedScreen,
  explore: ExploreScreen,
  create: CreatePostScreen,
  ranking: RankingScreen,
  profile: ProfileScreen,
  nutriscan: NutriScanScreen,
  notifications: NotificationsScreen,
};

export default function App() {
  const currentScreen = useNavigationStore((s) => s.currentScreen);
  const initAuth = useAuthStore((s) => s.initAuth);

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsubscribe = initAuth();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [initAuth]);

  const ScreenComponent = SCREENS[currentScreen] || FeedScreen;
  const showNav = NAV_SCREENS.includes(currentScreen);

  return (
    <div style={styles.app}>
      <AnimatePresence mode="wait">
        <ScreenComponent key={currentScreen} />
      </AnimatePresence>

      {showNav && <BottomNav />}
    </div>
  );
}

const styles = {
  app: {
    width: '100%',
    height: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    position: 'relative',
    overflow: 'hidden',
    background: '#0A0A0F',
  },
};
