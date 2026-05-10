import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCard from '../components/feed/VideoCard';
import { useFeedStore } from '../stores/feedStore';

export default function FeedScreen() {
  const { videos, currentIndex, setCurrentIndex, activeTab, setActiveTab } = useFeedStore();
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(1);

  const goToVideo = useCallback((index) => {
    if (index < 0 || index >= videos.length || isTransitioning) return;
    setDirection(index > currentIndex ? 1 : -1);
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [videos.length, isTransitioning, currentIndex, setCurrentIndex]);

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToVideo(currentIndex + 1);
      else goToVideo(currentIndex - 1);
    }
    setTouchStart(null);
  };

  // Wheel handler for desktop
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY > 30) goToVideo(currentIndex + 1);
    else if (e.deltaY < -30) goToVideo(currentIndex - 1);
  }, [currentIndex, goToVideo]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown') goToVideo(currentIndex + 1);
      else if (e.key === 'ArrowUp') goToVideo(currentIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, goToVideo]);

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top tabs */}
      <div style={styles.topBar}>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'following' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('following')}
        >
          Seguindo
        </button>
        <div style={styles.tabDivider} />
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'forYou' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('forYou')}
        >
          Para Você
        </button>
      </div>

      {/* Video stack */}
      <AnimatePresence mode="wait">
        {videos.map((video, index) => (
          index === currentIndex && (
            <motion.div
              key={video.id}
              style={styles.videoSlide}
              initial={{ y: direction > 0 ? '100%' : '-100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction > 0 ? '-30%' : '30%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <VideoCard
                video={video}
                isActive={index === currentIndex}
                index={index}
              />
            </motion.div>
          )
        ))}
      </AnimatePresence>

      {/* Video counter */}
      <div style={styles.counter}>
        {currentIndex + 1} / {videos.length}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#000',
    overflow: 'hidden',
    touchAction: 'none',
  },
  topBar: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top, 0px), 12px)',
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    zIndex: 20,
    padding: '8px 0',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    padding: '4px 0',
    transition: 'color 0.2s',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  tabActive: {
    color: '#fff',
    borderBottom: '2px solid #fff',
    paddingBottom: '2px',
  },
  tabDivider: {
    width: '1px',
    height: '16px',
    background: 'rgba(255,255,255,0.3)',
  },
  videoSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  counter: {
    position: 'absolute',
    bottom: '80px',
    right: '16px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '11px',
    fontFamily: "'Inter', sans-serif",
    zIndex: 5,
  },
};
