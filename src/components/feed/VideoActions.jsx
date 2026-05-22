import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Forward, Music, FileText } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import { useNavigationStore } from '../../stores/navigationStore';

// Custom Icons
import ShapeIcon from '../icons/ShapeIcon';
import BoostIcon from '../icons/BoostIcon';
import GymBagIcon from '../icons/GymBagIcon';

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const InteractionBtn = ({ icon, label, onClick, isActive, activeColor, type }) => {
  const [animKey, setAnimKey] = useState(0);

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(e);
    setAnimKey(prev => prev + 1);
  };

  // Define the pulse animation based on the action type
  const getPulseAnim = () => {
    if (!isActive) return {};
    switch(type) {
      case 'shape':
        return { scale: [1, 1.4, 0.9, 1.1, 1], rotate: [0, -15, 15, -5, 0] };
      case 'boost':
        return { scale: [1, 1.5, 1], rotate: [0, 10, -10, 0], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] };
      case 'gymbag':
      case 'save':
        return { scale: [1, 1.2, 0.9, 1], y: [0, -10, 0] };
      default:
        return { scale: [1, 1.3, 1] };
    }
  };

  return (
    <motion.button
      style={styles.actionBtn}
      onClick={handleClick}
      whileTap={{ scale: 0.8 }}
    >
      <motion.div
        key={animKey}
        initial={{ scale: 1 }}
        animate={getPulseAnim()}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {icon}
      </motion.div>
      {label !== '' && <span style={{...styles.actionCount, color: isActive ? activeColor : '#fff'}}>{label}</span>}
    </motion.button>
  );
};

export default function VideoActions({ video, isFollowing, isSelf, onFollowToggle }) {
  const { toggleShape, toggleBoost, toggleGymBag } = useFeedStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const handleShape = (e) => {
    toggleShape(video.id);
  };

  const handleBoost = (e) => {
    toggleBoost(video.id);
  };

  const handleGymBag = (e) => {
    toggleGymBag(video.id);
  };

  const handleShare = (e) => {
    e.stopPropagation();
  };

  const handleComment = (e) => {
    e.stopPropagation();
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (video.userId) {
      navigate('public_profile', { params: { userId: video.userId } });
    }
  };

  return (
    <div style={styles.container}>
      {/* Avatar */}
      <motion.div style={styles.avatarWrap} whileTap={{ scale: 0.9 }} onClick={handleAvatarClick}>
        <div style={styles.avatar}>
          {video.userAvatar ? (
            <img src={video.userAvatar} alt="" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {video.displayName?.charAt(0) || '?'}
            </div>
          )}
        </div>
        {!isSelf && !isFollowing && (
          <div style={styles.followBadge} onClick={(e) => { e.stopPropagation(); onFollowToggle(e); }}>+</div>
        )}
      </motion.div>

      {/* Shape (Replaces Like) */}
      <InteractionBtn 
        type="shape"
        icon={<ShapeIcon filled={video.hasShaped} size={30} />}
        label={formatCount(video.shapes)}
        onClick={handleShape}
        isActive={video.hasShaped}
        activeColor="#39FF14"
      />

      {/* Comment */}
      <InteractionBtn 
        type="comment"
        icon={<MessageCircle size={28} color="#fff" strokeWidth={2} />}
        label={formatCount(video.comments)}
        onClick={handleComment}
        isActive={false}
      />

      {/* Boost (New interaction) */}
      <InteractionBtn 
        type="boost"
        icon={
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BoostIcon filled={video.hasBoosted} size={30} />
            {!video.hasBoosted && (
              <span style={{
                position: 'absolute',
                fontSize: '9px',
                fontWeight: 900,
                color: '#fff',
                textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.8)',
                letterSpacing: '0.5px'
              }}>
                BOOST
              </span>
            )}
          </div>
        }
        label={video.hasBoosted ? formatCount(video.boosts) : ''}
        onClick={handleBoost}
        isActive={video.hasBoosted}
        activeColor="#FFD700"
      />

      {/* Save (Notes emoji) */}
      <InteractionBtn 
        type="save"
        icon={<FileText size={28} color={video.inGymBag ? "#00D4FF" : "#fff"} fill={video.inGymBag ? "rgba(0,212,255,0.4)" : "none"} strokeWidth={2} />}
        label={video.gym_bag_saves > 0 ? formatCount(video.gym_bag_saves) : 'Salvar'}
        onClick={handleGymBag}
        isActive={video.inGymBag}
        activeColor="#00D4FF"
      />

      {/* Share */}
      <InteractionBtn 
        type="share"
        icon={<Forward size={26} color="#fff" strokeWidth={2} />}
        label={formatCount(video.shares)}
        onClick={handleShare}
        isActive={false}
      />

      {/* Music disc */}
      <motion.div
        style={styles.musicDisc}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
      >
        <Music size={14} color="#fff" />
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    right: '12px',
    bottom: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '18px',
    zIndex: 5,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid #fff',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '18px',
    fontFamily: "'Outfit', sans-serif",
  },
  followBadge: {
    position: 'absolute',
    bottom: '-6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#39FF14',
    color: '#000',
    fontSize: '14px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #000',
  },
  actionBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    WebkitTapHighlightColor: 'transparent',
  },
  actionCount: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    transition: 'color 0.2s ease',
  },
  musicDisc: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #333, #111)',
    border: '3px solid #555',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '4px',
  },
};
