import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Image as ImageIcon, Smile } from 'lucide-react';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function MessagesScreen() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [message, setMessage] = useState('');

  const chatHistory = [
    { id: 1, text: 'E aí, bora treinar hoje?', isSender: false, time: '10:30 AM' },
    { id: 2, text: 'Opa, bora! Qual o treino?', isSender: true, time: '10:32 AM' },
    { id: 3, text: 'Costas e bíceps. Vou colar lá na academia às 18h.', isSender: false, time: '10:33 AM' },
    { id: 4, text: 'Fechou! Nos encontramos lá 🤝', isSender: true, time: '10:35 AM' },
  ];

  return (
    <ScreenWrapper screenKey="messages">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.iconBtn} onClick={() => navigate('profile')}>
            <ArrowLeft size={24} color="#fff" />
          </button>
          <div style={styles.headerUserInfo}>
            <div style={styles.avatar}>
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Avatar" style={styles.avatarImg} />
            </div>
            <div style={styles.headerTitles}>
              <span style={styles.userName}>Jefferson Esmael</span>
              <span style={styles.userStatus}>Online agora</span>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.iconBtn}><Phone size={20} color="#fff" /></button>
            <button style={styles.iconBtn}><Video size={20} color="#fff" /></button>
            <button style={styles.iconBtn}><MoreVertical size={20} color="#fff" /></button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={styles.chatArea}>
          {chatHistory.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                ...styles.messageWrapper,
                justifyContent: msg.isSender ? 'flex-end' : 'flex-start'
              }}
            >
              {!msg.isSender && (
                <div style={styles.messageAvatar}>
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="" style={styles.avatarImg} />
                </div>
              )}
              <div style={{
                ...styles.messageBubble,
                ...(msg.isSender ? styles.senderBubble : styles.receiverBubble)
              }}>
                <p style={styles.messageText}>{msg.text}</p>
                <span style={styles.messageTime}>{msg.time}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          <button style={styles.actionBtn}>
            <ImageIcon size={22} color="#6C6C88" />
          </button>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              style={styles.input}
            />
            <button style={styles.actionBtnInside}>
              <Smile size={20} color="#6C6C88" />
            </button>
          </div>
          <button style={styles.sendBtn}>
            <Send size={20} color="#fff" />
          </button>
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
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    background: 'rgba(10, 10, 15, 0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    zIndex: 10,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    marginLeft: '8px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  userStatus: {
    color: '#39FF14',
    fontSize: '12px',
    fontWeight: 500,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  chatArea: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    width: '100%',
  },
  messageAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '20px',
    position: 'relative',
  },
  senderBubble: {
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    borderBottomRightRadius: '4px',
  },
  receiverBubble: {
    background: 'rgba(255,255,255,0.05)',
    borderBottomLeftRadius: '4px',
  },
  messageText: {
    color: '#fff',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  messageTime: {
    display: 'block',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '4px',
    textAlign: 'right',
  },
  inputArea: {
    padding: '12px 16px',
    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
    background: 'rgba(10, 10, 15, 0.95)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '12px 0',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  actionBtnInside: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
  },
};
