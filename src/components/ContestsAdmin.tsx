import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Trophy,
  Image as ImageIcon,
} from 'lucide-react';
import { Contest, ContestAnswer, ContestWinner } from '../types';
import { supabase } from '../supabase';

interface ContestsAdminProps {
  onClose?: () => void;
}

export const ContestsAdmin: React.FC<ContestsAdminProps> = ({ onClose }) => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [editingContest, setEditingContest] = useState<Partial<Contest> | null>(null);
  const [editingAnswers, setEditingAnswers] = useState<Partial<ContestAnswer>[]>([]);
  const [selectedContestAnswers, setSelectedContestAnswers] = useState<ContestAnswer[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [useImageUrl, setUseImageUrl] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [winner, setWinner] = useState<ContestWinner | null>(null);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setContests(data);
    } catch (err) {
      console.error('Error fetching contests:', err);
      setMessage({ type: 'error', text: 'Error al cargar concursos' });
    }
  };

  const fetchContestAnswers = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_answers')
        .select('*')
        .eq('contest_id', contestId)
        .order('answer_order', { ascending: true });

      if (error) throw error;
      if (data) setSelectedContestAnswers(data);
    } catch (err) {
      console.error('Error fetching answers:', err);
    }
  };

  const fetchWinner = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_winners')
        .select('*')
        .eq('contest_id', contestId)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setWinner(data[0]);
      } else {
        setWinner(null);
      }
    } catch (err) {
      console.error('Error fetching winner:', err);
    }
  };

  const handleEditContest = (contest: Contest) => {
    setEditingContest(contest);
    setEditingAnswers([
      { contest_id: contest.id, answer_text: '', is_correct: false, answer_order: 1 },
      { contest_id: contest.id, answer_text: '', is_correct: false, answer_order: 2 },
      { contest_id: contest.id, answer_text: '', is_correct: false, answer_order: 3 },
    ]);
    setUseImageUrl(false);
    setImageUrlInput('');
    fetchContestAnswers(contest.id);
    fetchWinner(contest.id);
  };

  const handleNewContest = () => {
    setEditingContest({ is_active: true });
    setEditingAnswers([
      { answer_text: '', is_correct: false, answer_order: 1 },
      { answer_text: '', is_correct: false, answer_order: 2 },
      { answer_text: '', is_correct: false, answer_order: 3 },
    ]);
    setUseImageUrl(false);
    setImageUrlInput('');
    setWinner(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingContest) return;

    setIsUploading(true);
    try {
      const fileName = `contests/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('family-photos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('family-photos')
        .getPublicUrl(fileName);

      setEditingContest({
        ...editingContest,
        image_url: publicUrl.publicUrl,
      });

      setMessage({ type: 'success', text: 'Imagen cargada correctamente' });
    } catch (err) {
      console.error('Error uploading image:', err);
      setMessage({ type: 'error', text: 'Error al cargar imagen' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContest || !editingContest.title || !editingContest.question) {
      setMessage({ type: 'error', text: 'Completa todos los campos requeridos' });
      return;
    }

    // Validar que hay una respuesta correcta
    const hasCorrectAnswer = editingAnswers.some((a) => a.is_correct);
    if (!hasCorrectAnswer) {
      setMessage({ type: 'error', text: 'Debe haber al menos una respuesta correcta' });
      return;
    }

    setIsSaving(true);
    try {
      // Guardar concurso
      const contestData = {
        title: editingContest.title,
        description: editingContest.description,
        image_url: editingContest.image_url,
        question: editingContest.question,
        is_active: editingContest.is_active,
        updated_at: new Date().toISOString(),
      };

      let contestId = editingContest.id;

      if (!editingContest.id) {
        const { data, error } = await supabase
          .from('contests')
          .insert(contestData)
          .select();

        if (error) throw error;
        if (data) {
          contestId = data[0].id;
        }
      } else {
        const { error } = await supabase
          .from('contests')
          .update(contestData)
          .eq('id', editingContest.id);

        if (error) throw error;
      }

      // Eliminar respuestas antiguas si es edición
      if (editingContest.id) {
        await supabase
          .from('contest_answers')
          .delete()
          .eq('contest_id', contestId);
      }

      // Guardar respuestas
      const answersToSave = editingAnswers
        .filter((a) => a.answer_text)
        .map((a) => ({
          contest_id: contestId,
          answer_text: a.answer_text,
          is_correct: a.is_correct,
          answer_order: a.answer_order,
        }));

      if (answersToSave.length > 0) {
        const { error } = await supabase
          .from('contest_answers')
          .insert(answersToSave);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Concurso guardado correctamente' });
      setEditingContest(null);
      setEditingAnswers([]);
      fetchContests();
    } catch (err) {
      console.error('Error saving contest:', err);
      setMessage({ type: 'error', text: 'Error al guardar concurso' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContest = async (id: string) => {
    if (!window.confirm('¿Eliminar este concurso?')) return;

    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Concurso eliminado' });
      fetchContests();
    } catch (err) {
      console.error('Error deleting contest:', err);
      setMessage({ type: 'error', text: 'Error al eliminar concurso' });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (contest: Contest) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ is_active: !contest.is_active })
        .eq('id', contest.id);

      if (error) throw error;
      fetchContests();
    } catch (err) {
      console.error('Error toggling contest:', err);
      setMessage({ type: 'error', text: 'Error al actualizar estado' });
    }
  };

  const handleSetWinnerName = async (contestId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update({ winner_name: newName })
        .eq('id', contestId);

      if (error) throw error;
      fetchContests();
      setMessage({ type: 'success', text: 'Ganador actualizado' });
    } catch (err) {
      console.error('Error setting winner:', err);
      setMessage({ type: 'error', text: 'Error al actualizar ganador' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-800">Gestionar Concursos</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNewContest}
          className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Concurso
        </motion.button>
      </div>

      {/* Mensaje */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulario de Edición */}
      {editingContest && (
        <motion.form
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSaveContest}
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 border-amber-200 space-y-4"
        >
          <h3 className="text-xl font-bold text-gray-800">
            {editingContest.id ? 'Editar Concurso' : 'Nuevo Concurso'}
          </h3>

          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={editingContest.title || ''}
              onChange={(e) =>
                setEditingContest({ ...editingContest, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Ej: Foto más antigua"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={editingContest.description || ''}
              onChange={(e) =>
                setEditingContest({ ...editingContest, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={2}
              placeholder="Opcional..."
            />
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imagen * (Elige un método)
            </label>
            
            {/* Preview */}
            {editingContest.image_url ? (
              <div className="mb-3">
                <img
                  src={editingContest.image_url}
                  alt="preview"
                  className="w-full h-40 object-cover rounded-lg border-2 border-amber-200"
                />
              </div>
            ) : null}

            {/* Toggle Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setUseImageUrl(false);
                  setImageUrlInput('');
                }}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  !useImageUrl
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Subir Archivo
              </button>
              <button
                type="button"
                onClick={() => setUseImageUrl(true)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  useImageUrl
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pegar URL
              </button>
            </div>

            {/* Subir Archivo */}
            {!useImageUrl ? (
              <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-all">
                <ImageIcon className="w-5 h-5 mr-2 text-amber-600" />
                <span className="text-amber-700 font-semibold">
                  {isUploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                </span>
                <input
                  type="file"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                  accept="image/*"
                />
              </label>
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (imageUrlInput.trim()) {
                      setEditingContest({ ...editingContest, image_url: imageUrlInput.trim() });
                      setMessage({ type: 'success', text: 'URL de imagen agregada' });
                    } else {
                      setMessage({ type: 'error', text: 'Ingresa una URL válida' });
                    }
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-semibold transition-all"
                >
                  Confirmar URL
                </button>
                <p className="text-xs text-gray-500">
                  Usa URLs de Unsplash, Wikipedia, Dropbox, Google Drive, etc.
                </p>
              </div>
            )}
          </div>

          {/* Pregunta */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Pregunta *
            </label>
            <textarea
              value={editingContest.question || ''}
              onChange={(e) =>
                setEditingContest({ ...editingContest, question: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={2}
              placeholder="Ej: ¿En qué década fue tomada esta foto?"
            />
          </div>

          {/* Respuestas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Opciones de Respuesta (máx 3) *
            </label>
            <div className="space-y-3">
              {editingAnswers.map((answer, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={answer.answer_text || ''}
                      onChange={(e) => {
                        const newAnswers = [...editingAnswers];
                        newAnswers[idx].answer_text = e.target.value;
                        setEditingAnswers(newAnswers);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder={`Opción ${idx + 1}`}
                    />
                  </div>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={answer.is_correct || false}
                      onChange={(e) => {
                        const newAnswers = [...editingAnswers];
                        newAnswers[idx].is_correct = e.target.checked;
                        setEditingAnswers(newAnswers);
                      }}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-sm font-semibold text-green-700">Correcta</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Ganador */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre del Ganador (mostrado públicamente)
            </label>
            <input
              type="text"
              value={editingContest.winner_name || ''}
              onChange={(e) =>
                setEditingContest({ ...editingContest, winner_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Ej: Juan García"
            />
          </div>

          {/* Estado */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editingContest.is_active || false}
              onChange={(e) =>
                setEditingContest({ ...editingContest, is_active: e.target.checked })
              }
              className="w-4 h-4 accent-amber-600"
            />
            <span className="font-semibold text-gray-700">Activo</span>
          </label>

          {/* Botones */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                setEditingContest(null);
                setEditingAnswers([]);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.form>
      )}

      {/* Lista de Concursos */}
      <div className="space-y-3">
        {contests.map((contest) => (
          <motion.div
            key={contest.id}
            layout
            className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
          >
            <div className="flex gap-4 items-start">
              {/* Imagen */}
              {contest.image_url && (
                <img
                  src={contest.image_url}
                  alt={contest.title}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              )}

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{contest.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{contest.question}</p>
                    {contest.winner_name && (
                      <p className="text-sm font-semibold text-amber-700 mt-2">
                        👑 Ganador: {contest.winner_name}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      contest.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {contest.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Botones */}
                <div className="flex gap-2 mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEditContest(contest)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm flex items-center gap-1 hover:bg-blue-200 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggleActive(contest)}
                    className={`px-3 py-1 rounded-lg font-semibold text-sm ${
                      contest.is_active
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } transition-all`}
                  >
                    {contest.is_active ? 'Desactivar' : 'Activar'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteContest(contest.id)}
                    disabled={isDeleting === contest.id}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg font-semibold text-sm flex items-center gap-1 hover:bg-red-200 disabled:opacity-50 transition-all"
                  >
                    {isDeleting === contest.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Eliminar
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {contests.length === 0 && !editingContest && (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">No hay concursos creados</p>
          <p className="text-sm text-gray-500">Crea uno para comenzar</p>
        </div>
      )}
    </div>
  );
};
