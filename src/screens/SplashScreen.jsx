import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigationStore } from '../stores/navigationStore';
import { useAuthStore } from '../stores/authStore';

export default function SplashScreen() {
  const navigate = useNavigationStore((s) => s.navigate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(isAuthenticated ? 'feed' : 'auth');
    }, 2500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  return (
    <div style={styles.container}>
      {/* Background particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{ ...styles.particle, left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 3 + i * 0.5, delay: i * 0.3 }}
        />
      ))}

      {/* Logo */}
      <motion.div
        style={styles.logoContainer}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <div style={styles.logoIcon}>
          <span style={styles.logoEmoji}>🏋️</span>
        </div>
      </motion.div>

      {/* App name */}
      <motion.h1
        style={styles.appName}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        FitVerse
      </motion.h1>

      <motion.p
        style={styles.tagline}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        Treino. Competição. Comunidade.
      </motion.p>

      {/* Loading bar */}
      <motion.div
        style={styles.loadingTrack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          style={styles.loadingFill}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ delay: 1.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 30%, #141430, #0A0A0F 70%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '16px', overflow: 'hidden',
  },
  particle: {
    position: 'absolute', width: '6px', height: '6px', borderRadius: '50%',
    background: '#00D4FF', filter: 'blur(2px)',
  },
  logoContainer: { marginBottom: '8px' },
  logoIcon: {
    width: '100px', height: '100px', borderRadius: '28px',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.15)',
  },
  logoEmoji: { fontSize: '48px' },
  appName: {
    fontSize: '42px', fontWeight: 900, color: '#fff',
    fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em', margin: 0,
    background: 'linear-gradient(135deg, #00D4FF, #39FF14)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  tagline: {
    fontSize: '15px', color: '#6C6C88', fontFamily: "'Inter', sans-serif",
    fontWeight: 500, letterSpacing: '0.05em',
  },
  loadingTrack: {
    width: '120px', height: '3px', background: 'rgba(255,255,255,0.08)',
    borderRadius: '9999px', overflow: 'hidden', marginTop: '24px',
  },
  loadingFill: {
    height: '100%', borderRadius: '9999px',
    background: 'linear-gradient(90deg, #00D4FF, #39FF14)',
  },
};
