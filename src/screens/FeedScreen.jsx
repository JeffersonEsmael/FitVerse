import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Video, AlertCircle, X, ArrowLeft } from 'lucide-react';
import VideoCard from '../components/feed/VideoCard';
import StoreView from '../components/store/StoreView';
import { useFeedStore } from '../stores/feedStore';
import { useNavigationStore } from '../stores/navigationStore';

export default function FeedScreen() {
  const {
    videos, currentIndex, setCurrentIndex,
    activeTab, setActiveTab, fetchVideos,
    uploadingPost, uploadError, clearUploadError,
  } = useFeedStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
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

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStart - currentY;
    
    // Apply rubber band effect at borders
    if (currentIndex === 0 && diff < 0) {
      setDragOffset(-diff * 0.3); // Dragging down on first video
    } else if (currentIndex === videos.length - 1 && diff > 0) {
      setDragOffset(-diff * 0.3); // Dragging up on last video
    } else {
      setDragOffset(-diff);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;
    
    const threshold = 80; // 80px threshold to trigger transition
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        if (currentIndex < videos.length - 1) {
          goToVideo(currentIndex + 1);
        } else {
          setDragOffset(0);
        }
      } else {
        if (currentIndex > 0) {
          goToVideo(currentIndex - 1);
        } else {
          setDragOffset(0);
        }
      }
    } else {
      setDragOffset(0);
    }
    setTouchStart(null);
  };

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

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown') goToVideo(currentIndex + 1);
      else if (e.key === 'ArrowUp') goToVideo(currentIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, goToVideo]);

  const slideVariants = {
    initial: (d) => ({ y: d > 0 ? '100%' : '-100%', opacity: 0.5 }),
    animate: { y: 0, opacity: 1 },
    exit: (d) => ({ y: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Upload progress banner ─────────────────────────── */}
      <AnimatePresence>
        {uploadingPost && (
          <motion.div
            style={styles.uploadBanner}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div style={styles.uploadBannerContent}>
              <div style={styles.uploadBannerLeft}>
                <div style={styles.uploadSpinner} />
                <div>
                  <span style={styles.uploadBannerTitle}>
                    {uploadingPost.mediaType === 'video' ? '🎥 Enviando vídeo...' : '📷 Enviando foto...'}
                  </span>
                  <span style={styles.uploadBannerSub}>
                    {uploadingPost.progress}% concluído
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={styles.uploadProgressTrack}>
                <motion.div
                  style={styles.uploadProgressFill}
                  animate={{ width: `${uploadingPost.progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Upload error banner ──────────────────────────── */}
        {uploadError && (
          <motion.div
            style={styles.errorBanner}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
          >
            <AlertCircle size={18} color="#FF2D55" />
            <span style={styles.errorBannerText}>Falha no upload: {uploadError}</span>
            <button style={styles.errorClose} onClick={clearUploadError}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top tabs ──────────────────────────────────────── */}
      <div style={styles.topBar}>
        {activeTab === 'store' ? (
          <button style={styles.createBtnTop} onClick={() => setActiveTab('forYou')}>
            <ArrowLeft size={28} color="#fff" />
          </button>
        ) : (
          <button style={styles.createBtnTop} onClick={() => navigate('create')}>
            <PlusCircle size={28} color="#00D4FF" />
          </button>
        )}

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

      {/* ── Content Area ─────────────────────────────────── */}
        <AnimatePresence mode="wait" custom={direction}>
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
              <span style={styles.emptyTitle}>
                {uploadingPost ? 'Publicando seu post...' : 'Nenhum post ainda'}
              </span>
              <span style={styles.emptySubtitle}>
                {uploadingPost ? 'Aguarde um momento' : 'Seja o primeiro a postar!'}
              </span>
              {!uploadingPost && (
                <motion.button
                  style={styles.emptyBtn}
                  onClick={() => navigate('create')}
                  whileTap={{ scale: 0.95 }}
                >
                  <PlusCircle size={18} /> Criar Post
                </motion.button>
              )}
            </motion.div>
          ) : (
            videos.map((video, index) => (
              index === currentIndex && (
                <motion.div
                  key={video.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{
                    ...styles.videoSlide,
                    y: dragOffset,
                  }}
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
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: '#000', overflow: 'hidden', touchAction: 'none',
  },
  // ── Upload banner ──────────────────────────────────────────
  uploadBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    background: 'rgba(10,10,15,0.96)',
    borderBottom: '1px solid rgba(0,212,255,0.2)',
    backdropFilter: 'blur(12px)',
    padding: '12px 16px',
  },
  uploadBannerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  uploadBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  uploadSpinner: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid rgba(0,212,255,0.3)',
    borderTopColor: '#00D4FF',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  uploadBannerTitle: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
  },
  uploadBannerSub: {
    display: 'block',
    fontSize: '11px',
    color: '#6C6C88',
    fontFamily: "'Inter', sans-serif",
  },
  uploadProgressTrack: {
    height: '3px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00D4FF, #39FF14)',
    borderRadius: '9999px',
  },
  // ── Error banner ───────────────────────────────────────────
  errorBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    background: 'rgba(255,45,85,0.12)',
    borderBottom: '1px solid rgba(255,45,85,0.3)',
    backdropFilter: 'blur(12px)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  errorBannerText: {
    flex: 1,
    fontSize: '13px',
    color: '#FF2D55',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#FF2D55',
    padding: '2px',
    display: 'flex',
  },
  // ── Existing styles ────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top, 0px), 12px)',
    left: '16px', right: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 20, padding: '8px 0',
  },
  createBtnTop: {
    position: 'absolute', left: 0,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tabContainer: { display: 'flex', alignItems: 'center', gap: '16px' },
  tabBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    fontSize: '16px', fontWeight: 600, fontFamily: "'Inter', sans-serif",
    cursor: 'pointer', padding: '4px 0', transition: 'color 0.2s',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  tabActive: { color: '#fff', borderBottom: '2px solid #fff', paddingBottom: '2px' },
  tabDivider: { width: '1px', height: '16px', background: 'rgba(255,255,255,0.3)' },
  videoSlide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  counter: {
    position: 'absolute', bottom: '80px', right: '16px',
    color: 'rgba(255,255,255,0.3)', fontSize: '11px',
    fontFamily: "'Inter', sans-serif", zIndex: 5,
  },
  emptyFeed: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '12px',
  },
  emptyTitle: { fontSize: '18px', fontWeight: 700, color: '#B0B0C8', fontFamily: "'Outfit', sans-serif" },
  emptySubtitle: { fontSize: '14px', color: '#6C6C88' },
  emptyBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '12px 24px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
    cursor: 'pointer', marginTop: '8px', fontFamily: "'Inter', sans-serif",
  },
};
