import { supabase } from '../config/supabase';

export const PRESET_EXERCISES_BY_GROUP = {
  'Peito': [
    'Supino reto com barra', 'Supino inclinado com barra', 'Supino declinado com barra', 
    'Supino reto com halteres', 'Supino inclinado com halteres', 'Crucifixo reto', 
    'Crucifixo inclinado', 'Crossover alto', 'Crossover baixo', 'Crossover médio', 
    'Flexão de braço', 'Flexão inclinada', 'Flexão declinada', 'Chest press na máquina', 'Peck deck'
  ],
  'Ombro': [
    'Desenvolvimento com barra', 'Desenvolvimento com halteres', 'Desenvolvimento na máquina', 
    'Elevação lateral com halteres', 'Elevação lateral no cabo', 'Elevação frontal com barra', 
    'Elevação frontal com halteres', 'Elevação frontal no cabo', 'Remada alta com barra', 
    'Remada alta com halteres', 'Encolhimento com barra', 'Encolhimento com halteres', 
    'Face pull', 'Arnold press'
  ],
  'Tríceps': [
    'Tríceps pulley com corda', 'Tríceps pulley com barra recta', 'Tríceps pulley com barra V', 
    'Tríceps testa com barra', 'Tríceps testa com halteres', 'Tríceps francês', 
    'Mergulho entre bancos', 'Mergulho nas paralelas', 'Tríceps coice com halteres', 
    'Tríceps coice no cabo', 'Extensão overhead com halteres', 'Extensão overhead no cabo', 'Kickback'
  ],
  'Costas': [
    'Puxada frontal com barra', 'Puxada frontal com triângulo', 'Puxada frontal supinada', 
    'Puxada atrás da nuca', 'Remada curvada com barra', 'Remada curvada com halteres', 
    'Remada unilateral com halteres', 'Remada cavalinho', 'Remada sentada no cabo', 
    'Remada com triângulo', 'Remada na máquina', 'Levantamento terra', 
    'Levantamento terra romeno', 'Barra fixa pronada', 'Barra fixa supinada', 
    'Pullover com halter', 'Pullover no cabo', 'Serrote com halter'
  ],
  'Bíceps': [
    'Rosca direta com barra', 'Rosca direta com halteres', 'Rosca alternada', 
    'Rosca martelo', 'Rosca martelo no cabo', 'Rosca concentrada', 
    'Rosca scott com barra', 'Rosca scott com halteres', 'Rosca no cabo baixo', 
    'Rosca 21', 'Rosca inversa', 'Rosca zottman'
  ],
  'Quadríceps': [
    'Agachamento livre com barra', 'Agachamento goblet com halter', 'Agachamento sumô', 
    'Agachamento hack', 'Leg press 45°', 'Leg press horizontal', 
    'Cadeira extensora', 'Avanço com barra', 'Avanço com halteres', 
    'Avanço búlgaro', 'Agachamento no smith', 'Passada'
  ],
  'Posterior de Coxa & Glúteo': [
    'Cadeira flexora', 'Mesa flexora', 'Stiff com barra', 'Stiff com halteres', 
    'Levantamento terra romeno', 'Leg curl no cabo', 'Hip thrust com barra', 
    'Hip thrust com halter', 'Elevação pélvica', 'Ponte glúteo', 
    'Abdução no cabo', 'Abdução na máquina', 'Coice no cabo', 'Avanço reverso'
  ],
  'Panturrilha': [
    'Panturrilha em pé na máquina', 'Panturrilha sentado na máquina', 'Panturrilha no leg press', 
    'Panturrilha livre com halteres', 'Panturrilha unilateral'
  ]
};

export const ALL_PRESET_EXERCISES = Object.values(PRESET_EXERCISES_BY_GROUP).flat();

export function cleanString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special characters with space
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchExerciseWithVideo(exerciseName, videoCaption) {
  const cleanEx = cleanString(exerciseName);
  const cleanCap = cleanString(videoCaption);

  // Conflicting modifiers check
  const modifiers = ['inclinado', 'declinado', 'reto', 'unilateral', 'alternado', 'concentrada', 'concentrado', 'direta', 'scott', 'martelo', 'cabos', 'cabo', 'halter', 'halteres', 'barra', 'maquina'];
  for (const mod of modifiers) {
    const exHas = cleanEx.includes(mod);
    if (mod === 'inclinado' && exHas && (cleanCap.includes('reto') || cleanCap.includes('declinado'))) return false;
    if (mod === 'reto' && exHas && (cleanCap.includes('inclinado') || cleanCap.includes('declinado'))) return false;
    if (mod === 'declinado' && exHas && (cleanCap.includes('reto') || cleanCap.includes('inclinado'))) return false;
    if (mod === 'halter' || mod === 'halteres') {
      if (exHas && cleanCap.includes('barra')) return false;
    }
    if (mod === 'barra') {
      if (exHas && (cleanCap.includes('halter') || cleanCap.includes('halteres'))) return false;
    }
  }

  if (cleanEx.includes(cleanCap) || cleanCap.includes(cleanEx)) {
    return true;
  }

  const exWords = cleanEx.split(' ').filter(w => w.length > 2 && !['com', 'sem', 'para', 'dos', 'das', 'uma', 'uns', 'mas', 'que'].includes(w));
  const capWords = cleanCap.split(' ').filter(w => w.length > 2 && !['com', 'sem', 'para', 'dos', 'das', 'uma', 'uns', 'mas', 'que'].includes(w));

  const overlap = exWords.filter(w => capWords.includes(w));
  const minMatches = Math.min(exWords.length, 2);
  return overlap.length >= minMatches;
}

export async function fetchVideosForExercise(exerciseName) {
  try {
    // 1. Fetch all videos
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .neq('category', 'desafio') // ignore challenges
      .order('created_at', { ascending: false });

    if (error || !videos) return [];

    // 2. Fetch profiles for user mapping
    const userIds = [...new Set(videos.map(v => v.user_id).filter(Boolean))];
    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        profiles.forEach(p => {
          profilesMap[p.id] = p;
        });
      }
    }

    // 3. Map profile details onto videos and filter/sort by match
    const matchedVideos = videos
      .map(v => {
        const userProfile = profilesMap[v.user_id];
        const username = userProfile?.username || v.username || 'user';
        const display_name = userProfile?.display_name || v.display_name || 'Usuário';
        const avatar_url = userProfile?.avatar_url || v.user_avatar || '';
        
        return {
          id: v.id,
          videoUrl: v.video_url,
          mediaType: v.media_type || 'video',
          userId: v.user_id,
          username,
          displayName: display_name,
          userAvatar: avatar_url,
          caption: v.caption || '',
          views: v.views || 0,
          created_at: v.created_at,
          isOfficial: username.toLowerCase() === 'flowrise' || username.toLowerCase() === 'flowride',
        };
      })
      .filter(v => matchExerciseWithVideo(exerciseName, v.caption));

    // 4. Sort: official accounts first, then by date/views
    return matchedVideos.sort((a, b) => {
      if (a.isOfficial && !b.isOfficial) return -1;
      if (!a.isOfficial && b.isOfficial) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  } catch (err) {
    console.error('Error fetching videos for exercise:', err);
    return [];
  }
}
