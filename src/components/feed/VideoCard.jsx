import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, VolumeX } from 'lucide-react';
import VideoActions from './VideoActions';
import VideoInfo from './VideoInfo';
import CommentsSheet from './CommentsSheet';
import { useAuthStore } from '../../stores/authStore';
import { useSocialStore } from '../../stores/socialStore';
import { useNavigationStore } from '../../stores/navigationStore';

import { useFeedStore } from '../../stores/feedStore';
import { AnimatePresence } from 'framer-motion';
import { getPreloadedUrl, preloadVideo } from '../../utils/videoPreloader';
import { getPreloadedImageUrl, preloadImage, preloadImages } from '../../utils/imagePreloader';

export default function VideoCard({ video, isActive, index }) {
  const videoRef = useRef(null);
  const carouselRef = useRef(null);
  const longPressTimer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  const [progress, setProgress] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [optionsActionFeedback, setOptionsActionFeedback] = useState(null);
  const [reportingReason, setReportingReason] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const { user } = useAuthStore();
  const { checkIfFollowing, followUser, unfollowUser } = useSocialStore();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isSelf = user?.uid === video.userId;
  const isVideo = video.mediaType === 'video';
  const isCarousel = video.mediaType === 'carousel';

  useEffect(() => {
    if (user?.uid && video.userId) {
      if (isSelf) {
        setIsFollowing(true);
      } else {
        checkIfFollowing(user.uid, video.userId).then(res => {
          setIsFollowing(res);
        });
      }
    }
  }, [user?.uid, video.userId, checkIfFollowing, isSelf]);

  const handleFollowToggle = async (e) => {
    if (e) e.stopPropagation();
    if (!user?.uid || !video.userId || isSelf) return;

    const previousState = isFollowing;
    setIsFollowing(!isFollowing);

    if (previousState) {
      const res = await unfollowUser(user.uid, video.userId);
      if (!res.success) {
        setIsFollowing(previousState);
      }
    } else {
      const res = await followUser(user.uid, video.userId);
      if (!res.success) {
        setIsFollowing(previousState);
      }
    }
  };

  useEffect(() => {
    if (isActive) {
      // Increment views count (local and DB)
      useFeedStore.getState().incrementViews(video.id);

      if (isVideo) {
        const el = videoRef.current;
        if (el) {
          // Use preloaded blob URL if available for instant playback
          const blobUrl = getPreloadedUrl(video.videoUrl);
          if (blobUrl && el.src !== blobUrl) {
            el.src = blobUrl;
          } else if (!blobUrl && el.src !== video.videoUrl) {
            el.src = video.videoUrl;
          }

          el.currentTime = 0;
          setProgress(0);
          
          // Autoplay fallback system
          el.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.log('[VideoCard] Autoplay failed unmuted, trying muted:', err);
              el.muted = true;
              setIsMuted(true);
              el.play()
                .then(() => setIsPlaying(true))
                .catch((err2) => {
                  console.warn('[VideoCard] Autoplay failed even when muted:', err2);
                  setIsPlaying(false);
                });
            });
        }
      }

      // Pre-load the next item in the feed for smooth transition
      const feedState = useFeedStore.getState();
      const nextIdx = index + 1;
      if (nextIdx < feedState.videos.length) {
        const nextVideo = feedState.videos[nextIdx];
        if (nextVideo) {
          if (nextVideo.mediaType === 'video' && nextVideo.videoUrl) {
            preloadVideo(nextVideo.videoUrl);
          } else if (nextVideo.mediaType === 'carousel' && nextVideo.carouselUrls) {
            preloadImages(nextVideo.carouselUrls);
          } else if (nextVideo.mediaType === 'image' && nextVideo.videoUrl) {
            preloadImage(nextVideo.videoUrl);
          }
        }
      }
    } else {
      if (isVideo) {
        const el = videoRef.current;
        if (el) {
          el.pause();
          setIsPlaying(false);
        }
      }
    }
  }, [isActive, isVideo, video.id, video.videoUrl, index]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration > 0) {
        setProgress((current / duration) * 100);
      }
    }
  };

  const togglePlay = () => {
    if (!isVideo) return;
    if (isLongPressing) return;
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 800);
    } else {
      el.play().then(() => setIsPlaying(true));
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) videoRef.current.muted = !isMuted;
  };

  const handleCarouselScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentCarouselIndex) {
        setCurrentCarouselIndex(newIndex);
      }
    }
  };

  const handleStartPress = (e) => {
    setIsLongPressing(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      setShowOptions(true);
    }, 600); // 600ms hold triggers options
  };

  const handleEndPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    // Delay clearing long press state to prevent immediate click trigger
    setTimeout(() => {
      setIsLongPressing(false);
    }, 50);
  };

  return (
    <div
      style={styles.container}
      onClick={isVideo ? togglePlay : undefined}
      onTouchStart={handleStartPress}
      onTouchEnd={handleEndPress}
      onTouchMove={handleEndPress}
      onMouseDown={handleStartPress}
      onMouseUp={handleEndPress}
      onMouseLeave={handleEndPress}
    >
      {/* Media element */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          style={styles.media}
          loop
          muted={isMuted}
          playsInline
          preload={isActive ? 'auto' : 'none'}
          onTimeUpdate={handleTimeUpdate}
        />
      ) : isCarousel ? (
        <div 
          ref={carouselRef}
          style={styles.carouselContainer} 
          onScroll={handleCarouselScroll}
        >
          {(video.carouselUrls || []).map((url, idx) => (
            <div key={idx} style={styles.carouselSlide}>
              <img 
                src={getPreloadedImageUrl(url)} 
                alt={`${video.caption || ''} - Slide ${idx + 1}`} 
                style={{ ...styles.media, userSelect: 'none', WebkitUserDrag: 'none', pointerEvents: 'none' }} 
                draggable="false"
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      ) : (
        <img
          src={getPreloadedImageUrl(video.videoUrl)}
          alt={video.caption || ''}
          style={{ ...styles.media, userSelect: 'none', WebkitUserDrag: 'none' }}
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
        />
      )}

      {/* Carousel Dots / Page Indicator */}
      {isCarousel && video.carouselUrls && video.carouselUrls.length > 1 && (
        <div style={styles.dotsContainer}>
          {video.carouselUrls.map((_, idx) => (
            <div
              key={idx}
              style={{
                ...styles.dot,
                background: currentCarouselIndex === idx ? '#00D4FF' : 'rgba(255,255,255,0.4)',
                transform: currentCarouselIndex === idx ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Gradient overlays */}
      <div style={styles.gradientTop} />
      <div style={styles.gradientBottom} />

      {/* Play icon on pause (video only) */}
      {isVideo && showPlayIcon && (
        <motion.div
          style={styles.playIcon}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.8 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Play size={64} fill="white" color="white" />
        </motion.div>
      )}

      {/* Mute toggle (video only) */}
      {isVideo && (
        <motion.button
          style={styles.muteBtn}
          onClick={toggleMute}
          whileTap={{ scale: 0.85 }}
        >
          {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
        </motion.button>
      )}

      {/* Fine progress bar at the bottom of the video */}
      {isVideo && (
        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
      )}

      {/* Video info (bottom-left) */}
      <VideoInfo video={video} isFollowing={isFollowing} isSelf={isSelf} onFollowToggle={handleFollowToggle} />

      {/* Action buttons (right side) */}
      <VideoActions 
        video={video} 
        isFollowing={isFollowing} 
        isSelf={isSelf} 
        onFollowToggle={handleFollowToggle} 
        onCommentClick={() => setShowComments(true)}
        onMoreClick={() => setShowOptions(true)}
      />

      {/* Comments Drawer */}
      <CommentsSheet 
        isOpen={showComments} 
        onClose={() => setShowComments(false)} 
        videoId={video.id}
      />

      {/* Options Bottom Sheet Modal */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            style={styles.optionsOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowOptions(false); setReportingReason(false); setOptionsActionFeedback(null); }}
          >
            <motion.div
              style={styles.optionsSheet}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.sheetHandle} />
              
              {optionsActionFeedback ? (
                <div style={styles.feedbackContainer}>
                  <div style={styles.feedbackIcon}>✓</div>
                  <span style={styles.feedbackText}>{optionsActionFeedback}</span>
                </div>
              ) : reportingReason ? (
                <div style={styles.reportingContainer}>
                  <div style={styles.sheetHeader}>
                    <button style={styles.sheetBackBtn} onClick={() => setReportingReason(false)}>←</button>
                    <h4 style={styles.sheetTitle}>Denunciar Vídeo</h4>
                  </div>
                  <div style={styles.reasonsList}>
                    {['Spam ou Enganoso', 'Nudez ou Atividade Sexual', 'Violência ou Conteúdo Gráfico', 'Discurso de Ódio', 'Bullying ou Assédio', 'Outros'].map((reason) => (
                      <button
                        key={reason}
                        style={styles.reasonBtn}
                        onClick={() => {
                          setOptionsActionFeedback('Obrigado! Sua denúncia foi registrada e será analisada.');
                          setTimeout(() => {
                            setShowOptions(false);
                            setReportingReason(false);
                            setOptionsActionFeedback(null);
                          }, 2500);
                        }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.optionsList}>
                  {isSelf ? (
                    <button
                      style={styles.optionItemDanger}
                      onClick={async () => {
                        if (window.confirm("Deseja realmente excluir esta publicação? Ela será removida permanentemente do banco de dados.")) {
                          setShowOptions(false);
                          const store = useFeedStore.getState();
                          const res = await store.deletePost(video.id);
                          if (res.success) {
                            const navStore = useNavigationStore.getState();
                            if (navStore.currentScreen === 'post_details') {
                              navStore.goBack();
                            }
                          } else {
                            alert('Erro ao excluir a publicação: ' + res.error);
                          }
                        }
                      }}
                    >
                      <span style={styles.optionIconDanger}>🗑️</span>
                      <div style={styles.optionTextContainer}>
                        <span style={styles.optionLabelDanger}>Excluir Publicação</span>
                        <span style={styles.optionSubDanger}>Remover permanentemente este post</span>
                      </div>
                    </button>
                  ) : (
                    <>
                      <button
                        style={styles.optionItem}
                        onClick={() => {
                          setOptionsActionFeedback('Obrigado! Vamos ocultar conteúdo semelhante para você.');
                          setTimeout(() => {
                            setShowOptions(false);
                            setOptionsActionFeedback(null);
                            const store = useFeedStore.getState();
                            const nextIndex = store.currentIndex + 1;
                            if (nextIndex < store.videos.length) {
                              store.setCurrentIndex(nextIndex);
                            }
                          }, 2000);
                        }}
                      >
                        <span style={styles.optionIcon}>👁️‍🗨️</span>
                        <div style={styles.optionTextContainer}>
                          <span style={styles.optionLabel}>Não tenho interesse</span>
                          <span style={styles.optionSub}>Esconder este post e similares</span>
                        </div>
                      </button>
                      
                      <button
                        style={styles.optionItemDanger}
                        onClick={() => setReportingReason(true)}
                      >
                        <span style={styles.optionIconDanger}>🚩</span>
                        <div style={styles.optionTextContainer}>
                          <span style={styles.optionLabelDanger}>Denunciar Conteúdo</span>
                          <span style={styles.optionSubDanger}>Reportar spam, abuso ou conteúdo impróprio</span>
                        </div>
                      </button>
                    </>
                  )}
                  
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setShowOptions(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flexShrink: 0,
    background: '#000',
    overflow: 'hidden',
    scrollSnapAlign: 'start',
  },
  media: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: '#000',
  },
  carouselContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x mandatory',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  carouselSlide: {
    width: '100%',
    height: '100%',
    flexShrink: 0,
    scrollSnapAlign: 'start',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '6px',
    zIndex: 10,
    background: 'rgba(0,0,0,0.3)',
    padding: '6px 10px',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '120px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '280px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  muteBtn: {
    position: 'absolute',
    top: '60px',
    right: '16px',
    zIndex: 10,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #00D4FF, #39FF14)',
    boxShadow: '0 0 8px rgba(0, 212, 255, 0.8)',
    transition: 'width 0.1s linear',
  },
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
  },
  optionsSheet: {
    width: '100%',
    background: 'rgba(10, 10, 15, 0.95)',
    backdropFilter: 'blur(30px)',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '16px 20px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
  },
  sheetHandle: {
    width: '40px',
    height: '4px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    alignSelf: 'center',
    marginBottom: '8px',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  optionItemDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 16px',
    borderRadius: '16px',
    background: 'rgba(255,45,85,0.03)',
    border: '1px solid rgba(255,45,85,0.1)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  optionIcon: {
    fontSize: '22px',
  },
  optionIconDanger: {
    fontSize: '22px',
  },
  optionTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  optionLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
  },
  optionLabelDanger: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#FF2D55',
    fontFamily: "'Inter', sans-serif",
  },
  optionSub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '2px',
    fontFamily: "'Inter', sans-serif",
  },
  optionSubDanger: {
    fontSize: '12px',
    color: 'rgba(255,45,85,0.5)',
    marginTop: '2px',
    fontFamily: "'Inter', sans-serif",
  },
  cancelBtn: {
    padding: '16px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
    marginTop: '8px',
  },
  feedbackContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 0',
  },
  feedbackIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(57,255,20,0.1)',
    border: '2px solid #39FF14',
    color: '#39FF14',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
  },
  reportingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sheetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  sheetBackBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '22px',
    cursor: 'pointer',
  },
  sheetTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    fontFamily: "'Outfit', sans-serif",
  },
  reasonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  reasonBtn: {
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: '14px',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
};
