# Charlitron el Viajero - Genealogía y Tienda del Tiempo

Este proyecto es una aplicación web interactiva diseñada para la preservación de historias familiares, genealogía y una tienda temática de antigüedades.

## Características

- **Árbol Genealógico:** Gestión de miembros de la familia y relaciones.
- **Historias del Tiempo:** Narrativas interactivas con soporte para video y audio.
- **Galería de Fotos Restauradas:** Visualización de fotografías históricas.
- **Tienda del Tiempo:** Catálogo de productos con integración de pago vía WhatsApp.
- **Patrocinadores:** Sección para empresas colaboradoras con efectos visuales temáticos.
- **Panel de Administración:** Gestión completa de contenidos (historias, productos, patrocinadores, configuraciones).

## Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- Una cuenta en [Supabase](https://supabase.com/)

## Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y rellena los valores con tus propias credenciales:

```bash
cp .env.example .env
```

Variables necesarias:
- `VITE_SUPABASE_URL`: URL de tu proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: Clave anónima de tu proyecto Supabase.
- `GEMINI_API_KEY`: Tu clave de API de Google Gemini (opcional, para funciones de IA).

### 4. Configurar la Base de Datos (Supabase)

Ejecuta el contenido del archivo `supabase-setup.sql` en el **SQL Editor** de tu panel de Supabase para crear las tablas y políticas necesarias.

### 5. Configurar el Almacenamiento (Storage)

En el panel de Supabase, crea los siguientes buckets públicos:
- `family-photos`
- `audio`
- `travel-photos`
- `restored-photos`
- `products`
- `sponsors`

Asegúrate de configurar las políticas de acceso para permitir la lectura pública.

## Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Construcción para Producción

Para generar los archivos de producción:

```bash
npm run build
```

Los archivos se generarán en la carpeta `dist/`.

## Licencia

Este proyecto está bajo la licencia Apache-2.0.
