import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Key, Clock, ShieldCheck, ArrowRight, Lock, Volume2, Loader2, X } from 'lucide-react';
import { supabase } from '../supabase';

interface FamilyTreeAccessProps {
  onAccess: (keyId: string, treeId: string | null) => void;
}

export const FamilyTreeAccess = ({ onAccess }: FamilyTreeAccessProps) => {
  const [keyCode, setKeyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyCode) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('Verificando clave:', keyCode.trim().toUpperCase());
      // 1. Verificar la clave
      const { data: keyData, error: keyError } = await supabase
        .from('access_keys')
        .select('*')
        .eq('key_code', keyCode.trim().toUpperCase())
        .single();

      if (keyError || !keyData) {
        console.error('Error de clave:', keyError);
        throw new Error('Clave no válida. Asegúrate de copiarla exactamente como aparece en el panel.');
      }

      // 2. Verificar expiración
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        throw new Error('Esta clave ha caducado.');
      }

      // 3. Si la clave es válida pero no tiene fecha de expiración, 
      // significa que es el primer uso. La activamos.
      if (!keyData.expires_at) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + keyData.duration_days);
        
        await supabase
          .from('access_keys')
          .update({ expires_at: expiryDate.toISOString() })
          .eq('id', keyData.id);
      }

      // 4. Buscar si ya tiene un árbol asociado
      const { data: treeData } = await supabase
        .from('family_trees')
        .select('id')
        .eq('access_key_id', keyData.id)
        .single();

      onAccess(keyData.id, treeData?.id || null);
    } catch (err: any) {
      setError(err.message || 'Error al verificar la clave.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo de pantalla completa con la imagen proporcionada */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://image2url.com/r2/default/images/1774454338284-12d67447-62a4-4a62-8bed-b6cef258b82e.png" 
          alt="Fondo Árbol Genealógico" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        {/* Overlay para mejorar legibilidad */}
        <div className="absolute inset-0 bg-sepia-950/40 backdrop-blur-[3px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[3.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] border border-white/20 text-center relative z-10"
      >
        {/* Adorno superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-sepia-500 rounded-b-full"></div>
        
        <div className="w-24 h-24 bg-sepia-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-white">
          <Lock className="text-sepia-600 w-10 h-10" />
        </div>

        <h2 className="text-4xl font-serif text-sepia-950 mb-4 tracking-tight">Árbol Genealógico®</h2>
        <p className="text-sepia-700 mb-10 font-light leading-relaxed text-lg">
          Introduce tu clave de acceso para comenzar a tejer la historia de tu linaje.
        </p>

        <form onSubmit={handleAccess} className="space-y-6">
          <div className="relative group">
            <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-sepia-400 w-6 h-6 group-focus-within:text-sepia-600 transition-colors" />
            <input 
              autoFocus
              type="text"
              value={keyCode}
              onChange={e => setKeyCode(e.target.value)}
              placeholder="CLAVE DE ACCESO"
              className="w-full bg-sepia-50/50 border-2 border-sepia-100 rounded-3xl py-5 pl-14 pr-6 text-center outline-none focus:border-sepia-500 focus:bg-white transition-all text-sepia-950 font-black tracking-[0.3em] uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-sepia-300"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-600 text-sm font-bold bg-red-50 border border-red-100 py-3 px-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-sepia-950 text-sepia-100 py-6 rounded-3xl font-black uppercase tracking-[0.25em] text-sm hover:bg-sepia-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-sepia-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Entrar al Portal <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-10 border-t border-sepia-200/50">
          <p className="text-sepia-500 text-xs font-black uppercase tracking-[0.2em] mb-4">¿No tienes acceso?</p>
          <p className="text-sepia-700 text-sm mb-8 leading-relaxed px-4">
            Este portal es exclusivo para clientes. Pregunta por nuestros paquetes de acceso de <b>7, 15 o 30 días</b>.
          </p>
          
          <a 
            href="https://wa.me/5214444237092?text=Hola%20Charlitron,%20me%20gustaría%20información%20sobre%20los%20paquetes%20de%20acceso%20al%20Árbol%20Genealógico."
            target="_blank"
            rel="noreferrer"
            className="group relative inline-flex items-center gap-3 bg-[#25D366] text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#128C7E] hover:scale-105 transition-all shadow-[0_10px_20px_-5px_rgba(37,211,102,0.4)]"
          >
            <Volume2 className="w-5 h-5 animate-pulse" />
            Preguntar por Paquetes
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
          <div className="flex flex-col items-center gap-1">
            <Clock className="w-5 h-5 text-sepia-900" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Temporal</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-5 h-5 text-sepia-900" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Protegido</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Key className="w-5 h-5 text-sepia-900" />
            <span className="text-[9px] font-black uppercase tracking-tighter">Privado</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
