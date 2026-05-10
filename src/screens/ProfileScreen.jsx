import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Grid3x3, Bookmark, Award, Flame, Users, Heart, Video, LogOut, ChevronRight, ScanLine, Bell } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import GymBagIcon from '../components/icons/GymBagIcon';
import ShapeIcon from '../components/icons/ShapeIcon';

function StatBox({ label, value, icon: Icon, color, onClick }) {
  return (
    <motion.div style={{...statStyles.box, cursor: onClick ? 'pointer' : 'default'}} whileTap={{ scale: 0.95 }} onClick={onClick}>
      <Icon size={16} color={color} />
      <span style={{ ...statStyles.value, color }}>{value}</span>
      <span style={statStyles.label}>{label}</span>
    </motion.div>
  );
}

export default function ProfileScreen() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const handleLogout = () => {
    logout();
    navigate('auth');
  };

  const p = profile || {};

  return (
    <ScreenWrapper screenKey="profile">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Perfil</h2>
          <button style={styles.settingsBtn} onClick={() => {}}>
            <Settings size={22} color="#B0B0C8" />
          </button>
        </div>

        {/* Profile card */}
        <motion.div style={styles.profileCard} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div style={styles.profileHeader}>
            <div style={styles.leftInfo}>
              <h3 style={styles.username}>{p.username || 'jeffersonesmael'}</h3>
              <span style={styles.displayName}>{p.displayName || 'Jefferson Esmael'}</span>
              
              <div style={styles.statsRow}>
                <div style={styles.statItemInline}>
                  <span style={styles.statValueInline}>{p.totalVideos || 0}</span>
                  <span style={styles.statLabelInline}>posts</span>
                </div>
                <div style={styles.statItemInline}>
                  <span style={styles.statValueInline}>{p.followers || 0}</span>
                  <span style={styles.statLabelInline}>seguidores</span>
                </div>
                <div style={styles.statItemInline}>
                  <span style={styles.statValueInline}>{p.following || 0}</span>
                  <span style={styles.statLabelInline}>seguindo</span>
                </div>
              </div>

              {p.bio && <p style={styles.bio}>{p.bio}</p>}
              {p.fitnessGoals?.length > 0 && (
                <div style={styles.goals}>
                  {p.fitnessGoals.map((g) => (
                    <span key={g} style={styles.goalChip}>{g}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.avatarSection}>
              <div style={styles.avatar}>
                {p.photoURL ? <img src={p.photoURL} alt="" style={styles.avatarImg} /> : (
                  <div style={styles.avatarPlaceholder}>{p.displayName?.charAt(0) || '?'}</div>
                )}
              </div>
              <div style={styles.levelBadge}>Lv.{p.level || 1}</div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <StatBox label="Streak" value={`${p.streak || 0}d`} icon={Flame} color="#FF6B35" />
          <StatBox label="Notificações" value="Avisos" icon={Bell} color="#FFD700" onClick={() => navigate('notifications')} />
          <StatBox label="Shapes" value={p.totalShapes || p.totalLikes || 0} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
        </div>

        {/* Quick access */}
        <div style={styles.quickAccess}>
          <motion.button
            style={styles.quickBtn}
            onClick={() => navigate('nutriscan')}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ ...styles.quickIcon, background: 'rgba(57,255,20,0.12)' }}>
              <ScanLine size={20} color="#39FF14" />
            </div>
            <div style={styles.quickInfo}>
              <span style={styles.quickTitle}>NutriScan</span>
              <span style={styles.quickDesc}>Escanear refeição com IA</span>
            </div>
            <ChevronRight size={16} color="#6C6C88" />
          </motion.button>
        </div>

        {/* Content tabs */}
        <div style={styles.contentTabs}>
          <button style={{ ...styles.contentTab, ...styles.contentTabActive }}>
            <Grid3x3 size={18} /> Vídeos
          </button>
          <button style={styles.contentTab}>
            <GymBagIcon filled={false} size={18} color="#6C6C88" /> Gym Bag
          </button>
          <button style={styles.contentTab}>
            <Award size={18} /> Badges
          </button>
        </div>

        {/* Video grid placeholder */}
        <div style={styles.videoGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              style={styles.videoThumb}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <div style={styles.videoOverlay}>
                <span style={styles.videoViews}>▶ {Math.floor(Math.random() * 9 + 1)}K</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Logout */}
        <motion.button style={styles.logoutBtn} onClick={handleLogout} whileTap={{ scale: 0.97 }}>
          <LogOut size={18} color="#FF2D55" />
          <span>Sair da conta</span>
          <ChevronRight size={16} color="#6C6C88" />
        </motion.button>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  settingsBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  profileCard: {
    padding: '0 0 16px 0',
    marginBottom: '16px',
  },
  profileHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  leftInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    paddingRight: '16px',
    alignItems: 'flex-start'
  },
  username: { fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: '0 0 4px' },
  displayName: { fontSize: '14px', color: '#fff', marginBottom: '12px' },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px'
  },
  statItemInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  statValueInline: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  statLabelInline: {
    fontSize: '14px',
    color: '#B0B0C8',
  },
  avatarSection: { position: 'relative', flexShrink: 0 },
  avatar: { width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #00D4FF', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,212,255,0.3)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '32px', fontFamily: "'Outfit', sans-serif" },
  levelBadge: { position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', borderRadius: '9999px', background: 'linear-gradient(135deg, #00D4FF, #0088CC)', color: '#fff', fontSize: '11px', fontWeight: 700, border: '2px solid #0A0A0F' },
  bio: { fontSize: '14px', color: '#B0B0C8', textAlign: 'left', lineHeight: '1.4', margin: '0 0 10px', maxWidth: '100%' },
  goals: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', justifyContent: 'flex-start' },
  goalChip: { padding: '4px 12px', borderRadius: '9999px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(0,212,255,0.15)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' },
  quickAccess: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  quickIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quickInfo: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' },
  quickTitle: { fontSize: '14px', fontWeight: 600, color: '#fff' },
  quickDesc: { fontSize: '12px', color: '#6C6C88' },
  contentTabs: { display: 'flex', gap: '4px', marginBottom: '12px' },
  contentTab: { flex: 1, padding: '10px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#6C6C88', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'Inter', sans-serif" },
  contentTabActive: { background: 'rgba(0,212,255,0.1)', color: '#00D4FF', borderColor: 'rgba(0,212,255,0.2)' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '20px' },
  videoThumb: { aspectRatio: '9/16', borderRadius: '8px', background: 'linear-gradient(180deg, #1A1A2E, #22223A)', position: 'relative', overflow: 'hidden' },
  videoOverlay: { position: 'absolute', bottom: '6px', left: '6px' },
  videoViews: { fontSize: '11px', color: '#fff', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.1)', color: '#FF2D55', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginBottom: '32px' },
};

const statStyles = {
  box: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' },
  value: { fontSize: '18px', fontWeight: 800, fontFamily: "'Outfit', sans-serif" },
  label: { fontSize: '11px', color: '#6C6C88', fontWeight: 500 },
};
