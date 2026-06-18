import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Users, Ticket, X, Send, CheckCircle2, AlertCircle, DollarSign, Clock } from 'lucide-react';
import { Conference, ConferenceTicket } from '../types';
import { supabase } from '../supabase';

export const ConferencesSection: React.FC = () => {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<ConferenceTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    attendee_name: '',
    attendee_email: '',
    attendee_phone: '',
  });

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      const { data, error } = await supabase
        .from('conferences')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true });
      if (error) throw error;
      if (data) setConferences(data);
    } catch (err) {
      console.error('Error fetching conferences:', err);
    }
  };

  const handleOpenForm = (conference: Conference) => {
    setSelectedConference(conference);
    setShowForm(true);
    setSubmittedTicket(null);
    setError(null);
    setForm({ attendee_name: '', attendee_email: '', attendee_phone: '' });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedConference(null);
    setSubmittedTicket(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConference) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('conference_tickets')
        .insert([{
          conference_id: selectedConference.id,
          folio: '',
          attendee_name: form.attendee_name.trim() || 'Anónimo',
          attendee_email: form.attendee_email.trim().toLowerCase() || 'sin-correo@reserva.local',
          attendee_phone: form.attendee_phone.trim() || null,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      setSubmittedTicket(data);
    } catch (err: any) {
      console.error('Error registering ticket:', err);
      setError('Ocurrió un error al registrar tu boleto. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Entrada libre';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);
  };

  if (conferences.length === 0) {
    return (
      <section className="py-24 px-6 bg-sepia-950 min-h-[40vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Ticket className="w-12 h-12 text-sepia-700 mx-auto" />
          <h2 className="text-2xl font-serif text-sepia-300">Sin conferencias por el momento</h2>
          <p className="text-sepia-500">Pronto habrá nuevos eventos. ¡Estate al pendiente!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-6 bg-sepia-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Ticket className="text-sepia-500 w-6 h-6" />
            <span className="text-sepia-500 uppercase tracking-widest text-xs font-bold">Eventos y Conferencias</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-sepia-100">
            Próximos Eventos
          </h2>
          <p className="text-sepia-400 max-w-xl mx-auto">
            Reserva tu lugar en nuestras conferencias. Recibirás un folio de confirmación.
          </p>
        </div>

        {/* Conference Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {conferences.map((conf) => (
            <motion.div
              key={conf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="bg-sepia-900/50 border border-sepia-800 rounded-2xl overflow-hidden group"
            >
              {/* Banner */}
              {conf.banner_url ? (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={conf.banner_url}
                    alt={conf.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-sepia-800/50 flex items-center justify-center">
                  <Ticket className="w-12 h-12 text-sepia-700" />
                </div>
              )}

              {/* Info */}
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-serif text-sepia-100 line-clamp-2">{conf.title}</h3>
                {conf.description && (
                  <p className="text-sepia-400 text-sm line-clamp-3">{conf.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  {conf.event_date && (
                    <div className="flex items-center gap-2 text-sepia-400">
                      <Calendar className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                      <span>{formatDate(conf.event_date)}</span>
                    </div>
                  )}
                  {conf.location && (
                    <div className="flex items-center gap-2 text-sepia-400">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                      <span>{conf.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sepia-400">
                    <Users className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                    <span>Cupo limitado: {conf.capacity} lugares</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <DollarSign className="w-4 h-4 flex-shrink-0 text-sepia-500" />
                    <span className={conf.price === 0 ? 'text-green-400' : 'text-sepia-200'}>
                      {formatPrice(conf.price)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenForm(conf)}
                  className="w-full mt-4 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  Reservar Boleto
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal Registro */}
      <AnimatePresence>
        {showForm && selectedConference && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleCloseForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-sepia-900 border border-sepia-700 rounded-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-sepia-800">
                <div>
                  <h3 className="text-lg font-serif text-sepia-100">Reservar Boleto</h3>
                  <p className="text-sepia-500 text-sm mt-1 line-clamp-1">{selectedConference.title}</p>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="text-sepia-500 hover:text-sepia-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {submittedTicket ? (
                  /* Confirmación exitosa */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                    <div className="space-y-2">
                      <h4 className="text-xl font-serif text-sepia-100">¡Boleto Registrado!</h4>
                      <p className="text-sepia-400 text-sm">
                        Tu solicitud fue recibida. El pago se confirma manualmente.
                      </p>
                    </div>

                    {/* Folio */}
                    <div className="bg-sepia-800/60 border border-sepia-600 rounded-xl p-5 space-y-3">
                      <p className="text-sepia-400 text-xs uppercase tracking-widest">Tu folio</p>
                      <p className="text-3xl font-mono font-bold text-sepia-100 tracking-wider">
                        {submittedTicket.folio}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Pago pendiente</span>
                      </div>
                    </div>

                    <p className="text-sepia-500 text-sm">
                      Guarda tu folio. Al realizar el pago, el administrador lo marcará como confirmado.
                    </p>

                    <button
                      onClick={handleCloseForm}
                      className="w-full bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all"
                    >
                      Cerrar
                    </button>
                  </motion.div>
                ) : (
                  /* Formulario */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Nombre completo <span className="text-sepia-600 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={form.attendee_name}
                        onChange={(e) => setForm({ ...form, attendee_name: e.target.value })}
                        placeholder="Ej: Juan García López"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Correo electrónico <span className="text-sepia-600 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="email"
                        value={form.attendee_email}
                        onChange={(e) => setForm({ ...form, attendee_email: e.target.value })}
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs uppercase tracking-widest font-bold text-sepia-500">
                        Teléfono <span className="text-sepia-600 font-normal">(opcional)</span>
                      </label>
                      <input
                        type="tel"
                        value={form.attendee_phone}
                        onChange={(e) => setForm({ ...form, attendee_phone: e.target.value })}
                        placeholder="444 123 4567"
                        className="w-full bg-sepia-800 border border-sepia-700 rounded-xl px-4 py-3 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 transition-all"
                      />
                    </div>

                    {selectedConference.price > 0 && (
                      <div className="bg-sepia-800/40 border border-sepia-700 rounded-xl p-4 text-sm text-sepia-400 space-y-1">
                        <p className="font-bold text-sepia-300">Costo: {formatPrice(selectedConference.price)}</p>
                        <p>Al registrarte recibirás un folio. El pago se coordinará por separado y el admin confirmará tu lugar.</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-sepia-500 hover:bg-sepia-400 disabled:opacity-50 disabled:cursor-not-allowed text-sepia-950 font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-sepia-950/30 border-t-sepia-950 rounded-full animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Reservar mi boleto
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
