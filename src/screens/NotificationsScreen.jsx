import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, Trophy, Award, ShoppingBag, Bell } from 'lucide-react';
import ScreenWrapper from '../components/layout/ScreenWrapper';

const sampleNotifs = [
  { id: 1, type: 'like', user: 'fitpro_lucas', text: 'curtiu seu vídeo', time: '2min', icon: Heart, color: '#FF2D55' },
  { id: 2, type: 'comment', user: 'nutri_ana', text: 'comentou: "Incrível! 💪"', time: '15min', icon: MessageCircle, color: '#00D4FF' },
  { id: 3, type: 'follow', user: 'gym_rafael', text: 'começou a te seguir', time: '1h', icon: UserPlus, color: '#A855F7' },
  { id: 4, type: 'ranking', user: 'Sistema', text: 'Você subiu para #5 no ranking!', time: '2h', icon: Trophy, color: '#FFD700' },
  { id: 5, type: 'badge', user: 'Sistema', text: 'Nova conquista: Streak de 7 dias! 🔥', time: '3h', icon: Award, color: '#FF6B35' },
  { id: 6, type: 'like', user: 'coach_maria', text: 'curtiu seu vídeo', time: '4h', icon: Heart, color: '#FF2D55' },
  { id: 7, type: 'comment', user: 'fit_pedro', text: 'comentou: "Monstro!"', time: '5h', icon: MessageCircle, color: '#00D4FF' },
  { id: 8, type: 'follow', user: 'julia_fit', text: 'começou a te seguir', time: '6h', icon: UserPlus, color: '#A855F7' },
];

export default function NotificationsScreen() {
  return (
    <ScreenWrapper screenKey="notifications">
      <div style={styles.container}>
        <div style={styles.header}>
          <Bell size={22} color="#FFD700" />
          <h2 style={styles.title}>Notificações</h2>
        </div>

        <div style={styles.section}>
          <span style={styles.sectionLabel}>Recentes</span>
          {sampleNotifs.map((notif, i) => {
            const Icon = notif.icon;
            return (
              <motion.div
                key={notif.id}
                style={styles.notifRow}
                initial={{ x: -15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <div style={{ ...styles.iconWrap, background: `${notif.color}15` }}>
                  <Icon size={18} color={notif.color} />
                </div>
                <div style={styles.info}>
                  <span style={styles.text}>
                    <strong style={styles.username}>{notif.user}</strong> {notif.text}
                  </span>
                  <span style={styles.time}>{notif.time}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  section: { marginBottom: '24px' },
  sectionLabel: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#6C6C88', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  notifRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', marginBottom: '6px', cursor: 'pointer' },
  iconWrap: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  text: { fontSize: '14px', color: '#B0B0C8', lineHeight: '1.3', fontFamily: "'Inter', sans-serif" },
  username: { color: '#fff', fontWeight: 600 },
  time: { fontSize: '12px', color: '#6C6C88' },
};
