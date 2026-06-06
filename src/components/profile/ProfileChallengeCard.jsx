import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Layers } from 'lucide-react';

export default function ProfileChallengeCard({ challenge, onClick }) {
  const photos = challenge.checkins || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const hasSwiped = useRef(false);

  const progressPct = Math.min(100, Math.round(((challenge.progress || 0) / (challenge.duration || 30)) * 100));
  const isCompleted = progressPct >= 100;

  const isVideo = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    hasSwiped.current = false;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Horizontal swipe threshold: 30px, vertical threshold to prevent swipe when scrolling vertically: 45px
    if (Math.abs(diffX) > 30 && Math.abs(diffY) < 45) {
      e.stopPropagation();
      hasSwiped.current = true;
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMediaTap = (e) => {
    if (hasSwiped.current) {
      e.stopPropagation();
      return;
    }

    // Get click coordinates relative to the element to allow tap navigation on edges
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      // Tap on left 30%: previous slide
      e.stopPropagation();
      handlePrev();
    } else if (x > width * 0.7) {
      // Tap on right 30%: next slide
      e.stopPropagation();
      handleNext();
    } else {
      // Tap in center: open details modal
      if (onClick) onClick();
    }
  };

  return (
    <motion.div
      style={styles.card}
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        if (!hasSwiped.current && onClick) onClick();
      }}
    >
      {/* Media Carousel Area */}
      <div
        style={styles.mediaContainer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleMediaTap}
      >
        {photos.length > 0 ? (
          isVideo(photos[activeIndex].photo_url) ? (
            <video
              src={photos[activeIndex].photo_url}
              style={styles.media}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={photos[activeIndex].photo_url}
              alt=""
              style={styles.media}
            />
          )
        ) : (
          <div style={{
            ...styles.mediaPlaceholder,
            background: `linear-gradient(135deg, ${challenge.color || '#00D4FF'}25, ${challenge.color || '#00D4FF'}08)`,
          }}>
            <span style={styles.placeholderEmoji}>{challenge.icon || '🏆'}</span>
            <span style={styles.placeholderText}>Sem check-ins</span>
          </div>
        )}

        {/* Carousel indicator badge if there are check-ins */}
        {photos.length > 1 && (
          <div style={styles.carouselBadge}>
            <Layers size={10} color="#fff" />
          </div>
        )}

        {/* Challenge icon badge overlaid on image */}
        {photos.length > 0 && (
          <div style={{ ...styles.iconOverlay, backgroundColor: `${challenge.color || '#00D4FF'}20` }}>
            <span style={{ fontSize: '14px' }}>{challenge.icon || '🏆'}</span>
          </div>
        )}
      </div>

      {/* Card Info and Progress Area */}
      <div style={styles.infoContainer}>
        {/* Title */}
        <span style={styles.title}>{challenge.title}</span>

        {/* Carousel indicators (Dots) */}
        {photos.length > 1 ? (() => {
          const maxVisible = 6;
          const totalDots = photos.length;
          const S = totalDots > maxVisible 
            ? Math.min(activeIndex, totalDots - maxVisible) 
            : 0;
          const containerWidth = Math.min(maxVisible, totalDots) * 6 + (Math.min(maxVisible, totalDots) - 1) * 4;

          return (
            <div style={{ ...styles.dotsContainer, width: `${containerWidth}px` }}>
              <div 
                style={{
                  ...styles.dotsInnerRow,
                  transform: `translateX(-${S * 10}px)`,
                }}
              >
                {photos.map((_, idx) => (
                  <span
                    key={idx}
                    style={{
                      ...styles.dot,
                      backgroundColor: idx === activeIndex ? '#00D4FF' : '#6C6C88',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })() : (
          <div style={{ height: '6px' }} /> // spacer to keep height consistent
        )}

        {/* Check-ins X/Y counter */}
        <div style={styles.counterRow}>
          <span style={styles.counterText}>
            {challenge.progress || 0}/{challenge.duration || 30}
          </span>
          {isCompleted && (
            <span style={styles.completedTag}>🏆</span>
          )}
        </div>

        {/* Progress bar proportional preenchida */}
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              background: isCompleted
                ? 'linear-gradient(90deg, #39FF14, #00CC00)'
                : `linear-gradient(90deg, #00D4FF, ${challenge.color || '#00D4FF'})`,
              width: `${progressPct}%`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

const styles = {
  card: {
    aspectRatio: '9/16',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    boxSizing: 'border-box',
    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
  },
  mediaContainer: {
    width: '100%',
    height: '62%',
    position: 'relative',
    overflow: 'hidden',
    background: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    boxSizing: 'border-box',
  },
  placeholderEmoji: {
    fontSize: '24px',
    marginBottom: '2px',
  },
  placeholderText: {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  carouselBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '5px',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  iconOverlay: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    width: '24px',
    height: '24px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(4px)',
  },
  infoContainer: {
    height: '38%',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textAlign: 'center',
  },
  dotsContainer: {
    height: '6px',
    overflow: 'hidden',
    position: 'relative',
    margin: '4px auto',
  },
  dotsInnerRow: {
    display: 'flex',
    gap: '4px',
    position: 'absolute',
    left: 0,
    top: 0,
    transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    willChange: 'transform',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease',
  },
  counterRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  counterText: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  completedTag: {
    fontSize: '10px',
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '2px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease-out',
  },
};
