import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Copy, Check, AlertCircle, Share2, Zap } from 'lucide-react';
import { Contest, ContestAnswer, ContestCode, ContestWinner } from '../types';
import { supabase } from '../supabase';

export const ContestsSection: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [answers, setAnswers] = useState<ContestAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<ContestCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [winner, setWinner] = useState<ContestWinner | null>(null);
  const [userSessionId] = useState(() => {
    let sid = localStorage.getItem('contest_session_id');
    if (!sid) {
      sid = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('contest_session_id', sid);
    }
    return sid;
  });
  const [hasParticipated, setHasParticipated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setContests(data);
        if (data.length > 0 && !selectedContest) {
          setSelectedContest(data[0]);
          fetchAnswers(data[0].id);
          checkWinner(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching contests:', err);
      setError('Error al cargar concursos');
    }
  };

  const fetchAnswers = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_answers')
        .select('*')
        .eq('contest_id', contestId)
        .order('answer_order', { ascending: true });

      if (error) throw error;
      if (data) setAnswers(data);
      
      // Verificar si este usuario ya participó
      checkParticipation(contestId);
    } catch (err) {
      console.error('Error fetching answers:', err);
    }
  };

  const checkParticipation = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_participations')
        .select('*')
        .eq('contest_id', contestId)
        .eq('user_session_id', userSessionId);

      if (error) throw error;
      if (data && data.length > 0) {
        setHasParticipated(true);
        // Si ya participó, mostrar si ganó
        if (data[0].is_correct) {
          const codeData = await supabase
            .from('contest_codes')
            .select('*')
            .eq('contest_id', contestId)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (codeData.data && codeData.data.length > 0) {
            setGeneratedCode(codeData.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error checking participation:', err);
    }
  };

  const checkWinner = async (contestId: string) => {
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
      console.error('Error checking winner:', err);
    }
  };

  const handleSelectContest = (contest: Contest) => {
    setSelectedContest(contest);
    setSelectedAnswer(null);
    setGeneratedCode(null);
    setHasParticipated(false);
    setError(null);
    fetchAnswers(contest.id);
    checkWinner(contest.id);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedContest || !selectedAnswer) {
      setError('Selecciona una respuesta');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Verificar si la respuesta es correcta
      const correctAnswer = answers.find(a => a.is_correct);
      const isCorrect = selectedAnswer === correctAnswer?.id;

      // Registrar la participación
      const { error: participationError } = await supabase
        .from('contest_participations')
        .insert({
          contest_id: selectedContest.id,
          user_session_id: userSessionId,
          selected_answer_id: selectedAnswer,
          is_correct: isCorrect,
        });

      if (participationError) {
        // Si el error es porque ya participó
        if (participationError.message.includes('duplicate')) {
          setError('Ya participaste en este concurso');
          setHasParticipated(true);
          return;
        }
        throw participationError;
      }

      if (isCorrect) {
        // Generar código único
        const newCode = `VIAJERO${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        const { data: codeData, error: codeError } = await supabase
          .from('contest_codes')
          .insert({
            contest_id: selectedContest.id,
            code: newCode,
          })
          .select();

        if (codeError) throw codeError;

        if (codeData) {
          setGeneratedCode(codeData[0]);
          setHasParticipated(true);
          
          // Registrar como ganador potencial
          await supabase
            .from('contest_winners')
            .insert({
              contest_id: selectedContest.id,
              user_session_id: userSessionId,
              code_id: codeData[0].id,
              user_name: 'Anónimo',
            });
        }
      } else {
        setError('❌ Respuesta incorrecta. Intenta en el siguiente concurso.');
        setHasParticipated(true);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Error al enviar respuesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnSocial = async () => {
    if (!generatedCode) return;

    const text = `🎉 ¡Ganador en Charlitron el Viajero! Código de premio: ${generatedCode.code}\n\n¿Quieres participar también? Descarga la app y demuestra tu conocimiento.`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Gané en Charlitron!',
          text: text,
          url: url,
        });
        
        // Marcar como compartido
        await supabase
          .from('contest_winners')
          .update({ shared_on_social: true })
          .eq('code_id', generatedCode.id);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback para navegadores que no soportan Web Share API
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Encabezado */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600">
              Concursos Viajeros
            </h1>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-gray-600">Demuestra tu conocimiento y gana códigos exclusivos</p>
        </motion.div>

        {/* Carrusel de Concursos */}
        {contests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
              {contests.map((contest) => (
                <motion.button
                  key={contest.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectContest(contest)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full whitespace-nowrap font-semibold transition-all snap-center ${
                    selectedContest?.id === contest.id
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'bg-white text-amber-700 border-2 border-amber-200'
                  }`}
                >
                  {contest.title}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Concurso Seleccionado */}
        {selectedContest && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedContest.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Imagen del Concurso */}
              <div className="relative w-full overflow-hidden bg-black" style={{aspectRatio: '16/9'}}>
                <img
                  src={selectedContest.image_url}
                  alt={selectedContest.title}
                  className="w-full h-full object-contain"
                />
                {winner?.user_name && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    Ganador: {winner.user_name}
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Pregunta */}
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{selectedContest.question}</h2>

                {/* Opciones de Respuesta */}
                {!hasParticipated && !generatedCode ? (
                  <div className="space-y-3 mb-6">
                    {answers.map((answer) => (
                      <motion.button
                        key={answer.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAnswer(answer.id)}
                        className={`w-full p-4 rounded-xl border-2 font-semibold transition-all ${
                          selectedAnswer === answer.id
                            ? 'border-amber-600 bg-amber-50 text-amber-900'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-300'
                        }`}
                      >
                        {answer.answer_text}
                      </motion.button>
                    ))}
                  </div>
                ) : null}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-gap-2"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700">{error}</span>
                  </motion.div>
                )}

                {/* Código Generado */}
                {generatedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6"
                  >
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Check className="w-6 h-6 text-green-600" />
                      <span className="text-lg font-bold text-green-700">¡CORRECTO!</span>
                    </div>
                    <p className="text-center text-gray-600 mb-4">Tu código ganador:</p>
                    <div className="bg-white rounded-lg p-4 border-2 border-green-300 mb-4">
                      <code className="text-2xl font-mono font-bold text-green-700 text-center block">
                        {generatedCode.code}
                      </code>
                    </div>
                    <p className="text-center text-sm text-gray-600 mb-4">
                      📱 Comparte este código en los comentarios de la publicación en redes
                    </p>
                  </motion.div>
                )}

                {/* Botones de Acción */}
                {!hasParticipated && !generatedCode && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer || isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}
                  </motion.button>
                )}

                {generatedCode && (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyCodeToClipboard}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {copied ? 'Copiado' : 'Copiar Código'}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={shareOnSocial}
                      className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Compartir en Redes
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Sin Concursos */}
        {contests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-2xl"
          >
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay concursos activos en este momento</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
