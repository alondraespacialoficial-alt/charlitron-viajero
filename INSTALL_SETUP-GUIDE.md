# Guía de Instalación - Sistema de Tracking PWA + Admin Panel

## 📋 Resumen de lo que se implementó

1. **Componente InstallPrompt.tsx** - Banner inteligente + modal de instrucciones con tracking
2. **Componente InstallPromptAdmin.tsx** - Panel de administración con configuración y analíticas
3. **SQL** - Tablas `install_events` e `install_settings` para Supabase
4. **Integración en App.tsx** - Ya está lista

---

## 🗄️ PASO 1: EJECUTAR EL SQL

Copia todo el contenido de `INSTALL_TRACKING.sql` y ejecútalo en **Supabase > SQL Editor**:

```sql
-- Archivo: INSTALL_TRACKING.sql
-- Copia TODO el contenido y ejecuta en Supabase
```

Esto crea:
- Tabla `install_events` - Registra eventos de instalación
- Tabla `install_settings` - Configuración personalizable
- Row Level Security (RLS) para seguridad
- Datos iniciales por defecto

---

## 🎛️ PASO 2: AGREGAR AL ADMIN PANEL

En `AdminPanel.tsx`, en el archivo:

### 2.1 - Agregar la importación en la parte superior:

```tsx
// Línea ~35, después de las otras importaciones
import { InstallPromptAdmin } from './InstallPromptAdmin';
```

### 2.2 - Actualizar el tipo de viewMode:

Busca esta línea (aprox línea 74):
```tsx
const [viewMode, setViewMode] = useState<'stories' | 'historians' | 'restored' | 'travels' | 'settings' | 'family_keys' | 'shop' | 'sponsors' | 'contests' | 'analytics'>('stories');
```

Cámbiala a:
```tsx
const [viewMode, setViewMode] = useState<'stories' | 'historians' | 'restored' | 'travels' | 'settings' | 'family_keys' | 'shop' | 'sponsors' | 'contests' | 'analytics' | 'install_prompt'>('stories');
```

### 2.3 - Agregar botón de tab:

Busca el grid de botones (aproximadamente línea 850-880) donde están `'analytics'` y agrega DESPUÉS:

```tsx
              <button 
                onClick={() => setViewMode('install_prompt')}
                className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${viewMode === 'install_prompt' ? 'bg-sepia-500 text-sepia-950' : 'text-sepia-400 hover:text-sepia-200'}`}
              >
                📱 App
              </button>
```

### 2.4 - Agregar el contenido renderizado:

Busca la sección donde renderiza `{viewMode === 'analytics' ? (` y DESPUÉS de ese cierre, agrega:

```tsx
          {viewMode === 'install_prompt' && (
            <InstallPromptAdmin onClose={onClose} />
          )}
```

---

## ✅ PASO 3: VERIFICAR LA INTEGRACIÓN

1. Los archivos ya están creados:
   - ✓ `src/components/InstallPrompt.tsx` - Implementado en App.tsx
   - ✓ `src/components/InstallPromptAdmin.tsx` - Listo para integrar
   - ✓ `INSTALL_TRACKING.sql` - Listo para ejecutar

2. Solo falta editar el AdminPanel (Paso 2)

---

## 📊 Qué ves en el Admin Panel

### Tab "📱 App" tiene dos secciones:

#### CONFIGURACIÓN
- ✓ Banner activo (on/off)
- ✓ Mostrar botón de instrucciones (on/off)  
- ✓ Rastreo activo (on/off)
- ✓ Días antes de volver a mostrar (1-90)
- ✓ Textos personalizables:
  - Título del banner
  - Subtítulo del banner
  - Texto del botón
  - Todos los pasos del tutorial

#### ANALÍTICAS
- ✓ Banners mostrados
- ✓ Intentos de instalación
- ✓ Instalaciones exitosas
- ✓ Rechazados
- ✓ Instrucciones vistas
- ✓ Tasa de conversión
- ✓ Tabla detallada de eventos

---

## 🎯 Funcionalidades del Sistema

### En el Usuario (Frontend)
- ✅ Banner automático cuando se detecta que se puede instalar
- ✅ Modal de instrucciones paso a paso
- ✅ Botón flotante para ver instrucciones si no se usa el banner
- ✅ localStorage para no molestar si ya rechazó
- ✅ Rastreo automático de eventos

### En el Admin (Backend)
- ✅ Cambiar todos los textos sin código
- ✅ Activar/desactivar el banner con un click
- ✅ Cambiar el tiempo entre intentos (7 días por defecto)
- ✅ Ver estadísticas en tiempo real
- ✅ Tabla completa de eventos para análisis profundo
- ✅ Detecta navegador y SO automáticamente

---

## 🔐 Seguridad

Las tablas tienen Row Level Security (RLS):
- **install_events**: Cualquiera puede insertar (anonimously), solo auth lee
- **install_settings**: Público puede leer, solo admin modifica
- No necesitas API keys expuestas

---

## 📝 Notas Importantes

1. **localStorage** - Los datos locales se guardan en el navegador por 7 días (configurable)
2. **Tracking** - Es opcional, se puede desactivar desde admin
3. **Sin límite de datos** - Supabase almacena todos los eventos
4. **Totalmente personalizable** - Todos los textos se pueden cambiar desde admin

---

## 🚀 Próximos Pasos (Opcionales)

1. Exportar datos a CSV desde admin
2. Gráficas visuales de tendencias
3. Notificaciones por email cuando X usuarios instalen
4. A/B testing con diferentes mensajes
5. Integración con Google Analytics

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si desactivo el tracking?**
R: Aún muestra el banner y las instrucciones, pero no registra eventos en BD.

**P: ¿Cuándo se borran los eventos?**
R: Nunca automáticamente. Tú los borras manualmente desde DB si quieres.

**P: ¿Funciona en iOS?**
R: Sí, pero el navegador Safari pide guardar de forma manual.

**P: ¿Se ve molesto el banner?**
R: Solo en móvil, y solo si se puede instalar. Se puede desactivar desde admin.

---

## 🔗 Archivo SQL

```
INSTALL_TRACKING.sql
```

Ejecútalo entero en Supabase SQL Editor.
