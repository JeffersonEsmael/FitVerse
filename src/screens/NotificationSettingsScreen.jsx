import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Bell, Heart, MessageCircle, AtSign, UserPlus, ShieldAlert } from 'lucide-react';
import { useNavigationStore } from '../stores/navigationStore';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';

function CustomSwitch({ active, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        ...styles.switchTrack,
        backgroundColor: active ? '#39FF14' : 'rgba(255,255,255,0.08)',
        borderColor: active ? '#39FF14' : 'rgba(255,255,255,0.15)',
      }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          ...styles.switchThumb,
          backgroundColor: active ? '#0A0A0F' : '#6C6C88',
          x: active ? 22 : 0,
        }}
      />
    </div>
  );
}

function PreferenceRow({ title, description, icon: Icon, active, onToggle, customIcon }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLeft}>
        <div style={styles.iconWrap}>
          {customIcon ? (
            customIcon
          ) : (
            <Icon size={18} color="rgba(255,255,255,0.7)" />
          )}
        </div>
        <div style={styles.info}>
          <span style={styles.rowTitle}>{title}</span>
          <span style={styles.rowDesc}>{description}</span>
        </div>
      </div>
      <CustomSwitch active={active} onToggle={onToggle} />
    </div>
  );
}

export default function NotificationSettingsScreen() {
  const navigate = useNavigationStore((s) => s.navigate);
  const { settings, toggleSetting } = useNotificationSettingsStore();

  return (
    <ScreenWrapper screenKey="notification_settings">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('settings')}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Preferências de Notificação</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          <p style={styles.sectionHeader}>Notificações Push</p>

          <div style={styles.card}>
            <PreferenceRow
              title="Novos Seguidores"
              description="Quando alguém começar a seguir você"
              icon={UserPlus}
              active={settings.followers}
              onToggle={() => toggleSetting('followers')}
            />

            <div style={styles.divider} />

            <PreferenceRow
              title="Shapes (Músculos 💪)"
              description="Quando alguém der Shape no seu post"
              customIcon={<ShapeIcon size={18} color="rgba(255,255,255,0.7)" filled={true} />}
              active={settings.shapes}
              onToggle={() => toggleSetting('shapes')}
            />

            <div style={styles.divider} />

            <PreferenceRow
              title="Comentários"
              description="Quando alguém comentar no seu post"
              icon={MessageCircle}
              active={settings.comments}
              onToggle={() => toggleSetting('comments')}
            />

            <div style={styles.divider} />

            <PreferenceRow
              title="Mensagens Diretas"
              description="Quando alguém enviar uma mensagem de chat"
              icon={Heart}
              active={settings.messages}
              onToggle={() => toggleSetting('messages')}
            />

            <div style={styles.divider} />

            <PreferenceRow
              title="Menções"
              description="Quando alguém te marcar em um comentário"
              icon={AtSign}
              active={settings.mentions}
              onToggle={() => toggleSetting('mentions')}
            />
          </div>

          <div style={styles.warningBox}>
            <ShieldAlert size={18} color="#FF9500" style={{ flexShrink: 0 }} />
            <span style={styles.warningText}>
              A desativação dessas notificações impedirá o recebimento de alertas push, mas você ainda poderá vê-las na aba de Notificações.
            </span>
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0A0A0F',
    color: '#fff',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  content: {
    flex: 1,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sectionHeader: {
    fontSize: '14px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '1px',
    margin: '0 0 12px 6px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    marginBottom: '20px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  rowTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  rowDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.4',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  switchTrack: {
    width: '46px',
    height: '24px',
    borderRadius: '12px',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  switchThumb: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  warningBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderRadius: '20px',
    background: 'rgba(255,149,0,0.05)',
    border: '1px solid rgba(255,149,0,0.15)',
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: '13px',
    color: '#FF9500',
    lineHeight: '1.5',
    fontFamily: "'Inter', sans-serif",
  },
};
