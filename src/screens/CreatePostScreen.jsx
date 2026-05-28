import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, Video, Hash, X, ChevronLeft, Send, Camera, Play, Square, Music, Volume2, ShieldAlert } from 'lucide-react';
import { useFeedStore } from '../stores/feedStore';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

const categories = ['treino', 'dieta', 'evolução', 'rotina', 'desafio', 'humor', 'motivação', 'dicas'];

const MOCK_TRACKS = [
  { id: 'track-1', title: 'Phonk Beast (Hardcore Training Mix)', duration: '2:45', artist: 'FitVerse Originals' },
  { id: 'track-2', title: 'Cyberpunk Shred (Synthwave Gym)', duration: '3:12', artist: 'Neon Beats' },
  { id: 'track-3', title: 'Heavy Duty Lifting (Industrial Metal)', duration: '2:50', artist: 'Iron Empire' },
  { id: 'track-4', title: 'Zen Flow (Yoga & Stretching)', duration: '4:00', artist: 'Mind & Body' },
  { id: 'track-5', title: 'Lo-Fi Cardio (Chill Beats to Run)', duration: '3:35', artist: 'Hype Chill' },
];

export default function CreatePostScreen() {
  const [mode, setMode] = useState('camera'); // 'camera' | 'gallery'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [category, setCategory] = useState('treino');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);

  // Camera recording states
  const [isRecording, setIsRecording] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);

  const { createPost } = useFeedStore();
  const { user, profile } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const goBack = useNavigationStore((s) => s.goBack);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  // Setup camera stream on mode change
  useEffect(() => {
    if (mode === 'camera' && !preview) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode, preview]);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true,
      });
      setCameraStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Permissão de câmera negada ou dispositivo não disponível. Use a Galeria para fazer upload.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Start recording video from feed
  const startRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    setIsRecording(true);

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      let recorder;
      try {
        recorder = new MediaRecorder(cameraStream, options);
      } catch (e) {
        recorder = new MediaRecorder(cameraStream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const recordedFile = new File([blob], `recorded-post-${Date.now()}.webm`, { type: 'video/webm' });
        
        setFile(recordedFile);
        setPreview(URL.createObjectURL(recordedFile));
        setMediaType('video');
        stopCamera();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setMediaType(f.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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

    // Navigate to feed immediately (background upload sync)
    setActiveTab('feed');

    const soundTitle = selectedTrack ? selectedTrack.title : null;

    // Start background upload
    createPost(file, {
      userId: user.uid,
      username: profile?.username || 'user',
      displayName: profile?.display_name || 'Usuário',
      userAvatar: profile?.avatar_url || '',
      caption: caption + (soundTitle ? ` 🎵 Áudio: ${soundTitle}` : ''),
      hashtags,
      category,
    }).then((result) => {
      if (!result.success) {
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

        {/* Audio selector button at the top */}
        {!preview && (
          <motion.button
            style={{
              ...styles.audioSelectBtn,
              background: selectedTrack ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.05)',
              borderColor: selectedTrack ? '#39FF14' : 'rgba(255,255,255,0.1)',
            }}
            onClick={() => setShowMusicSelector(true)}
            whileTap={{ scale: 0.97 }}
          >
            <Music size={16} color={selectedTrack ? '#39FF14' : '#fff'} />
            <span style={{ ...styles.audioText, color: selectedTrack ? '#39FF14' : '#fff' }}>
              {selectedTrack ? selectedTrack.title : 'Adicionar Trilha / Som Fitness'}
            </span>
            {selectedTrack && <Volume2 size={16} color="#39FF14" />}
          </motion.button>
        )}

        {/* Segmented Mode Selector */}
        {!preview && (
          <div style={styles.modeTabs}>
            <button
              style={{ ...styles.modeTab, ...(mode === 'camera' ? styles.modeTabActive : {}) }}
              onClick={() => setMode('camera')}
            >
              <Camera size={16} /> Gravar Câmera
            </button>
            <button
              style={{ ...styles.modeTab, ...(mode === 'gallery' ? styles.modeTabActive : {}) }}
              onClick={() => setMode('gallery')}
            >
              <Upload size={16} /> Fazer Upload
            </button>
          </div>
        )}

        {/* Content Preview/Input Area */}
        {preview ? (
          /* Locked Content Preview */
          <div style={styles.previewWrap}>
            {mediaType === 'video' ? (
              <video src={preview} style={styles.previewMedia} controls playsInline />
            ) : (
              <img src={preview} alt="Preview" style={styles.previewMedia} />
            )}
            <button
              style={styles.removeBtn}
              onClick={() => {
                setFile(null);
                setPreview(null);
                setMediaType(null);
              }}
            >
              <X size={18} color="#fff" />
            </button>
            {selectedTrack && (
              <div style={styles.audioBadge}>
                <Music size={12} color="#39FF14" />
                <span style={styles.audioBadgeText}>{selectedTrack.title}</span>
              </div>
            )}
            <div style={styles.mediaTypeBadge}>
              {mediaType === 'video' ? <Video size={14} color="#fff" /> : <ImageIcon size={14} color="#fff" />}
              <span style={styles.mediaTypeText}>{mediaType === 'video' ? 'Vídeo' : 'Foto'}</span>
            </div>
          </div>
        ) : mode === 'camera' ? (
          /* Active Camera Mode View */
          <div style={styles.cameraFrame}>
            {cameraError ? (
              <div style={styles.cameraErrorWrap}>
                <ShieldAlert size={40} color="#FF9500" />
                <span style={styles.cameraErrorText}>{cameraError}</span>
                <motion.button
                  style={styles.fallbackToGalleryBtn}
                  onClick={() => setMode('gallery')}
                  whileTap={{ scale: 0.97 }}
                >
                  Ir para Fazer Upload
                </motion.button>
              </div>
            ) : (
              <>
                <video ref={videoPreviewRef} style={styles.cameraVideo} autoPlay playsInline muted />

                {/* Overlays */}
                {isRecording && (
                  <div style={styles.recIndicator}>
                    <div style={styles.recDot} />
                    <span>REC {formatTime(recordingSeconds)}</span>
                  </div>
                )}

                {/* Floating control buttons */}
                <div style={styles.cameraControls}>
                  {!isRecording ? (
                    <motion.button
                      style={styles.recordBtnStart}
                      onClick={startRecording}
                      whileTap={{ scale: 0.9 }}
                    >
                      <div style={styles.recordBtnInner} />
                    </motion.button>
                  ) : (
                    <motion.button
                      style={styles.recordBtnStop}
                      onClick={stopRecording}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Square size={20} color="#fff" fill="#fff" />
                    </motion.button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Gallery Mode Picker Area */
          <motion.div
            style={styles.uploadArea}
            onClick={() => fileRef.current?.click()}
            whileHover={{ borderColor: 'rgba(0,212,255,0.4)', background: 'rgba(0,212,255,0.06)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload size={40} color="#00D4FF" />
            <span style={styles.uploadTitle}>Selecionar da Galeria</span>
            <span style={styles.uploadDesc}>Fotos ou Vídeos • JPG, PNG, MP4, MOV</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </motion.div>
        )}

        {/* Caption */}
        <div style={styles.field}>
          <label style={styles.label}>Legenda</label>
          <textarea
            style={styles.textarea}
            placeholder="Descreva seu post e treinos..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
          />
          <div style={styles.fieldBottomRow}>
            {selectedTrack && <span style={styles.attachedMusicInfo}>🎵 Trilha: {selectedTrack.title}</span>}
            <span style={styles.charCount}>{caption.length}/300</span>
          </div>
        </div>

        {/* Hashtags */}
        <div style={styles.field}>
          <label style={styles.label}>Hashtags</label>
          <div style={styles.hashtagInput}>
            <Hash size={16} color="#6C6C88" />
            <input
              style={styles.input}
              placeholder="Adicionar hashtag (pressione Enter)"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            />
          </div>
          <div style={styles.chipRow}>
            {hashtags.map((t) => (
              <span key={t} style={styles.chip}>
                #{t} <X size={12} onClick={() => removeHashtag(t)} style={{ cursor: 'pointer', marginLeft: 4 }} />
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

        {/* Music selector slider sheet */}
        <AnimatePresence>
          {showMusicSelector && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                style={styles.sheetBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMusicSelector(false)}
              />

              {/* Slider Sheet */}
              <motion.div
                style={styles.sheet}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              >
                <div style={styles.sheetHeader}>
                  <div style={styles.sheetHandle} />
                  <div style={styles.sheetTitleRow}>
                    <Music size={18} color="#00D4FF" />
                    <h3 style={styles.sheetTitle}>Trilhas Sonoras Fitness</h3>
                  </div>
                  <button style={styles.sheetCloseBtn} onClick={() => setShowMusicSelector(false)}>
                    <X size={20} color="#fff" />
                  </button>
                </div>

                <div style={styles.sheetList}>
                  {MOCK_TRACKS.map((track) => {
                    const isSelected = selectedTrack?.id === track.id;
                    return (
                      <motion.div
                        key={track.id}
                        style={{
                          ...styles.trackRow,
                          background: isSelected ? 'rgba(0,212,255,0.06)' : 'transparent',
                          borderColor: isSelected ? '#00D4FF' : 'rgba(255,255,255,0.05)',
                        }}
                        onClick={() => {
                          setSelectedTrack(isSelected ? null : track);
                          setShowMusicSelector(false);
                        }}
                        whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div style={styles.trackInfo}>
                          <span style={{ ...styles.trackTitle, color: isSelected ? '#00D4FF' : '#fff' }}>
                            {track.title}
                          </span>
                          <span style={styles.trackArtist}>{track.artist}</span>
                        </div>
                        <div style={styles.trackRight}>
                          <span style={styles.trackTime}>{track.duration}</span>
                          {isSelected && <Volume2 size={16} color="#00D4FF" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '60px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  postBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #00D4FF, #0088CC)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  audioSelectBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontFamily: "'Inter', sans-serif", backdropFilter: 'blur(30px)', marginBottom: '16px', transition: 'all 0.2s ease' },
  audioText: { fontSize: '13px', fontWeight: 600, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  modeTabs: { display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '4px', gap: '4px', marginBottom: '16px' },
  modeTab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', border: 'none', background: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", borderRadius: '10px', transition: 'all 0.2s' },
  modeTabActive: { background: 'rgba(255,255,255,0.08)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' },
  cameraFrame: { width: '100%', aspectRatio: '4/3', borderRadius: '20px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' },
  cameraVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  cameraErrorWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center' },
  cameraErrorText: { fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' },
  fallbackToGalleryBtn: { padding: '10px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginTop: '8px' },
  recIndicator: { position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: 'rgba(0,0,0,0.6)', color: '#FF2D55', fontSize: '12px', fontWeight: 700, fontFamily: "'Inter', sans-serif", border: '1px solid rgba(255,45,85,0.2)' },
  recDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#FF2D55', animation: 'pulse 1s infinite alternate' },
  cameraControls: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  recordBtnStart: { width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer' },
  recordBtnInner: { width: '48px', height: '48px', borderRadius: '50%', background: '#FF2D55' },
  recordBtnStop: { width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FF2D55', cursor: 'pointer' },
  uploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '56px 24px', border: '2px dashed rgba(0,212,255,0.2)', borderRadius: '20px', background: 'rgba(0,212,255,0.04)', cursor: 'pointer', marginBottom: '20px', transition: 'all 0.2s ease' },
  uploadTitle: { fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" },
  uploadDesc: { fontSize: '13px', color: '#6C6C88' },
  previewWrap: { position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', maxHeight: '300px', border: '1px solid rgba(255,255,255,0.08)' },
  previewMedia: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '16px', display: 'block' },
  removeBtn: { position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mediaTypeBadge: { position: 'absolute', top: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' },
  mediaTypeText: { fontSize: '11px', color: '#fff', fontWeight: 600 },
  audioBadge: { position: 'absolute', bottom: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', maxWidth: '80%' },
  audioBadgeText: { fontSize: '11px', color: '#39FF14', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#B0B0C8', marginBottom: '8px', fontFamily: "'Inter', sans-serif" },
  textarea: { width: '100%', minHeight: '80px', padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'none' },
  fieldBottomRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' },
  attachedMusicInfo: { fontSize: '12px', color: '#39FF14', fontWeight: 500 },
  charCount: { fontSize: '12px', color: '#6C6C88', marginLeft: 'auto' },
  hashtagInput: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' },
  input: { flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif" },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: '12px', fontWeight: 600 },
  catRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  catChip: { padding: '6px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6C6C88', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif", textTransform: 'capitalize' },
  catChipActive: { background: 'rgba(0,212,255,0.12)', color: '#00D4FF', borderColor: 'rgba(0,212,255,0.25)' },
  // Sheet
  sheetBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998, backdropFilter: 'blur(4px)' },
  sheet: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', background: 'rgba(10,10,15,0.96)', borderTop: '1px solid rgba(0,212,255,0.2)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '20px', zIndex: 99999, backdropFilter: 'blur(40px) saturate(180%)', maxHeight: '75vh', display: 'flex', flexDirection: 'column', gap: '16px' },
  sheetHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', position: 'relative' },
  sheetHandle: { position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' },
  sheetTitleRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  sheetTitle: { fontSize: '17px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  sheetCloseBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  sheetList: { display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 },
  trackRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s' },
  trackInfo: { display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 },
  trackTitle: { fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" },
  trackArtist: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" },
  trackRight: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' },
  trackTime: { fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" },
};
