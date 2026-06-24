import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, Video, Hash, X, ChevronLeft, Send, Camera, Play, Square, Music, Volume2, ShieldAlert, Trophy, PlusCircle } from 'lucide-react';
import { useFeedStore } from '../stores/feedStore';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useRankingStore } from '../stores/rankingStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

const categories = ['treino', 'dieta', 'evolução', 'rotina', 'desafio', 'humor', 'motivação', 'dicas'];

const CarouselIconStacked = () => (
  <div style={{ position: 'relative', width: '60px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* Left card */}
    <div style={{
      position: 'absolute',
      width: '26px',
      height: '32px',
      left: '0px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
      border: '1.5px solid rgba(255,255,255,0.3)',
      borderRadius: '6px',
      transform: 'rotate(-12deg) translateY(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      zIndex: 1,
      opacity: 0.7
    }}>
      <ImageIcon size={12} color="rgba(255,255,255,0.6)" />
    </div>

    {/* Right card */}
    <div style={{
      position: 'absolute',
      width: '26px',
      height: '32px',
      right: '0px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
      border: '1.5px solid rgba(255,255,255,0.3)',
      borderRadius: '6px',
      transform: 'rotate(12deg) translateY(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      zIndex: 1,
      opacity: 0.7
    }}>
      <ImageIcon size={12} color="rgba(255,255,255,0.6)" />
    </div>

    {/* Center main card */}
    <div style={{
      position: 'relative',
      width: '30px',
      height: '36px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1))',
      border: '1.8px solid #fff',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 6px 15px rgba(0,0,0,0.4)',
      zIndex: 2,
      transform: 'scale(1.05)'
    }}>
      <ImageIcon size={16} color="#fff" />
    </div>
  </div>
);

const MOCK_TRACKS = [
  { id: 'track-1', title: 'Phonk Beast (Hardcore Training Mix)', duration: '2:45', artist: 'FitVerse Originals' },
  { id: 'track-2', title: 'Cyberpunk Shred (Synthwave Gym)', duration: '3:12', artist: 'Neon Beats' },
  { id: 'track-3', title: 'Heavy Duty Lifting (Industrial Metal)', duration: '2:50', artist: 'Iron Empire' },
  { id: 'track-4', title: 'Zen Flow (Yoga & Stretching)', duration: '4:00', artist: 'Mind & Body' },
  { id: 'track-5', title: 'Lo-Fi Cardio (Chill Beats to Run)', duration: '3:35', artist: 'Hype Chill' },
];

export default function CreatePostScreen() {
  const screenParams = useNavigationStore((s) => s.screenParams);
  const [creationType, setCreationType] = useState(null); // null | 'video' | 'photo' | 'challenge'
  const [step, setStep] = useState(1); // 1: Media Selection/Preview, 2: Post Details

  // Challenge creation states
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeMetric, setChallengeMetric] = useState('treino');
  const [challengeDuration, setChallengeDuration] = useState(30);
  const [challengeReward, setChallengeReward] = useState(100);
  const [challengeIcon, setChallengeIcon] = useState('🏆');
  const [challengeColor, setChallengeColor] = useState('#00D4FF');
  const [challengeExpiresAt, setChallengeExpiresAt] = useState('');
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

  const { addChallenge } = useRankingStore();

  useEffect(() => {
    resetMediaStates();
    setStep(1);
    if (screenParams?.type === 'challenge') {
      setCreationType('challenge');
    } else {
      setCreationType(null); // Show selection screen
    }
  }, [screenParams]);

  const [mode, setMode] = useState('camera'); // 'camera' | 'gallery'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [category, setCategory] = useState('treino');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('9/16');

  // Cover selector states
  const [coverTime, setCoverTime] = useState(null);
  const [tempCoverTime, setTempCoverTime] = useState(1);
  const [videoDuration, setVideoDuration] = useState(0);
  const [timelineThumbnails, setTimelineThumbnails] = useState([]);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const coverVideoRef = useRef(null);
  const postVideoRef = useRef(null);
  const step2VideoRef = useRef(null);

  useEffect(() => {
    if (postVideoRef.current && coverTime !== null) {
      postVideoRef.current.currentTime = coverTime;
    }
  }, [coverTime]);

  useEffect(() => {
    if (step2VideoRef.current && coverTime !== null) {
      step2VideoRef.current.currentTime = coverTime;
    }
  }, [coverTime]);

  const generateTimelineThumbnails = (videoFile) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
      setTempCoverTime(Math.min(1, video.duration));
      
      const count = 8;
      const step = video.duration / (count - 1 || 1);
      const points = Array.from({ length: count }, (_, i) => i * step);
      const thumbs = [];
      let pointIdx = 0;
      
      const captureNext = () => {
        if (pointIdx >= points.length) {
          setTimelineThumbnails(thumbs);
          URL.revokeObjectURL(objectUrl);
          return;
        }
        
        video.currentTime = points[pointIdx];
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              thumbs.push({ time: points[pointIdx], dataUrl: canvas.toDataURL('image/jpeg', 0.5) });
            }
          } catch (e) {
            console.warn('[CreatePost] Error capturing timeline frame:', e);
          }
          pointIdx++;
          captureNext();
        };
      };
      
      captureNext();
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleCoverTimeChange = (e) => {
    const time = parseFloat(e.target.value);
    setTempCoverTime(time);
    if (coverVideoRef.current) {
      coverVideoRef.current.currentTime = time;
    }
  };

  const handleDoneCoverSelection = () => {
    setCoverTime(tempCoverTime);
    setShowCoverSelector(false);
  };

  const getClosestAspectRatio = (width, height) => {
    const ratio = width / height;
    const standards = [
      { label: '16/9', value: 16 / 9 },
      { label: '1/1', value: 1 / 1 },
      { label: '4/5', value: 4 / 5 },
      { label: '2/3', value: 2 / 3 },
      { label: '9/16', value: 9 / 16 }
    ];
    let closest = standards[0];
    let minDiff = Math.abs(ratio - standards[0].value);
    for (let i = 1; i < standards.length; i++) {
      const diff = Math.abs(ratio - standards[i].value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = standards[i];
      }
    }
    return closest.label;
  };

  useEffect(() => {
    if (!preview) {
      setAspectRatio('9/16');
      return;
    }

    if (mediaType === 'image') {
      const img = new Image();
      img.src = preview;
      img.onload = () => {
        const closest = getClosestAspectRatio(img.width, img.height);
        setAspectRatio(closest);
      };
    } else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = preview;
      video.onloadedmetadata = () => {
        const closest = getClosestAspectRatio(video.videoWidth, video.videoHeight);
        setAspectRatio(closest);
      };
    }
  }, [preview, mediaType]);

  // Camera recording states
  const [isRecording, setIsRecording] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileRef = useRef(null);
  const previewCarouselRef = useRef(null);
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
  const startCamera = async () => {
    setCameraError(null);
    try {
      // First try requesting both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: true,
      });
      setCameraStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera + Audio access failed, trying video only...', err);
      try {
        // Fallback: request video only (so users with microphone blocked at OS level can still post silent videos)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        setCameraStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (fallbackErr) {
        console.warn('Camera-only access also failed:', fallbackErr);
        setCameraError('Permissão de câmera negada ou dispositivo não disponível. Use a Galeria para fazer upload.');
      }
    }
  };

  // Sync cameraStream to video preview element srcObject when mounted/rendered
  useEffect(() => {
    if (videoPreviewRef.current) {
      if (cameraStream) {
        if (videoPreviewRef.current.srcObject !== cameraStream) {
          videoPreviewRef.current.srcObject = cameraStream;
        }
      } else {
        videoPreviewRef.current.srcObject = null;
      }
    }
  }, [cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

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
  }, [mode, preview]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Start recording video from feed
  const startRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    setIsRecording(true);

    try {
      let options = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 700000 };
      let recorder;
      try {
        recorder = new MediaRecorder(cameraStream, options);
      } catch (e) {
        try {
          options = { mimeType: 'video/webm', videoBitsPerSecond: 700000 };
          recorder = new MediaRecorder(cameraStream, options);
        } catch (e2) {
          recorder = new MediaRecorder(cameraStream);
        }
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
        setCoverTime(null);
        setTempCoverTime(1);
        setVideoDuration(0);
        setTimelineThumbnails([]);
        generateTimelineThumbnails(recordedFile);
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

  const resetMediaStates = () => {
    setFile(null);
    setPreview(null);
    setFiles([]);
    setPreviews([]);
    setMediaType(null);
    setActivePreviewIndex(0);
    setCaption('');
    setHashtags([]);
    setSelectedTrack(null);
    stopCamera();
    setCoverTime(null);
    setTempCoverTime(1);
    setVideoDuration(0);
    setTimelineThumbnails([]);
    setShowCoverSelector(false);
    setStep(1);
  };

  const scrollToPreviewIndex = (idx) => {
    setActivePreviewIndex(idx);
    const el = previewCarouselRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({
      left: idx * width,
      behavior: 'smooth',
    });
  };

  const handlePreviewCarouselScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== activePreviewIndex) {
        setActivePreviewIndex(newIndex);
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Check if there is any video
    const videoFile = selectedFiles.find(f => f.type.startsWith('video'));
    if (videoFile) {
      if (selectedFiles.length > 1) {
        alert('Publicações de vídeo suportam apenas um arquivo por vez. Selecionamos o primeiro vídeo.');
      }
      setFile(videoFile);
      setPreview(URL.createObjectURL(videoFile));
      setFiles([videoFile]);
      setPreviews([URL.createObjectURL(videoFile)]);
      setMediaType('video');
      setActivePreviewIndex(0);
      setCoverTime(null);
      setTempCoverTime(1);
      setVideoDuration(0);
      setTimelineThumbnails([]);
      generateTimelineThumbnails(videoFile);
    } else {
      // All are images
      const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
      const updatedFiles = [...files, ...selectedFiles].slice(0, 10); // Limit to 10 images
      const updatedPreviews = [...previews, ...newPreviews].slice(0, 10);
      
      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      setFile(updatedFiles[0]);
      setPreview(updatedPreviews[0]);
      setMediaType(updatedFiles.length > 1 ? 'carousel' : 'image');
      setActivePreviewIndex(0);
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
  const handlePost = async () => {
    if (!file && files.length === 0) {
      alert('Selecione uma foto ou vídeo para publicar.');
      return;
    }

    const postMedia = mediaType === 'carousel' ? files : file;
    const soundTitle = selectedTrack ? selectedTrack.title : '';

    resetMediaStates();
    setCreationType(null);
    navigate('feed');

    // Start background upload
    createPost(postMedia, {
      userId: user.uid,
      username: profile?.username || 'user',
      displayName: profile?.display_name || 'Usuário',
      userAvatar: profile?.avatar_url || '',
      caption: caption + (soundTitle ? ` 🎵 Áudio: ${soundTitle}` : ''),
      hashtags,
      category,
      coverTime: coverTime !== null ? coverTime : undefined,
    }).then((result) => {
      if (!result.success) {
        console.error('[CreatePost] Upload failed:', result.error);
      }
    });
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle.trim()) {
      alert('Por favor, informe o título do desafio.');
      return;
    }

    setIsSubmittingChallenge(true);
    try {
      await addChallenge({
        title: challengeTitle.trim(),
        description: challengeDesc.trim(),
        icon: challengeIcon,
        type: challengeMetric,
        duration: challengeDuration,
        reward: challengeReward,
        color: challengeColor,
        expires_at: challengeExpiresAt ? new Date(challengeExpiresAt).toISOString() : null,
      });

      alert('Desafio criado com sucesso! 🏆');
      setChallengeTitle('');
      setChallengeDesc('');
      setChallengeMetric('treino');
      setChallengeDuration(30);
      setChallengeReward(100);
      setChallengeIcon('🏆');
      setChallengeColor('#00D4FF');
      setChallengeExpiresAt('');

      // Navigate to Feed -> challenges tab
      useFeedStore.getState().setActiveTab('challenges');
      navigate('feed');
    } catch (err) {
      console.error('Error creating challenge:', err);
      alert('Falha ao criar o desafio. Tente novamente.');
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  return (
    <ScreenWrapper screenKey="create">
      {creationType === null ? (
        <div style={styles.selectionContainer}>
          {/* Header */}
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => goBack()}>
              <ChevronLeft size={24} color="#fff" />
            </button>
            <h2 style={styles.title}>Criar</h2>
          </div>

          <div style={styles.selectionGrid}>
            <motion.button
              style={styles.selectionCard}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCreationType('video');
                setMode('camera');
              }}
            >
              <div style={{ ...styles.selectionIconBg, background: 'linear-gradient(135deg, #00D4FF, #0056FF)' }}>
                <Video size={28} color="#fff" />
              </div>
              <h3 style={styles.selectionCardTitle}>Publicar Vídeo</h3>
              <p style={styles.selectionCardDesc}>Grave com a câmera ou carregue vídeos de treinos da galeria.</p>
            </motion.button>

            <motion.button
              style={styles.selectionCard}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCreationType('photo');
                setMode('gallery');
              }}
            >
              <div style={{ ...styles.selectionIconBg, background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}>
                <CarouselIconStacked />
              </div>
              <h3 style={styles.selectionCardTitle}>Post / Carrossel</h3>
              <p style={styles.selectionCardDesc}>Faça upload de fotos para criar posts de imagem única ou carrossel.</p>
            </motion.button>

            <motion.button
              style={styles.selectionCard}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCreationType('challenge')}
            >
              <div style={{ ...styles.selectionIconBg, background: 'linear-gradient(135deg, #FF6B35, #FF2D55)' }}>
                <Trophy size={28} color="#fff" />
              </div>
              <h3 style={styles.selectionCardTitle}>Criar Desafio</h3>
              <p style={styles.selectionCardDesc}>Crie um grupo de competição personalizada com duração, recompensas de XP e métricas.</p>
            </motion.button>
          </div>
        </div>
      ) : creationType === 'challenge' ? (
        <div style={styles.challengeContainer}>
          {/* Header */}
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => setCreationType(null)}>
              <ChevronLeft size={24} color="#fff" />
            </button>
            <h2 style={styles.title}>Novo Desafio</h2>
          </div>

          {/* Form */}
          <div style={styles.formContainer}>
            {/* Title */}
            <div style={styles.field}>
              <label style={styles.label}>Título do Desafio</label>
              <input
                type="text"
                placeholder="Ex: 30 Dias de Treino, Corrida de Outono"
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                style={styles.inputField}
                maxLength={40}
              />
            </div>

            {/* Description */}
            <div style={styles.field}>
              <label style={styles.label}>Descrição & Regras</label>
              <textarea
                placeholder="Ex: Treine todos os dias e faça check-in com foto."
                value={challengeDesc}
                onChange={(e) => setChallengeDesc(e.target.value)}
                style={styles.textareaField}
                rows={3}
                maxLength={200}
              />
            </div>

            {/* Metric */}
            <div style={styles.field}>
              <label style={styles.label}>Métrica de Pontuação</label>
              <select
                value={challengeMetric}
                onChange={(e) => setChallengeMetric(e.target.value)}
                style={styles.selectField}
              >
                <option value="treino" style={{ color: '#000', backgroundColor: '#fff' }}>Número de Treinos (Treinos)</option>
                <option value="minutos" style={{ color: '#000', backgroundColor: '#fff' }}>Minutos Praticados (Minutos)</option>
                <option value="calorias" style={{ color: '#000', backgroundColor: '#fff' }}>Calorias Gastas (Calorias)</option>
                <option value="km" style={{ color: '#000', backgroundColor: '#fff' }}>Quilômetros Percorridos (km)</option>
                <option value="passos" style={{ color: '#000', backgroundColor: '#fff' }}>Passos Realizados (Passos)</option>
              </select>
            </div>

            <div style={styles.rowFields}>
              {/* Duration */}
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Duração (Dias)</label>
                <input
                  type="number"
                  min={1}
                  value={challengeDuration}
                  onChange={(e) => setChallengeDuration(Math.max(1, parseInt(e.target.value) || 7))}
                  style={styles.inputField}
                />
              </div>

              {/* XP Reward */}
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Recompensa (XP)</label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={challengeReward}
                  onChange={(e) => setChallengeReward(Math.max(50, parseInt(e.target.value) || 100))}
                  style={styles.inputField}
                />
              </div>
            </div>

            {/* Expiration Date */}
            <div style={styles.field}>
              <label style={styles.label}>Data de Validade (Opcional)</label>
              <input
                type="date"
                value={challengeExpiresAt}
                onChange={(e) => setChallengeExpiresAt(e.target.value)}
                style={styles.inputField}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Icon/Emoji Selector */}
            <div style={styles.field}>
              <label style={styles.label}>Ícone do Desafio</label>
              <div style={styles.emojiSelectorGrid}>
                {['🏆', '🏋️', '🏃', '🥗', '💧', '🔥', '🥑', '👟', '💪'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    style={{
                      ...styles.emojiBtn,
                      background: challengeIcon === emoji ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: challengeIcon === emoji ? '#00D4FF' : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => setChallengeIcon(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div style={styles.field}>
              <label style={styles.label}>Cor Temática</label>
              <div style={styles.colorSelectorRow}>
                {['#00D4FF', '#39FF14', '#FF6B35', '#A855F7', '#FF2D55', '#FFD700'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    style={{
                      ...styles.colorBtn,
                      backgroundColor: color,
                      border: challengeColor === color ? '3px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      transform: challengeColor === color ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => setChallengeColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Create Button */}
            <motion.button
              style={{
                ...styles.submitBtn,
                background: `linear-gradient(135deg, ${challengeColor}, ${challengeColor}CC)`,
                color: challengeColor === '#FFD700' || challengeColor === '#39FF14' ? '#000' : '#fff',
              }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateChallenge}
              disabled={isSubmittingChallenge}
            >
              {isSubmittingChallenge ? 'Criando Desafio...' : 'Criar Desafio'}
            </motion.button>
          </div>
        </div>
      ) : (
        <div style={styles.container}>
          {/* Custom style for inline scrubber slider thumb */}
          <style>{`
            .step2-cover-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 36px;
              height: 50px;
              border: 3px solid #00D4FF;
              border-radius: 8px;
              background: transparent;
              box-shadow: 0 0 10px rgba(0,212,255,0.5);
            }
            .step2-cover-slider::-moz-range-thumb {
              width: 36px;
              height: 50px;
              border: 3px solid #00D4FF;
              border-radius: 8px;
              background: transparent;
              box-shadow: 0 0 10px rgba(0,212,255,0.5);
            }
          `}</style>

          {step === 1 ? (
            /* STEP 1: Media Selection & Preview */
            <>
              {/* Header */}
              <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => { resetMediaStates(); setCreationType(null); }}>
                  <ChevronLeft size={24} color="#fff" />
                </button>
                <h2 style={{ ...styles.title, flex: 1, textAlign: 'center', marginRight: '24px' }}>
                  {creationType === 'photo' ? 'Post / Carrossel' : 'Publicar Vídeo'}
                </h2>
              </div>

              {/* Segmented Mode Selector for video */}
              {creationType === 'video' && (
                <div style={styles.modeTabs}>
                  <button
                    style={{ ...styles.modeTab, ...(mode === 'camera' ? styles.modeTabActive : {}) }}
                    onClick={() => {
                      if (preview) resetMediaStates();
                      setMode('camera');
                    }}
                  >
                    <Camera size={16} /> Gravar Câmera
                  </button>
                  <button
                    style={{ ...styles.modeTab, ...(mode === 'gallery' ? styles.modeTabActive : {}) }}
                    onClick={() => {
                      if (preview) resetMediaStates();
                      setMode('gallery');
                    }}
                  >
                    <Upload size={16} /> Fazer Upload
                  </button>
                </div>
              )}

              {/* Content Preview/Input Area */}
              {preview ? (
                /* Locked Content Preview */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '20px' }}>
                  <div style={{ ...styles.previewWrap, marginBottom: 0 }}>
                    {mediaType === 'video' ? (
                      <video 
                        ref={postVideoRef}
                        src={preview} 
                        style={{ ...styles.previewMedia, objectFit: 'contain', background: '#000' }} 
                        controls 
                        playsInline 
                      />
                    ) : mediaType === 'carousel' ? (
                      <div
                        ref={previewCarouselRef}
                        style={styles.carouselContainer}
                        onScroll={handlePreviewCarouselScroll}
                      >
                        {previews.map((prevUrl, idx) => (
                          <div key={idx} style={styles.carouselSlide}>
                            <img src={prevUrl} alt={`Preview Slide ${idx + 1}`} style={styles.previewMedia} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <img src={preview} alt="Preview" style={{ ...styles.previewMedia, objectFit: 'contain', background: '#000' }} />
                    )}

                    {/* Carousel indicators and arrows */}
                    {mediaType === 'carousel' && previews.length > 1 && (
                      <div style={styles.dotsContainerPreview}>
                        {previews.map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              ...styles.dotPreview,
                              background: activePreviewIndex === idx ? '#00D4FF' : 'rgba(255,255,255,0.4)',
                              transform: activePreviewIndex === idx ? 'scale(1.2)' : 'scale(1)',
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      style={styles.removeBtn}
                      onClick={resetMediaStates}
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
                      <span style={styles.mediaTypeText}>
                        {mediaType === 'video' ? 'Vídeo' : mediaType === 'carousel' ? `Carrossel (${previews.length})` : 'Foto'}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnails row for Carousel / Multiple Photos */}
                  {mediaType === 'carousel' && (
                    <div style={styles.thumbnailList}>
                      {previews.map((prevUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            ...styles.thumbnailItem,
                            border: activePreviewIndex === idx ? '2px solid #00D4FF' : '1px solid rgba(255,255,255,0.1)',
                          }}
                          onClick={() => scrollToPreviewIndex(idx)}
                        >
                          <img src={prevUrl} alt={`Thumbnail ${idx + 1}`} style={styles.thumbnailImg} />
                          <button
                            style={styles.thumbnailRemoveBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              const updatedFiles = files.filter((_, i) => i !== idx);
                              const updatedPreviews = previews.filter((_, i) => i !== idx);
                              
                              setFiles(updatedFiles);
                              setPreviews(updatedPreviews);
                              
                              if (updatedFiles.length <= 1) {
                                setMediaType('image');
                                setFile(updatedFiles[0] || null);
                                setPreview(updatedPreviews[0] || null);
                              } else {
                                setFile(updatedFiles[0]);
                                setPreview(updatedPreviews[0]);
                              }
                              
                              if (activePreviewIndex >= updatedFiles.length) {
                                setActivePreviewIndex(Math.max(0, updatedFiles.length - 1));
                              }
                            }}
                          >
                            <X size={10} color="#fff" />
                          </button>
                        </div>
                      ))}
                      
                      {previews.length < 10 && (
                        <button
                          style={styles.thumbnailAddBtn}
                          onClick={() => fileRef.current?.click()}
                        >
                          <Upload size={16} color="#00D4FF" />
                          <span style={styles.thumbnailAddText}>Add</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Add to carousel helper button */}
                  {mediaType === 'image' && creationType === 'photo' && (
                    <button
                      style={styles.addToCarouselBtn}
                      onClick={() => fileRef.current?.click()}
                    >
                      <PlusCircle size={16} color="#00D4FF" />
                      <span>Adicionar fotos para criar carrossel</span>
                    </button>
                  )}
                </div>
              ) : mode === 'camera' && creationType === 'video' ? (
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
                  <span style={styles.uploadTitle}>
                    {creationType === 'photo' ? 'Selecionar Fotos' : 'Selecionar Vídeo'}
                  </span>
                  <span style={styles.uploadDesc}>
                    {creationType === 'photo'
                      ? 'Imagens • JPG, PNG, WEBP (Máx. 10)'
                      : 'Vídeo • MP4, MOV, WEBM'}
                  </span>
                </motion.div>
              )}

              {/* Audio Selector Button */}
              <motion.button
                style={{
                  ...styles.audioSelectBtn,
                  background: selectedTrack ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.05)',
                  borderColor: selectedTrack ? '#39FF14' : 'rgba(255,255,255,0.1)',
                  marginTop: '16px',
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

              {/* Centered AVANÇAR Button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px', marginBottom: '16px' }}>
                <motion.button
                  style={{
                    ...styles.avancarBtn,
                    ...(preview ? styles.avancarBtnActive : styles.avancarBtnDisabled),
                  }}
                  disabled={!preview}
                  onClick={() => setStep(2)}
                  whileTap={preview ? { scale: 0.95 } : {}}
                >
                  Avançar
                </motion.button>
              </div>
            </>
          ) : (
            /* STEP 2: Post Details & Publish */
            <>
              {/* Header */}
              <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => setStep(1)}>
                  <ChevronLeft size={24} color="#fff" />
                </button>
                <h2 style={styles.title}>{creationType === 'photo' ? 'Post / Carrossel' : 'Publicar Vídeo'}</h2>
                <motion.button
                  style={{ ...styles.postBtn, opacity: 1 }}
                  onClick={handlePost}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={16} /> Postar
                </motion.button>
              </div>

              {/* Top Row: Caption area & Right side Preview Thumbnail */}
              <div style={styles.step2TopRow}>
                <textarea
                  style={styles.step2Textarea}
                  placeholder="Escreva sua legenda aqui..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={300}
                />
                <div 
                  style={styles.step2ThumbnailWrap}
                  onClick={() => {
                    if (mediaType === 'video') {
                      setTempCoverTime(coverTime !== null ? coverTime : Math.min(1, videoDuration));
                      setShowCoverSelector(true);
                    }
                  }}
                >
                  {mediaType === 'video' ? (
                    <>
                      <video
                        ref={step2VideoRef}
                        src={preview}
                        style={styles.step2ThumbnailMedia}
                        muted
                        playsInline
                      />
                      <span style={styles.step2CoverBadge}>Capa</span>
                    </>
                  ) : (
                    <img src={preview} alt="Preview" style={styles.step2ThumbnailMedia} />
                  )}
                </div>
              </div>

              {selectedTrack && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#39FF14', fontWeight: 500, marginBottom: '16px' }}>
                  <Music size={12} color="#39FF14" />
                  <span>Trilha selecionada: {selectedTrack.title}</span>
                </div>
              )}

              {/* Scrubber section for video */}
              {mediaType === 'video' && (
                <>
                  <div style={styles.step2Divider} />
                  <p style={styles.step2CoverInstruction}>
                    Escolha como seu reels aparecerá para as outras pessoas. Selecione um quadro do seu vídeo como imagem de capa.
                  </p>

                  <div style={styles.step2TimelineContainer}>
                    <div style={styles.step2TimelineThumbnails}>
                      {timelineThumbnails.map((thumb, idx) => (
                        <img
                          key={idx}
                          src={thumb.dataUrl}
                          alt=""
                          style={styles.step2TimelineThumb}
                        />
                      ))}
                    </div>
                    
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 10}
                      step={0.05}
                      value={coverTime !== null ? coverTime : tempCoverTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCoverTime(val);
                        setTempCoverTime(val);
                      }}
                      className="step2-cover-slider"
                      style={styles.step2TimelineSlider}
                    />
                  </div>
                </>
              )}

              <div style={styles.step2Divider} />

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
            </>
          )}

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

          <input
            ref={fileRef}
            type="file"
            accept={creationType === 'video' ? 'video/*' : 'image/*'}
            multiple={creationType === 'photo'}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

      )}
      {/* Cover Frame Selector Modal */}
      <AnimatePresence>
        {showCoverSelector && (
          <motion.div
            style={styles.coverModalOverlay}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            {/* Scrubber CSS Thumb Customization */}
            <style>{`
              .cover-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 44px;
                height: 60px;
                border: 3px solid #00D4FF;
                border-radius: 8px;
                background: transparent;
                box-shadow: 0 0 10px rgba(0,212,255,0.5);
              }
              .cover-slider::-moz-range-thumb {
                width: 44px;
                height: 60px;
                border: 3px solid #00D4FF;
                border-radius: 8px;
                background: transparent;
                box-shadow: 0 0 10px rgba(0,212,255,0.5);
              }
            `}</style>

            <div style={styles.coverModalHeader}>
              <button style={styles.coverModalBack} onClick={() => setShowCoverSelector(false)}>
                <ChevronLeft size={24} color="#fff" />
              </button>
              <span style={styles.coverModalTitle}>Editar capa</span>
              <button style={styles.coverModalDone} onClick={handleDoneCoverSelection}>
                Concluir
              </button>
            </div>

            <div style={styles.coverModalContent}>
              <div style={styles.coverFramePreviewContainer}>
                <video
                  ref={coverVideoRef}
                  src={preview}
                  style={styles.coverFrameVideo}
                  muted
                  playsInline
                />
              </div>

              <p style={styles.coverModalInstruction}>
                Escolha como seu reels aparecerá para as outras pessoas. Selecione um quadro do seu vídeo como imagem de capa.
              </p>

              <div style={styles.coverTimelineContainer}>
                <div style={styles.coverTimelineThumbnails}>
                  {timelineThumbnails.map((thumb, idx) => (
                    <img
                      key={idx}
                      src={thumb.dataUrl}
                      alt=""
                      style={styles.coverTimelineThumb}
                    />
                  ))}
                </div>
                
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 10}
                  step={0.05}
                  value={tempCoverTime}
                  onChange={handleCoverTimeChange}
                  className="cover-slider"
                  style={styles.coverTimelineSlider}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  cameraFrame: { width: '100%', height: '380px', borderRadius: '24px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' },
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
  uploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px 24px', height: '220px', boxSizing: 'border-box', border: '2px dashed rgba(0,212,255,0.2)', borderRadius: '20px', background: 'rgba(0,212,255,0.04)', cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s ease' },
  uploadTitle: { fontSize: '16px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" },
  uploadDesc: { fontSize: '13px', color: '#6C6C88' },
  previewWrap: { position: 'relative', borderRadius: '24px', overflow: 'hidden', marginBottom: '16px', width: '100%', height: '380px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)' },
  previewMedia: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px', display: 'block' },
  removeBtn: { position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mediaTypeBadge: { position: 'absolute', top: '10px', left: '10px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' },
  mediaTypeText: { fontSize: '11px', color: '#fff', fontWeight: 600 },
  thumbnailList: { display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', width: '100%', marginBottom: '12px' },
  thumbnailItem: { position: 'relative', width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' },
  thumbnailImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbnailRemoveBtn: { position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  thumbnailAddBtn: { width: '60px', height: '60px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(0,212,255,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, gap: '2px' },
  thumbnailAddText: { fontSize: '9px', color: '#00D4FF', fontWeight: 600 },
  addToCarouselBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(0,212,255,0.05)', border: '1px dashed rgba(0,212,255,0.2)', color: '#00D4FF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
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

  // Selection Screen
  selectionContainer: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', display: 'flex', flexDirection: 'column', height: '100%', background: '#0A0A0F' },
  selectionGrid: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '32px' },
  selectionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', cursor: 'pointer', textAlign: 'center', fontFamily: "'Inter', sans-serif", width: '100%', boxSizing: 'border-box', transition: 'all 0.2s ease' },
  selectionIconBg: { width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  selectionCardTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  selectionCardDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5', margin: 0 },

  // Cover Selector Modal
  editCoverBtn: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '20px',
    padding: '8px 16px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
    zIndex: 10,
    transition: 'all 0.2s',
  },
  coverModalOverlay: {
    position: 'absolute',
    inset: 0,
    background: '#0A0A0F',
    zIndex: 100000,
    display: 'flex',
    flexDirection: 'column',
  },
  coverModalHeader: {
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  coverModalBack: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  coverModalTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  coverModalDone: {
    background: 'none',
    border: 'none',
    color: '#00D4FF',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  coverModalContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '24px',
  },
  coverFramePreviewContainer: {
    width: '200px',
    aspectRatio: '9/16',
    borderRadius: '24px',
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.1)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    background: '#000',
  },
  coverFrameVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverModalInstruction: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: '1.5',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  coverTimelineContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    height: '60px',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  coverTimelineThumbnails: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  coverTimelineThumb: {
    flex: 1,
    height: '100%',
    objectFit: 'cover',
    opacity: 0.6,
  },
  coverTimelineSlider: {
    position: 'absolute',
    inset: 0,
    margin: 0,
    WebkitAppearance: 'none',
    background: 'transparent',
    cursor: 'pointer',
    zIndex: 10,
  },

  // Challenge Form
  challengeContainer: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)', paddingBottom: '60px' },
  formContainer: { display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' },
  inputField: { width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' },
  textareaField: { width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'none', boxSizing: 'border-box' },
  selectField: { width: '100%', padding: '14px', background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' },
  rowFields: { display: 'flex', gap: '12px' },
  emojiSelectorGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' },
  emojiBtn: { padding: '10px', borderRadius: '10px', fontSize: '20px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  colorSelectorRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  colorBtn: { width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', border: 'none' },
  submitBtn: { width: '100%', padding: '16px', borderRadius: '14px', border: 'none', fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", marginTop: '8px' },
  carouselContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflowX: 'auto',
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
  dotsContainerPreview: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '6px',
    zIndex: 10,
    background: 'rgba(0,0,0,0.3)',
    padding: '4px 8px',
    borderRadius: '10px',
  },
  dotPreview: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  avancarBtn: {
    padding: '14px 44px',
    borderRadius: '24px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
  },
  avancarBtnActive: {
    background: '#3975F6',
    color: '#fff',
  },
  avancarBtnDisabled: {
    background: '#132247',
    color: '#2e4373',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  step2TopRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '24px',
    width: '100%',
  },
  step2Textarea: {
    flex: 1,
    height: '160px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '15px',
    fontFamily: "'Inter', sans-serif",
    resize: 'none',
    padding: '4px 0',
  },
  step2ThumbnailWrap: {
    width: '105px',
    height: '160px',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#000',
    border: '1px solid rgba(255,255,255,0.12)',
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  step2ThumbnailMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  step2CoverBadge: {
    position: 'absolute',
    bottom: '6px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '4px',
    pointerEvents: 'none',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  step2Divider: {
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    margin: '24px 0',
    width: '100%',
  },
  step2CoverInstruction: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
    fontFamily: "'Inter', sans-serif",
  },
  step2TimelineContainer: {
    position: 'relative',
    width: '100%',
    height: '50px',
    borderRadius: '10px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px',
  },
  step2TimelineThumbnails: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  step2TimelineThumb: {
    flex: 1,
    height: '100%',
    objectFit: 'cover',
    opacity: 0.6,
  },
  step2TimelineSlider: {
    position: 'absolute',
    inset: 0,
    margin: 0,
    WebkitAppearance: 'none',
    background: 'transparent',
    cursor: 'pointer',
    zIndex: 10,
  },
};
