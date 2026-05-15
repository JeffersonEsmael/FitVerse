import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Video } from 'lucide-react';
import VideoCard from '../components/feed/VideoCard';
import StoreView from '../components/store/StoreView';
import { useFeedStore } from '../stores/feedStore';
import { useNavigationStore } from '../stores/navigationStore';

export default function FeedScreen() {
  const { videos, currentIndex, setCurrentIndex, activeTab, setActiveTab, fetchVideos, isLoading } = useFeedStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(1);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch posts on mount
  useEffect(() => {
    if (!hasFetched) {
      fetchVideos();
      setHasFetched(true);
    }
  }, [hasFetched, fetchVideos]);

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
        <button style={styles.createBtnTop} onClick={() => navigate('create')}>
          <PlusCircle size={28} color="#00D4FF" />
        </button>

        <div style={styles.tabContainer}>
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
          <div style={styles.tabDivider} />
          <button
            style={{ ...styles.tabBtn, ...(activeTab === 'store' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('store')}
          >
            Loja
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'store' ? (
          <motion.div
            key="store"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <StoreView />
          </motion.div>
        ) : videos.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.emptyFeed}
          >
            <Video size={48} color="#6C6C88" />
            <span style={styles.emptyTitle}>Nenhum post ainda</span>
            <span style={styles.emptySubtitle}>Seja o primeiro a postar!</span>
            <motion.button
              style={styles.emptyBtn}
              onClick={() => navigate('create')}
              whileTap={{ scale: 0.95 }}
            >
              <PlusCircle size={18} /> Criar Post
            </motion.button>
          </motion.div>
        ) : (
          videos.map((video, index) => (
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
          ))
        )}
      </AnimatePresence>

      {/* Video counter */}
      {activeTab !== 'store' && videos.length > 0 && (
        <div style={styles.counter}>
          {currentIndex + 1} / {videos.length}
        </div>
      )}
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
    left: '16px',
    right: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    padding: '8px 0',
  },
  createBtnTop: {
    position: 'absolute',
    left: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
  emptyFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#B0B0C8',
    fontFamily: "'Outfit', sans-serif",
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#6C6C88',
  },
  emptyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    fontFamily: "'Inter', sans-serif",
  },
};
