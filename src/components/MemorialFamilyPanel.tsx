import React, { useEffect, useState } from 'react';
import {
  Lock, KeyRound, Loader2, Upload, X, Check, Trash2, CheckCircle2, XCircle, Megaphone,
} from 'lucide-react';
import { Memorial, MemorialGuestbookEntry } from '../types';
import { memorialRequest } from '../memorialApi';
import { supabase } from '../supabase';

const editorSessionKey = (slug: string) => `jardin_editor_${slug}`;

interface Props {
  memorial: Memorial;
  onMemorialUpdated: (patch: Partial<Memorial>) => void;
}

// Panel limitado para que la familia (no el súper admin) edite lo esencial
// de su propio memorial, sin tocar video, música, historia ni privacidad.
export const MemorialFamilyPanel: React.FC<Props> = ({ memorial, onMemorialUpdated }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [epitaph, setEpitaph] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerActive, setBannerActive] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);

  const [guestbook, setGuestbook] = useState<MemorialGuestbookEntry[]>([]);
  const [guestbookLoading, setGuestbookLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(editorSessionKey(memorial.slug)) || '';
    setSessionToken(token);
    setUnlocked(false);
    setShowLogin(false);
    setEmailInput('');
    setPasswordInput('');
    setLoginError('');
    if (!token) return;
    let active = true;
    memorialRequest<{ guestbook: MemorialGuestbookEntry[] }>('/api/memorials', {
      action: 'load', memorialId: memorial.id,
    }, token).then(result => {
      if (active) {
        setGuestbook(result.guestbook || []);
        setUnlocked(true);
      }
    }).catch(() => {
      localStorage.removeItem(editorSessionKey(memorial.slug));
      if (active) setSessionToken('');
    });
    return () => { active = false; };
  }, [memorial.slug]);

  useEffect(() => {
    setFullName(memorial.full_name || '');
    setBirthDate(memorial.birth_date || '');
    setDeathDate(memorial.death_date || '');
    setEpitaph(memorial.epitaph || '');
    setPhotoUrl(memorial.photo_url || '');
    setBannerMessage(memorial.banner_message || '');
    setBannerActive(!!memorial.banner_active);
  }, [memorial]);

  const loadGuestbook = async (token: string) => {
    setGuestbookLoading(true);
    try {
      const result = await memorialRequest<{ guestbook: MemorialGuestbookEntry[] }>('/api/memorials', {
        action: 'load', memorialId: memorial.id,
      }, token);
      setGuestbook(result.guestbook || []);
    } finally {
      setGuestbookLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let result: { sessionToken: string; memorial: Memorial };
    try {
      result = await memorialRequest<{ sessionToken: string; memorial: Memorial }>('/api/memorials', {
        action: 'login', slug: memorial.slug, email: emailInput, password: passwordInput,
      });
    } catch {
      setLoginError('Correo o contraseña incorrectos.');
      return;
    }
    localStorage.setItem(editorSessionKey(memorial.slug), result.sessionToken);
    setSessionToken(result.sessionToken);
    onMemorialUpdated(result.memorial);
    setUnlocked(true);
    setLoginError('');
    try {
      await loadGuestbook(result.sessionToken);
    } catch {
      console.error('La sesión se inició, pero no se pudo cargar el libro de visitas.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(editorSessionKey(memorial.slug));
    setSessionToken('');
    setUnlocked(false);
    setShowLogin(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const fileName = `memorials/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      setPhotoUrl(urlData.publicUrl);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const patch = {
      full_name: fullName.trim(),
      birth_date: birthDate.trim() || null,
      death_date: deathDate.trim() || null,
      epitaph: epitaph.trim() || null,
      photo_url: photoUrl.trim() || null,
    };
    try {
      await memorialRequest('/api/memorials', { action: 'profile', memorialId: memorial.id, ...patch }, sessionToken);
      onMemorialUpdated(patch);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (error) {
      console.error('No se pudo guardar el perfil familiar:', error);
    }
    setSavingProfile(false);
  };

  const saveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBanner(true);
    const patch = { banner_message: bannerMessage.trim() || null, banner_active: bannerActive };
    try {
      await memorialRequest('/api/memorials', { action: 'banner', memorialId: memorial.id, ...patch }, sessionToken);
      onMemorialUpdated(patch);
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 2500);
    } catch (error) {
      console.error('No se pudo guardar el aviso familiar:', error);
    }
    setSavingBanner(false);
  };

  const moderate = async (entryId: string, status: 'approved' | 'rejected') => {
    try {
      await memorialRequest('/api/memorials', { action: 'moderate', memorialId: memorial.id, entryId, status }, sessionToken);
      setGuestbook(prev => prev.map(g => (g.id === entryId ? { ...g, status } : g)));
    } catch (error) {
      console.error('No se pudo moderar el recuerdo:', error);
    }
  };

  const removeEntry = async (entryId: string) => {
    if (!confirm('¿Eliminar este mensaje?')) return;
    try {
      await memorialRequest('/api/memorials', { action: 'delete-entry', memorialId: memorial.id, entryId }, sessionToken);
      setGuestbook(prev => prev.filter(g => g.id !== entryId));
    } catch (error) {
      console.error('No se pudo eliminar el recuerdo:', error);
    }
  };

  if (!memorial.has_family_editor) return null;

  if (!unlocked) {
    return (
      <div className="text-center">
        {showLogin ? (
          <form onSubmit={handleLogin} className="max-w-xs mx-auto space-y-2 bg-sepia-900/40 border border-sepia-800 rounded-2xl p-4">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Tu correo"
              required
              className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Contraseña"
              required
              className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
            />
            {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-sepia-600 hover:bg-sepia-500 text-sepia-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
              <KeyRound className="w-4 h-4" /> Entrar
            </button>
          </form>
        ) : (
          <button onClick={() => setShowLogin(true)} className="text-sepia-600 hover:text-sepia-400 text-xs underline underline-offset-2 transition-colors">
            ¿Eres familiar? Administra este memorial
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-sepia-900/40 border border-sepia-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sepia-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4" /> Panel de familia</h3>
        <button onClick={handleLogout} className="text-sepia-600 hover:text-sepia-400 text-xs underline underline-offset-2">Cerrar sesión</button>
      </div>

      {/* Información editable */}
      <form onSubmit={saveProfile} className="space-y-2 border-t border-sepia-800 pt-4">
        {photoUrl && (
          <div className="relative inline-flex rounded-xl overflow-hidden border border-sepia-700 bg-sepia-950">
            <img src={photoUrl} alt={fullName} className="w-20 h-20 object-cover" />
            <button type="button" onClick={() => setPhotoUrl('')} className="absolute top-1 right-1 bg-red-900/80 text-red-300 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer bg-sepia-950 border border-dashed border-sepia-700 rounded-xl px-3 py-2 hover:border-sepia-500 transition-all w-fit">
          {isUploadingPhoto ? <Loader2 className="w-4 h-4 text-sepia-400 animate-spin" /> : <Upload className="w-4 h-4 text-sepia-400" />}
          <span className="text-sepia-400 text-xs">{isUploadingPhoto ? 'Subiendo…' : 'Cambiar foto'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
          required
          className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="Fecha de nacimiento" className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
          <input type="text" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} placeholder="Fecha de fallecimiento" className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm" />
        </div>
        <textarea
          value={epitaph}
          onChange={(e) => setEpitaph(e.target.value)}
          placeholder="Epitafio o frase…"
          rows={2}
          className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm resize-none"
        />
        <button type="submit" disabled={savingProfile} className="flex items-center gap-2 bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Guardar cambios
        </button>
        {profileSaved && <p className="text-green-400 text-xs">Guardado.</p>}
      </form>

      {/* Aviso / banner */}
      <form onSubmit={saveBanner} className="space-y-2 border-t border-sepia-800 pt-4">
        <label className="text-sepia-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Megaphone className="w-4 h-4" /> Aviso destacado</label>
        <textarea
          value={bannerMessage}
          onChange={(e) => setBannerMessage(e.target.value)}
          placeholder="Ej: Agradecemos sus condolencias. Misa de aniversario el 12 de octubre."
          rows={2}
          className="w-full bg-sepia-950 border border-sepia-700 rounded-xl px-3 py-2 text-sepia-100 placeholder-sepia-600 outline-none focus:border-sepia-500 text-sm resize-none"
        />
        <label className="flex items-center gap-2 text-sepia-400 text-xs cursor-pointer">
          <input type="checkbox" checked={bannerActive} onChange={(e) => setBannerActive(e.target.checked)} className="accent-red-500" />
          Mostrar este aviso en rojo arriba del memorial
        </label>
        <button type="submit" disabled={savingBanner} className="flex items-center gap-2 bg-sepia-600 hover:bg-sepia-500 disabled:opacity-50 text-sepia-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
          {savingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Guardar aviso
        </button>
        {bannerSaved && <p className="text-green-400 text-xs">Guardado.</p>}
      </form>

      {/* Moderación de recuerdos */}
      <div className="space-y-2 border-t border-sepia-800 pt-4">
        <label className="text-sepia-300 text-xs font-bold uppercase tracking-widest">Recuerdos del libro de visitas</label>
        {guestbookLoading ? (
          <Loader2 className="w-4 h-4 text-sepia-500 animate-spin" />
        ) : guestbook.length === 0 ? (
          <p className="text-sepia-600 text-xs">Aún no hay recuerdos.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {guestbook.map(g => (
              <div key={g.id} className="bg-sepia-950/60 border border-sepia-800 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sepia-200 text-xs font-semibold">{g.visitor_name}</p>
                  <span className={`text-[10px] uppercase tracking-widest ${g.status === 'approved' ? 'text-green-400' : g.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                    {g.status === 'approved' ? 'Publicado' : g.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-sepia-400 text-xs mt-1">{g.message}</p>
                {g.photo_url && <img src={g.photo_url} alt="" className="mt-2 max-h-24 rounded-lg" />}
                <div className="flex items-center gap-3 mt-2">
                  {g.status !== 'approved' && (
                    <button onClick={() => moderate(g.id, 'approved')} className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobar</button>
                  )}
                  {g.status !== 'rejected' && (
                    <button onClick={() => moderate(g.id, 'rejected')} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs"><XCircle className="w-3.5 h-3.5" /> Rechazar</button>
                  )}
                  <button onClick={() => removeEntry(g.id)} className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
