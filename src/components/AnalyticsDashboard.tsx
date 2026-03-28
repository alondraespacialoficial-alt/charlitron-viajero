import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, TrendingUp, ChevronDown } from 'lucide-react';
import { fetchAnalytics, formatViewCount } from '../analyticsUtils';

interface PageView {
  id: string;
  page_type: string;
  page_id?: string;
  page_title?: string;
  view_count: number;
  last_viewed_at: string;
  created_at: string;
  updated_at: string;
}

export const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await fetchAnalytics();
    if (data) {
      setAnalytics(data);
    }
    setLoading(false);
  };

  // Agrupar por tipo de página
  const groupedByType = analytics.reduce((acc, item) => {
    if (!acc[item.page_type]) {
      acc[item.page_type] = [];
    }
    acc[item.page_type].push(item);
    return acc;
  }, {} as Record<string, PageView[]>);

  // Calcular totales por tipo
  const totals = Object.entries(groupedByType).map(([type, itemsGroup]) => {
    const itemsArray = itemsGroup as PageView[];
    return {
      type,
      total: itemsArray.reduce((sum, item) => sum + item.view_count, 0),
      count: itemsArray.length,
    };
  });

  const totalViews = totals.reduce((sum, item) => sum + item.total, 0);

  // Filtrar datos
  const displayedData =
    filterType === 'all'
      ? analytics
      : analytics.filter((item) => item.page_type === filterType);

  const typeLabels: Record<string, string> = {
    story: '📜 Historias',
    gallery: '🖼️ Galería Restaurada',
    shop: '🛍️ Tienda',
    historians: '👥 Historiadores',
    investigation: '📋 Investigación',
    family_tree: '🌳 Árbol Genealógico',
    home: '🏠 Inicio',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif text-sepia-100 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-sepia-500" />
          Dashboard de Analíticas
        </h3>
      </div>

      {/* Resumen Total */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sepia-800/50 rounded-xl p-6 border border-sepia-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sepia-400 text-sm font-semibold mb-2">Vistas Totales</p>
            <p className="text-4xl font-bold text-sepia-100">{formatViewCount(totalViews)}</p>
            <p className="text-sepia-500 text-xs mt-2">
              {analytics.length} páginas / secciones rastreadas
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-sepia-500 opacity-50" />
        </div>
      </motion.div>

      {/* Resumen por Tipo */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-sepia-400 mb-3">
          Vistas por Tipo de Página
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {totals.map((item) => (
            <motion.button
              key={item.type}
              whileHover={{ scale: 1.05 }}
              onClick={() =>
                setFilterType(filterType === item.type ? 'all' : item.type)
              }
              className={`p-4 rounded-lg text-left transition-all ${
                filterType === item.type
                  ? 'bg-sepia-500 text-sepia-950'
                  : 'bg-sepia-800/30 text-sepia-100 hover:bg-sepia-800/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">
                  {typeLabels[item.type] || item.type}
                </span>
                <Eye className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{formatViewCount(item.total)}</p>
              <p className="text-xs opacity-75 mt-1">
                {item.count} {item.count === 1 ? 'ítem' : 'ítems'}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Detalle de Vistas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-sepia-400">
            Detalles por Página
          </h4>
          {filterType !== 'all' && (
            <button
              onClick={() => setFilterType('all')}
              className="text-xs text-sepia-500 hover:text-sepia-300"
            >
              Mostrar todos
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-sepia-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayedData.length === 0 ? (
          <div className="text-center py-8 text-sepia-500">
            <p className="text-sm">No hay datos de analíticas aún.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayedData.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-sepia-800/20 rounded-lg p-3 flex items-center justify-between border border-sepia-700/50 hover:bg-sepia-800/40 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-sepia-500">
                      {typeLabels[item.page_type] || item.page_type}
                    </span>
                  </div>
                  <p className="text-sm text-sepia-100 truncate font-semibold">
                    {item.page_title || 'Sin título'}
                  </p>
                  <p className="text-xs text-sepia-500 mt-1">
                    Última vista:{' '}
                    {new Date(item.last_viewed_at).toLocaleDateString('es-AR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-xl font-bold text-sepia-400">
                    {formatViewCount(item.view_count)}
                  </p>
                  <p className="text-xs text-sepia-600">
                    {item.view_count === 1 ? 'vista' : 'vistas'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Botón Refrescar */}
      <button
        onClick={loadAnalytics}
        disabled={loading}
        className="w-full bg-sepia-700 hover:bg-sepia-600 text-sepia-100 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50"
      >
        {loading ? 'Cargando...' : 'Refrescar Datos'}
      </button>
    </div>
  );
};
