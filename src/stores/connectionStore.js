import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useAuthStore } from './authStore';

export const useConnectionStore = create((set, get) => ({
  companyTrainers: [],
  trainerStudents: [],
  isLoadingTrainers: false,
  isLoadingStudents: false,

  // Fetch trainers for a business profile
  fetchCompanyTrainers: async (companyId) => {
    if (!companyId) return [];
    set({ isLoadingTrainers: true });
    try {
      const { data, error } = await supabase
        .from('company_trainers')
        .select(`
          id,
          status,
          created_at,
          trainer:profiles!company_trainers_trainer_id_fkey(*)
        `)
        .eq('company_id', companyId);

      if (error) {
        // Fallback query if foreign key alias isn't registered in PostgREST
        const { data: rawConns, error: rawErr } = await supabase
          .from('company_trainers')
          .select('id, status, trainer_id, created_at')
          .eq('company_id', companyId);

        if (rawErr) throw rawErr;

        if (rawConns && rawConns.length > 0) {
          const trainerIds = rawConns.map(c => c.trainer_id);
          const { data: trainerProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', trainerIds);

          const profilesMap = (trainerProfiles || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});

          const formatted = rawConns.map(c => ({
            id: c.id,
            status: c.status,
            created_at: c.created_at,
            trainer: profilesMap[c.trainer_id] || { id: c.trainer_id, display_name: 'Personal Trainer', username: 'trainer' }
          }));

          set({ companyTrainers: formatted });
          return formatted;
        }
        set({ companyTrainers: [] });
        return [];
      }

      set({ companyTrainers: data || [] });
      return data || [];
    } catch (err) {
      console.warn('[ConnectionStore] fetchCompanyTrainers error/fallback:', err.message);
      set({ companyTrainers: [] });
      return [];
    } finally {
      set({ isLoadingTrainers: false });
    }
  },

  // Fetch students for a trainer profile
  fetchTrainerStudents: async (trainerId) => {
    if (!trainerId) return [];
    set({ isLoadingStudents: true });
    try {
      const { data, error } = await supabase
        .from('trainer_students')
        .select(`
          id,
          status,
          created_at,
          student:profiles!trainer_students_student_id_fkey(*)
        `)
        .eq('trainer_id', trainerId);

      if (error) {
        // Fallback query if foreign key alias isn't registered
        const { data: rawConns, error: rawErr } = await supabase
          .from('trainer_students')
          .select('id, status, student_id, created_at')
          .eq('trainer_id', trainerId);

        if (rawErr) throw rawErr;

        if (rawConns && rawConns.length > 0) {
          const studentIds = rawConns.map(c => c.student_id);
          const { data: studentProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', studentIds);

          const profilesMap = (studentProfiles || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});

          const formatted = rawConns.map(c => ({
            id: c.id,
            status: c.status,
            created_at: c.created_at,
            student: profilesMap[c.student_id] || { id: c.student_id, display_name: 'Aluno', username: 'aluno' }
          }));

          set({ trainerStudents: formatted });
          return formatted;
        }
        set({ trainerStudents: [] });
        return [];
      }

      set({ trainerStudents: data || [] });
      return data || [];
    } catch (err) {
      console.warn('[ConnectionStore] fetchTrainerStudents error/fallback:', err.message);
      set({ trainerStudents: [] });
      return [];
    } finally {
      set({ isLoadingStudents: false });
    }
  },

  // Send invitation from Business to Personal Trainer
  sendCompanyInvite: async (companyId, trainerId) => {
    try {
      const { data, error } = await supabase
        .from('company_trainers')
        .insert({
          company_id: companyId,
          trainer_id: trainerId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to the trainer
      await supabase
        .from('notifications')
        .insert({
          user_id: trainerId,
          sender_id: companyId,
          type: 'company_invite',
          reference_id: data.id,
          read: false
        });

      await get().fetchCompanyTrainers(companyId);
      return { success: true };
    } catch (err) {
      console.error('[ConnectionStore] sendCompanyInvite error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // Send invitation from Personal Trainer to Student
  sendTrainerInvite: async (trainerId, studentId) => {
    try {
      const { data, error } = await supabase
        .from('trainer_students')
        .insert({
          trainer_id: trainerId,
          student_id: studentId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to the student
      await supabase
        .from('notifications')
        .insert({
          user_id: studentId,
          sender_id: trainerId,
          type: 'trainer_invite',
          reference_id: data.id,
          read: false
        });

      await get().fetchTrainerStudents(trainerId);
      return { success: true };
    } catch (err) {
      console.error('[ConnectionStore] sendTrainerInvite error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // Respond to an invitation (Accept or Decline)
  respondToInvite: async (inviteType, inviteId, accept) => {
    try {
      const table = inviteType === 'company_invite' ? 'company_trainers' : 'trainer_students';
      const newStatus = accept ? 'accepted' : 'declined';

      const { data: updated, error } = await supabase
        .from(table)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', inviteId)
        .select()
        .single();

      if (error) throw error;

      // Send confirmation notification back to inviter
      const currentUser = useAuthStore.getState().user;
      const targetUserId = inviteType === 'company_invite' ? updated.company_id : updated.trainer_id;

      if (currentUser?.uid && targetUserId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            sender_id: currentUser.uid,
            type: accept ? `${inviteType}_accepted` : `${inviteType}_declined`,
            reference_id: inviteId,
            read: false
          });
      }

      return { success: true };
    } catch (err) {
      console.error('[ConnectionStore] respondToInvite error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // Remove a connection (Remove employee or remove student)
  removeConnection: async (inviteType, connectionId, profileId) => {
    try {
      const table = inviteType === 'company_invite' ? 'company_trainers' : 'trainer_students';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      if (inviteType === 'company_invite') {
        await get().fetchCompanyTrainers(profileId);
      } else {
        await get().fetchTrainerStudents(profileId);
      }
      return { success: true };
    } catch (err) {
      console.error('[ConnectionStore] removeConnection error:', err.message);
      return { success: false, error: err.message };
    }
  }
}));
