import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Settings, Save, BarChart3, Download } from 'lucide-react';

interface InstallSetting {
  key: string;
  value: string;
}

interface InstallEvent {
  id: string;
  created_at: string;
  event_type: string;
  outcome: string | null;
  browser: string | null;
  operating_system: string | null;
}

export const InstallPromptAdmin: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<InstallEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadSettings();
    loadEvents();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('install_settings')
        .select('key, value');

      if (error) throw error;

      const settingsObj: Record<string, string> = {};
      data?.forEach(row => {
        settingsObj[row.key] = row.value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Error cargando ajustes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('install_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('install_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
      }
      setSuccessMessage('Configuración guardada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAnalyticsSummary = () => {
    const shown = events.filter(e => e.event_type === 'banner_shown').length;
    const attempted = events.filter(e => e.event_type === 'install_attempted').length;
    const accepted = events.filter(e => e.event_type === 'install_attempted' && e.outcome === 'accepted').length;
    const dismissed = events.filter(e => e.outcome === 'dismissed').length;
    const instructionsViewed = events.filter(e => e.event_type === 'instructions_viewed').length;

    const conversionRate = shown > 0 ? ((attempted / shown) * 100).toFixed(1) : '0';
    const acceptanceRate = attempted > 0 ? ((accepted / attempted) * 100).toFixed(1) : '0';

    return {
      shown,
      attempted,
      accepted,
      dismissed,
      instructionsViewed,
      conversionRate,
      acceptanceRate
    };
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  const summary = getAnalyticsSummary();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Download className="w-6 h-6" />
          Configuración de Instalación de App
        </h2>
        <p className="text-sm text-gray-500 mt-1">Personaliza el banner y las instrucciones de instalación</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setShowAnalytics(false)}
          className={`pb-2 px-4 font-medium transition-colors ${
            !showAnalytics
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Configuración
        </button>
        <button
          onClick={() => setShowAnalytics(true)}
          className={`pb-2 px-4 font-medium transition-colors ${
            showAnalytics
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Analíticas
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          ✓ {successMessage}
        </div>
      )}

      {/* Configuration Tab */}
      {!showAnalytics && (
        <div className="space-y-6">
          {/* General */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">⚙️ Configuración General</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner activo
              </label>
              <select
                value={settings.banner_enabled || 'true'}
                onChange={(e) => handleSettingChange('banner_enabled', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Mostrar</option>
                <option value="false">Ocultar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mostrar botón de instrucciones
              </label>
              <select
                value={settings.show_instructions_button || 'true'}
                onChange={(e) => handleSettingChange('show_instructions_button', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Mostrar</option>
                <option value="false">Ocultar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rastreo activo
              </label>
              <select
                value={settings.tracking_enabled || 'true'}
                onChange={(e) => handleSettingChange('tracking_enabled', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Activado</option>
                <option value="false">Desactivado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días antes de volver a mostrar (después de rechazar)
              </label>
              <input
                type="number"
                value={settings.dismiss_days || '7'}
                onChange={(e) => handleSettingChange('dismiss_days', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="90"
              />
            </div>
          </div>

          {/* Banner Texts */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">📱 Textos del Banner</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del banner
              </label>
              <input
                type="text"
                value={settings.banner_title || ''}
                onChange={(e) => handleSettingChange('banner_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtítulo del banner
              </label>
              <input
                type="text"
                value={settings.banner_subtitle || ''}
                onChange={(e) => handleSettingChange('banner_subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto del botón Instalar
              </label>
              <input
                type="text"
                value={settings.install_button_text || ''}
                onChange={(e) => handleSettingChange('install_button_text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Instructions Modal */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">📖 Textos de Instrucciones</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del modal
              </label>
              <input
                type="text"
                value={settings.instructions_title || ''}
                onChange={(e) => handleSettingChange('instructions_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Step 1 */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">Paso 1</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={settings.instructions_step1_title || ''}
                  onChange={(e) => handleSettingChange('instructions_step1_title', e.target.value)}
                  placeholder="Título"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  value={settings.instructions_step1_desc || ''}
                  onChange={(e) => handleSettingChange('instructions_step1_desc', e.target.value)}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">Paso 2</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={settings.instructions_step2_title || ''}
                  onChange={(e) => handleSettingChange('instructions_step2_title', e.target.value)}
                  placeholder="Título"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  value={settings.instructions_step2_desc || ''}
                  onChange={(e) => handleSettingChange('instructions_step2_desc', e.target.value)}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">Paso 3</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={settings.instructions_step3_title || ''}
                  onChange={(e) => handleSettingChange('instructions_step3_title', e.target.value)}
                  placeholder="Título"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  value={settings.instructions_step3_desc || ''}
                  onChange={(e) => handleSettingChange('instructions_step3_desc', e.target.value)}
                  placeholder="Descripción"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      )}

      {/* Analytics Tab */}
      {showAnalytics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{summary.shown}</div>
              <div className="text-sm text-gray-600">Banners mostrados</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{summary.attempted}</div>
              <div className="text-sm text-gray-600">Intentos de instalación</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{summary.accepted}</div>
              <div className="text-sm text-gray-600">Instalaciones exitosas</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{summary.dismissed}</div>
              <div className="text-sm text-gray-600">Rechazados</div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <div className="text-2xl font-bold text-pink-600">{summary.instructionsViewed}</div>
              <div className="text-sm text-gray-600">Instrucciones vistas</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-600">{summary.conversionRate}%</div>
              <div className="text-sm text-gray-600">Tasa de conversión</div>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-2 text-left font-semibold">Evento</th>
                    <th className="px-4 py-2 text-left font-semibold">Resultado</th>
                    <th className="px-4 py-2 text-left font-semibold">Navegador</th>
                    <th className="px-4 py-2 text-left font-semibold">SO</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-t border-gray-200 hover:bg-gray-100">
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">{event.event_type}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          event.outcome === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : event.outcome === 'dismissed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : event.outcome === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.outcome || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{event.browser || '-'}</td>
                      <td className="px-4 py-2 text-gray-600">{event.operating_system || '-'}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No hay eventos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
