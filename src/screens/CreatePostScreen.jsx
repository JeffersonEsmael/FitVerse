import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Video, Hash, X, ChevronLeft, Send } from 'lucide-react';
import { useFeedStore } from '../stores/feedStore';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

const categories = ['treino', 'dieta', 'evolução', 'rotina', 'desafio', 'humor', 'motivação', 'dicas'];

export default function CreatePostScreen() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [category, setCategory] = useState('treino');
  const fileRef = useRef(null);

  const { createPost } = useFeedStore();
  const { user, profile } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const goBack = useNavigationStore((s) => s.goBack);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setMediaType(f.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace('#', '');
    if (tag && !hashtags.includes(tag) && hashtags.length < 8) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handlePost = () => {
    if (!file) return;

    if (!user?.uid) {
      alert('Você precisa estar logado para postar.');
      return;
    }

    // ── 1. Navigate to feed IMMEDIATELY ──────────────────────────
    // The user sees the feed at once; upload happens in the background.
    setActiveTab('feed');

    // ── 2. Start upload in background (fire-and-forget) ──────────
    // createPost updates feedStore.uploadingPost so FeedScreen shows a progress banner.
    createPost(file, {
      userId: user.uid,
      username: profile?.username || 'user',
      displayName: profile?.display_name || 'Usuário',
      userAvatar: profile?.avatar_url || '',
      caption,
      hashtags,
      category,
    }).then((result) => {
      if (!result.success) {
        // feedStore already set uploadError which FeedScreen will show
        console.error('[CreatePost] Upload failed:', result.error);
      }
    });
  };

  return (
    <ScreenWrapper screenKey="create">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => goBack()}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Novo Post</h2>
          <motion.button
            style={{ ...styles.postBtn, opacity: file ? 1 : 0.4 }}
            onClick={handlePost}
            disabled={!file}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={16} /> Postar
          </motion.button>
        </div>

        {/* Upload area */}
        {!preview ? (
          <motion.div
            style={styles.uploadArea}
            onClick={() => fileRef.current?.click()}
            whileHover={{ borderColor: 'rgba(0,212,255,0.4)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload size={40} color="#00D4FF" />
            <span style={styles.uploadTitle}>Selecionar Mídia</span>
            <span style={styles.uploadDesc}>Fotos ou Vídeos • JPG, PNG, MP4, MOV</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </motion.div>
        ) : (
          <div style={styles.previewWrap}>
            {mediaType === 'video' ? (
              <video src={preview} style={styles.previewMedia} controls playsInline />
            ) : (
              <img src={preview} alt="Preview" style={styles.previewMedia} />
            )}
            <button
              style={styles.removeBtn}
              onClick={() => { setFile(null); setPreview(null); setMediaType(null); }}
            >
              <X size={18} color="#fff" />
            </button>
            <div style={styles.mediaTypeBadge}>
              {mediaType === 'video' ? <Video size={14} color="#fff" /> : <ImageIcon size={14} color="#fff" />}
              <span style={styles.mediaTypeText}>{mediaType === 'video' ? 'Vídeo' : 'Foto'}</span>
            </div>
          </div>
        )}

        {/* Caption */}
        <div style={styles.field}>
          <label style={styles.label}>Legenda</label>
          <textarea
            style={styles.textarea}
            placeholder="Descreva seu post..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
          />
          <span style={styles.charCount}>{caption.length}/300</span>
        </div>

        {/* Hashtags */}
        <div style={styles.field}>
          <label style={styles.label}>Hashtags</label>
          <div style={styles.hashtagInput}>
            <Hash size={16} color="#6C6C88" />
            <input
              style={styles.input}
              placeholder="Adicionar hashtag"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            />
          </div>
          <div style={styles.chipRow}>
            {hashtags.map((t) => (
              <span key={t} style={styles.chip}>
                #{t} <X size={12} onClick={() => removeHashtag(t)} style={{ cursor: 'pointer' }} />
              </span>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={styles.field}>
          <label style={styles.label}>Categoria</label>
          <div style={styles.catRow}>
            {categories.map((c) => (
              <button
                key={c}
                style={{ ...styles.catChip, ...(category === c ? styles.catChipActive : {}) }}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  postBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #00D4FF, #0088CC)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  uploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '48px 24px', border: '2px dashed rgba(0,212,255,0.2)', borderRadius: '20px', background: 'rgba(0,212,255,0.04)', cursor: 'pointer', marginBottom: '20px' },
  uploadTitle: { fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" },
  uploadDesc: { fontSize: '13px', color: '#6C6C88' },
  previewWrap: { position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', maxHeight: '300px' },
  previewMedia: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '16px', display: 'block' },
  removeBtn: { position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mediaTypeBadge: { position: 'absolute', top: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' },
  mediaTypeText: { fontSize: '11px', color: '#fff', fontWeight: 600 },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#B0B0C8', marginBottom: '8px', fontFamily: "'Inter', sans-serif" },
  textarea: { width: '100%', minHeight: '80px', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'none' },
  charCount: { display: 'block', textAlign: 'right', fontSize: '12px', color: '#6C6C88', marginTop: '4px' },
  hashtagInput: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' },
  input: { flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif" },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: '12px', fontWeight: 600 },
  catRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  catChip: { padding: '6px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6C6C88', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif", textTransform: 'capitalize' },
  catChipActive: { background: 'rgba(0,212,255,0.12)', color: '#00D4FF', borderColor: 'rgba(0,212,255,0.25)' },
};
