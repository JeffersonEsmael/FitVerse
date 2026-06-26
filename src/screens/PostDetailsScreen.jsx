import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import VideoCard from '../components/feed/VideoCard';
import { preloadVideo, cleanupPreloads, clearAllPreloads } from '../utils/videoPreloader';

export default function PostDetailsScreen() {
  const { screenParams, goBack } = useNavigationStore();
  const post = screenParams?.post;
  const allPosts = screenParams?.allPosts || (post ? [post] : []);
  const startIndex = screenParams?.startIndex ?? 0;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [direction, setDirection] = useState(1);
  const [touchStart, setTouchStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef(null);

  // Pre-load videos for smooth swiping
  useEffect(() => {
    if (allPosts.length === 0) return;

    // Preload current video
    const currentVideo = allPosts[currentIndex];
    if (currentVideo && currentVideo.mediaType === 'video' && currentVideo.videoUrl) {
      preloadVideo(currentVideo.videoUrl);
    }

    // Preload next video
    const nextVideo = allPosts[currentIndex + 1];
    if (nextVideo && nextVideo.mediaType === 'video' && nextVideo.videoUrl) {
      preloadVideo(nextVideo.videoUrl);
    }

    // Preload previous video
    const prevVideo = allPosts[currentIndex - 1];
    if (prevVideo && prevVideo.mediaType === 'video' && prevVideo.videoUrl) {
      preloadVideo(prevVideo.videoUrl);
    }

    // Cleanup far preloads (keep current ± 1)
    const keepUrls = [];
    if (prevVideo?.videoUrl) keepUrls.push(prevVideo.videoUrl);
    if (currentVideo?.videoUrl) keepUrls.push(currentVideo.videoUrl);
    if (nextVideo?.videoUrl) keepUrls.push(nextVideo.videoUrl);
    cleanupPreloads(keepUrls);
  }, [allPosts, currentIndex]);

  // Clean up all preloads on unmount
  useEffect(() => {
    return () => clearAllPreloads();
  }, []);

  const goToVideo = useCallback((index) => {
    if (index < 0 || index >= allPosts.length || isTransitioning) return;
    setDirection(index > currentIndex ? 1 : -1);
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [allPosts.length, isTransitioning, currentIndex]);

  // Touch handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStart - currentY;

    if (currentIndex === 0 && diff < 0) {
      setDragOffset(-diff * 0.3);
    } else if (currentIndex === allPosts.length - 1 && diff > 0) {
      setDragOffset(-diff * 0.3);
    } else {
      setDragOffset(-diff);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;

    const threshold = 80;
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < allPosts.length - 1) {
        goToVideo(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        goToVideo(currentIndex - 1);
      }
    }
    setDragOffset(0);
    setTouchStart(null);
  };

  // Wheel handler
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

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown') goToVideo(currentIndex + 1);
      else if (e.key === 'ArrowUp') goToVideo(currentIndex - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, goToVideo]);

  // Animation variants using custom direction
  const slideVariants = {
    initial: (d) => ({ y: d > 0 ? '100%' : '-100%' }),
    animate: { y: 0 },
    exit: (d) => ({ y: d > 0 ? '-100%' : '100%' }),
  };

  if (!post && allPosts.length === 0) {
    return (
      <ScreenWrapper screenKey="post_details" noPadding={true}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>Post não encontrado</p>
          <button onClick={goBack} style={styles.errorBackBtn}>Voltar</button>
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenKey="post_details" noPadding={true}>
      <div
        ref={containerRef}
        style={styles.container}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Back Button */}
        <button style={styles.backBtn} onClick={goBack} aria-label="Voltar">
          <ArrowLeft size={24} color="#fff" />
        </button>

        {/* Scrollable video feed */}
        <AnimatePresence initial={false} custom={direction}>
          {allPosts.map((video, index) =>
            index === currentIndex ? (
              <motion.div
                key={video.id || index}
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                style={{
                  ...styles.videoSlide,
                  y: dragOffset,
                }}
              >
                <VideoCard video={video} isActive={index === currentIndex} index={index} />
              </motion.div>
            ) : null
          )}
        </AnimatePresence>

        {/* Video counter */}
        {allPosts.length > 1 && (
          <div style={styles.counter}>
            {currentIndex + 1} / {allPosts.length}
          </div>
        )}
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    touchAction: 'none',
  },
  videoSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backBtn: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top, 0px), 16px)',
    left: '16px',
    zIndex: 1000,
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    transition: 'all 0.2s',
  },
  counter: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top, 0px), 20px)',
    right: '16px',
    zIndex: 1000,
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    background: 'rgba(0,0,0,0.4)',
    padding: '4px 10px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    background: '#0A0A0F',
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '16px',
    fontFamily: "'Inter', sans-serif",
  },
  errorBackBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    background: '#39FF14',
    color: '#000',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  }
};
