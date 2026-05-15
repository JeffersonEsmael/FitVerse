import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const { messages, fetchMessages, sendMessage, uploadChatImage, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { screenParams, goBack } = useNavigationStore();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationId = screenParams?.conversationId;
  const otherUser = screenParams?.otherUser || { display_name: 'Usuário', avatar_url: '' };

  // Load messages and subscribe to realtime
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
      subscribeToMessages(conversationId);
    }
    return () => unsubscribeFromMessages();
  }, [conversationId, fetchMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || !user?.uid) return;
    setIsSending(true);
    setText('');
    await sendMessage(conversationId, user.uid, trimmed);
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid || !conversationId) return;
    setIsSending(true);
    const imageUrl = await uploadChatImage(file, user.uid);
    if (imageUrl) {
      await sendMessage(conversationId, user.uid, '', imageUrl);
    }
    setIsSending(false);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScreenWrapper screenKey="messages" noPadding>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.iconBtn} onClick={goBack}>
            <ArrowLeft size={24} color="#fff" />
          </button>
          <div style={styles.headerUserInfo}>
            <div style={styles.avatar}>
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {otherUser.display_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div style={styles.headerTitles}>
              <span style={styles.userName}>{otherUser.display_name}</span>
              <span style={styles.userHandle}>@{otherUser.username || 'user'}</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div style={styles.chatArea}>
          {messages.length === 0 && (
            <div style={styles.emptyChat}>
              <span style={styles.emptyChatText}>Envie a primeira mensagem! 💬</span>
            </div>
          )}
          {messages.map((msg) => {
            const isSender = msg.senderId === user?.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  ...styles.messageWrapper,
                  justifyContent: isSender ? 'flex-end' : 'flex-start',
                }}
              >
                {!isSender && (
                  <div style={styles.messageAvatar}>
                    {otherUser.avatar_url ? (
                      <img src={otherUser.avatar_url} alt="" style={styles.avatarImg} />
                    ) : (
                      <div style={styles.avatarPlaceholderSmall}>
                        {otherUser.display_name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                )}
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(isSender ? styles.senderBubble : styles.receiverBubble),
                  }}
                >
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="" style={styles.chatImage} />
                  )}
                  {msg.content && <p style={styles.messageText}>{msg.content}</p>}
                  <span style={styles.messageTime}>{formatTime(msg.createdAt)}</span>
                </div>
              </motion.div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          <button style={styles.actionBtn} onClick={() => fileInputRef.current?.click()}>
            <ImageIcon size={22} color="#6C6C88" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              style={styles.input}
              disabled={isSending}
            />
          </div>
          <button style={styles.sendBtn} onClick={handleSend} disabled={isSending || !text.trim()}>
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
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: '16px',
    fontFamily: "'Outfit', sans-serif",
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
  userHandle: {
    color: '#6C6C88',
    fontSize: '12px',
    fontWeight: 500,
  },
  chatArea: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyChat: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: '40px',
  },
  emptyChatText: {
    fontSize: '14px',
    color: '#6C6C88',
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
  avatarPlaceholderSmall: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '11px',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '18px',
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
  chatImage: {
    maxWidth: '200px',
    maxHeight: '200px',
    borderRadius: '12px',
    objectFit: 'cover',
    marginBottom: '4px',
    display: 'block',
  },
  messageText: {
    color: '#fff',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    wordBreak: 'break-word',
  },
  messageTime: {
    display: 'block',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
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
    opacity: 1,
  },
};
