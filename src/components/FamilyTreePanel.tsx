import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Save, X, Camera, MapPin, Calendar, User, Users, ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { supabase } from '../supabase';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  photo_url: string;
  parent_id: string | null;
  birth_date?: string;
  death_date?: string;
  bio?: string;
}

interface FamilyTreePanelProps {
  treeId: string;
  onBack: () => void;
  onView: () => void;
}

export const FamilyTreePanel = ({ treeId, onBack, onView }: FamilyTreePanelProps) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Partial<FamilyMember> | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [treeId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('tree_id', treeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name) return;

    try {
      const memberData = {
        ...editingMember,
        tree_id: treeId,
      };

      if (editingMember.id) {
        const { error } = await supabase
          .from('family_members')
          .update(memberData)
          .eq('id', editingMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('family_members')
          .insert([memberData]);
        if (error) throw error;
      }

      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      console.error('Error saving member:', err);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberToDelete);
      if (error) throw error;
      setMemberToDelete(null);
      fetchMembers();
    } catch (err) {
      console.error('Error deleting member:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName; // El path debe ser relativo al bucket, no incluir el nombre del bucket

      const { error: uploadError } = await supabase.storage
        .from('family-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('family-photos')
        .getPublicUrl(filePath);

      setEditingMember(prev => ({ ...prev, photo_url: publicUrl }));
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Error al subir la foto. Asegúrate de que el bucket "family-photos" sea público.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sepia-50 pt-32 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="p-3 bg-white rounded-full shadow-md hover:bg-sepia-100 transition-all border border-sepia-200"
            >
              <ArrowLeft className="w-6 h-6 text-sepia-600" />
            </button>
            <div>
              <h2 className="text-4xl font-serif text-sepia-950">Panel de Linaje</h2>
              <p className="text-sepia-500 text-sm font-bold uppercase tracking-widest mt-1">
                Gestiona los hilos de tu historia familiar
              </p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onView}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-sepia-950 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-sepia-800 transition-all shadow-xl"
            >
              <Users className="w-4 h-4" /> Ver Árbol
            </button>
            <button 
              onClick={() => setEditingMember({})}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-sepia-500 text-sepia-950 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-sepia-400 transition-all shadow-xl"
            >
              <Plus className="w-4 h-4" /> Añadir Familiar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sepia-600"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-sepia-200">
            <div className="w-24 h-24 bg-sepia-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <User className="w-12 h-12 text-sepia-300" />
            </div>
            <h3 className="text-3xl font-serif text-sepia-900 mb-4">Aún no hay nadie en tu árbol</h3>
            <p className="text-sepia-500 max-w-md mx-auto mb-10 leading-relaxed">
              Comienza añadiendo al primer integrante de tu linaje. Puede ser tú mismo o el antepasado más antiguo que recuerdes.
            </p>
            <button 
              onClick={() => setEditingMember({})}
              className="bg-sepia-950 text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-sepia-800 transition-all shadow-2xl"
            >
              Añadir Primer Familiar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {members.map(member => (
              <motion.div 
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] p-6 shadow-xl border border-sepia-100 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingMember(member)}
                    className="p-2 bg-sepia-100 text-sepia-600 rounded-full hover:bg-sepia-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setMemberToDelete(member.id)}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-sepia-100 mb-4 shadow-inner bg-sepia-50">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-sepia-200" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-xl font-serif text-sepia-950 mb-1">{member.name}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sepia-400 bg-sepia-50 px-3 py-1 rounded-full border border-sepia-100">
                    {member.relationship || 'Sin parentesco'}
                  </span>
                  
                  {member.birth_date && (
                    <div className="mt-4 flex items-center gap-2 text-sepia-500 text-xs">
                      <Calendar className="w-3 h-3" />
                      <span>{member.birth_date} {member.death_date ? `— ${member.death_date}` : ''}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {memberToDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-sepia-950/90 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-serif text-sepia-950 mb-4">¿Eliminar familiar?</h3>
                <p className="text-sepia-500 text-sm mb-8 leading-relaxed">
                  Esta acción no se puede deshacer. Se borrarán todos los datos de esta persona en el árbol.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleDeleteMember}
                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg"
                  >
                    Sí, Eliminar
                  </button>
                  <button 
                    onClick={() => setMemberToDelete(null)}
                    className="w-full bg-sepia-100 text-sepia-600 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-sepia-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Editor */}
        <AnimatePresence>
          {editingMember && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-sepia-950/90 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-8 md:p-12 overflow-y-auto">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-serif text-sepia-950">
                      {editingMember.id ? 'Editar Familiar' : 'Nuevo Familiar'}
                    </h3>
                    <button onClick={() => setEditingMember(null)} className="p-2 hover:bg-sepia-50 rounded-full transition-colors">
                      <X className="w-8 h-8 text-sepia-400" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveMember} className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-10">
                      {/* Photo Upload */}
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-sepia-100 shadow-xl bg-sepia-50 relative group/photo">
                          {editingMember.photo_url ? (
                            <img src={editingMember.photo_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sepia-200">
                              <Camera className="w-12 h-12" />
                            </div>
                          )}
                          <label className="absolute inset-0 bg-sepia-950/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                            <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                              {uploading ? 'Subiendo...' : 'Cambiar Foto'}
                            </span>
                          </label>
                        </div>
                        <p className="text-[10px] text-sepia-400 uppercase font-bold tracking-widest text-center">
                          Foto del Familiar
                        </p>
                      </div>

                      <div className="flex-grow space-y-6">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-sepia-500 tracking-widest mb-2">Nombre Completo</label>
                          <input 
                            required
                            type="text"
                            value={editingMember.name || ''}
                            onChange={e => setEditingMember(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-sepia-50 border border-sepia-100 rounded-2xl p-4 outline-none focus:border-sepia-500 transition-all"
                            placeholder="Ej: Juan García Pérez"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-sepia-500 tracking-widest mb-2">Parentesco</label>
                            <input 
                              type="text"
                              value={editingMember.relationship || ''}
                              onChange={e => setEditingMember(prev => ({ ...prev, relationship: e.target.value }))}
                              className="w-full bg-sepia-50 border border-sepia-100 rounded-2xl p-4 outline-none focus:border-sepia-500 transition-all"
                              placeholder="Ej: Padre, Abuela..."
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-sepia-500 tracking-widest mb-2">Vínculo Familiar (Ancestro / Raíz)</label>
                            <select 
                              value={editingMember.parent_id || 'root'}
                              onChange={e => setEditingMember(prev => ({ ...prev, parent_id: e.target.value === 'root' ? null : e.target.value }))}
                              className="w-full bg-sepia-50 border border-sepia-100 rounded-2xl p-4 outline-none focus:border-sepia-500 transition-all appearance-none"
                            >
                              <option value="root">Es el inicio de esta rama (Raíz)</option>
                              {members.filter(m => m.id !== editingMember.id).map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-sepia-500 tracking-widest mb-2">Año de Nacimiento</label>
                        <input 
                          type="text"
                          value={editingMember.birth_date || ''}
                          onChange={e => setEditingMember(prev => ({ ...prev, birth_date: e.target.value }))}
                          className="w-full bg-sepia-50 border border-sepia-100 rounded-2xl p-4 outline-none focus:border-sepia-500 transition-all"
                          placeholder="Ej: 1945"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-sepia-500 tracking-widest mb-2">Año de Fallecimiento (Opcional)</label>
                        <input 
                          type="text"
                          value={editingMember.death_date || ''}
                          onChange={e => setEditingMember(prev => ({ ...prev, death_date: e.target.value }))}
                          className="w-full bg-sepia-50 border border-sepia-100 rounded-2xl p-4 outline-none focus:border-sepia-500 transition-all"
                          placeholder="Ej: 2010"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-sepia-500 tracking-widest mb-2">Breve Historia / Anécdota</label>
                      <textarea 
                        rows={3}
                        value={editingMember.bio || ''}
                        onChange={e => setEditingMember(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full bg-sepia-50 border border-sepia-100 rounded-2xl p-4 outline-none focus:border-sepia-500 transition-all resize-none"
                        placeholder="Escribe algo especial sobre esta persona..."
                      />
                    </div>

                    <div className="pt-6 flex gap-4">
                      <button 
                        type="submit"
                        className="flex-grow bg-sepia-950 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-sepia-800 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        <Save className="w-5 h-5" /> Guardar Cambios
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="px-8 bg-sepia-100 text-sepia-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-sepia-200 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
