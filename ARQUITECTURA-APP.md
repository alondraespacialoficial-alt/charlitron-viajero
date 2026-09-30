# Arquitectura de Charlitron Viajero del Tiempo

Documento de referencia general para entender las partes principales del proyecto y dónde buscar al hacer cambios. Para los pasos operativos de cada función, consulta también las guías específicas enlazadas desde `INDICE-DOCUMENTACION.md`.

## Resumen

Aplicación web de una sola página (SPA) construida con React y TypeScript. Vite prepara el frontend; Vercel sirve la aplicación y las funciones de `/api`; Supabase proporciona PostgreSQL, Storage y las APIs de datos.

```text
Navegador
  ├─ React SPA (src/)
  ├─ Service worker (public/service-worker.js)
  └─ Recursos y servicios externos
       ├─ Supabase: datos, autenticación de funciones y Storage
       ├─ Vercel Functions: operaciones de servidor e integraciones
       ├─ Runway: widget de avatares
       └─ Gemini, Resend y Telegram: funciones específicas

Vercel
  ├─ Frontend compilado por Vite (dist/)
  └─ Endpoints serverless (api/)

Supabase
  ├─ PostgreSQL
  └─ Storage buckets
```

## Tecnologías

- React 19 y TypeScript.
- Vite 6 para desarrollo y compilación.
- Tailwind CSS 4 para estilos y Motion para animaciones.
- Supabase JS para consultas desde el frontend.
- Funciones serverless de Vercel con `@vercel/node`.
- D3 para visualizaciones del árbol familiar; Leaflet para mapas.
- Service worker para instalación PWA y caché.

Las dependencias y comandos están definidos en `package.json`; la configuración de Vite está en `vite.config.ts`.

## Organización del repositorio

```text
src/
  App.tsx                 Entrada de la SPA: navegación y composición de vistas
  main.tsx                Montaje de React
  components/             Secciones públicas y herramientas de administración
  types.ts                Tipos compartidos del dominio
  supabase.ts             Cliente Supabase del frontend
  constants.ts            Datos y constantes compartidos
  seoUtils.ts             Metadatos, slugs y URLs
  analyticsUtils.ts       Métricas de navegación
  favoritesUtils.ts       Persistencia local de favoritos
  index.css               Estilos globales

api/                      Funciones serverless de Vercel
public/                   Recursos estáticos, políticas de rastreo y PWA
  service-worker.js       Caché y estrategia offline
*.sql                     Esquema y cambios de base de datos por módulo
*.md                      Guías de operación y documentación funcional
```

## Frontend y navegación

`src/App.tsx` es el coordinador principal. Mantiene el estado de la sección activa, muestra la navegación y renderiza las vistas. No usa una biblioteca de routing: interpreta rutas y cambios de historial directamente, y sincroniza metadatos para compartir enlaces.

Las secciones grandes se cargan bajo demanda mediante `React.lazy` y `Suspense`. Entre ellas están galería, tienda, investigación, concursos, conferencias, cursos, mural, colaboradores, avatares, árbol familiar, jardín memorial, mapa y panel de administración. Componentes compartidos como búsqueda, favoritos, historiadores, instalación PWA y chat se importan directamente.

Rutas principales implementadas en `App.tsx` incluyen `/galeria`, `/tienda`, `/investiga`, `/concursos`, `/conferencias`, `/cursos`, `/mural`, `/colaboradores`, `/avatares`, `/jardin`, `/jardin/:slug`, `/mapa`, `/arbol`, `/terminos` y `/privacidad`. Revisa `App.tsx` antes de agregar o cambiar una ruta para actualizar estado inicial, navegación, historial y metadatos de forma consistente.

## Dominios funcionales

| Área | Componentes principales |
| --- | --- |
| Historias, galería y búsqueda | `App.tsx`, `SearchResults.tsx`, `HistoriansSection.tsx`, `RestoredGallery.tsx` |
| Árbol genealógico | `FamilyTreeManager.tsx`, `FamilyTreeAccess.tsx`, `FamilyTreeView.tsx`, `FamilyTreePanel.tsx` |
| Avatares históricos | `AvatarSection.tsx`, `AvatarsAdmin.tsx` |
| Jardín de la Memoria | `MemorialGardenSection.tsx`, `MemorialFamilyPanel.tsx`, `MemorialsAdmin.tsx` |
| Tienda | `ShopSection.tsx` |
| Concursos, conferencias y cursos | `ContestsSection.tsx`, `ConferencesSection.tsx`, `CoursesSection.tsx` y sus componentes admin |
| Comunidad y contenido | `MuralSection.tsx`, `CollaboratorsSection.tsx`, `TravelerMapSection.tsx` |
| Administración | `AdminPanel.tsx` y componentes `*Admin.tsx` |

Los tipos compartidos de historias, fotos, avatares, cursos, concursos y otras entidades están en `src/types.ts`.

## Datos y servicios

Los componentes consultan Supabase usando el cliente de `src/supabase.ts`. Los scripts SQL de la raíz crean o modifican tablas, índices y políticas por módulo; algunos son cambios incrementales. El despliegue de Vercel no ejecuta automáticamente esos SQL: hay que revisar y aplicar cada script requerido en el proyecto Supabase correspondiente.

La carpeta `api/` contiene endpoints para operaciones de servidor e integraciones como códigos de avatares, sesiones de Runway, Gemini, correo y notificaciones. Los secretos de proveedor deben permanecer en variables de entorno del servidor de Vercel, nunca en variables `VITE_*` ni en el bundle del frontend.

El frontend usa la clave pública de Supabase. El acceso efectivo a cada tabla y bucket depende de los permisos y las políticas RLS configurados en Supabase. Antes de cambiar RLS o grants, revisa las consultas de cada flujo y prueba acceso público, cliente y administrador; activar RLS sin políticas compatibles puede bloquear funciones existentes.

## Despliegue y seguridad del navegador

- `vercel.json` define headers de seguridad, CSP y el fallback de rutas SPA.
- `public/service-worker.js` implementa la caché offline y la caché de imágenes externas. `index.html` lo registra al cargar la aplicación.
- El widget de avatares carga recursos de Runway. Si se modifica la CSP o el comportamiento del service worker, valida el widget en producción y en navegadores con caché previa.
- La configuración de almacenamiento, RLS y variables de entorno se administra en Supabase y Vercel; no está contenida íntegramente en este repositorio.

## Desarrollo y validación

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev       # Vite en http://localhost:3000
npm run lint      # TypeScript: tsc --noEmit
npm run build     # Compilación de producción en dist/
npm run preview   # Vista local del build
```

Para comprobar las funciones TypeScript de Vercel:

```bash
npx tsc --noEmit -p api/tsconfig.json
```

## Guías complementarias

- `README.md`: introducción y configuración inicial.
- `INDICE-DOCUMENTACION.md`: índice existente de documentación de concursos.
- `supabase-schema-completo.sql` y archivos `*-SETUP.sql`: esquema y configuración de base de datos por área.
- `vercel.json`: headers y rewrites de producción.
- `public/manifest.json` y `public/service-worker.js`: instalación y caché PWA.