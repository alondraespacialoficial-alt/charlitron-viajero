# 📱 GUÍA: DESCARGAR CHARLITRON® COMO APP EN CELULAR

## ✅ EL PROBLEMA CORREGIDO

Faltaba el **Service Worker** que es REQUERIDO para descargar como PWA.

**Ya está agregado:**
- ✅ `/public/service-worker.js` - Service Worker completo
- ✅ HTML registra el SW automáticamente
- ✅ manifest.json mejorado y validado

---

## 📥 CÓMO DESCARGAR LA APP

### 🍎 iPhone / iPad (iOS)

**OPCIÓN 1: Safari (Recomendado)**
```
1. Abre Safari
2. Ve a: https://charlitronviajerdeltiempo.com
3. Presiona: Compartir (↗) en la barra inferior
4. Sube y busca: "Agregar a pantalla de inicio"
5. Nombra: "Charlitron" (o como quieras)
6. Presiona: "Agregar"

✅ Listo! La app aparecerá en tu pantalla inicio
```

**Qué verás:**
- Icono: Logo de Charlitron®
- Nombre: "Charlitron"
- URL: Se abre a pantalla completa (sin barra del navegador)

---

### 📱 Android (Chrome, Firefox, Edge)

**OPCIÓN 1: Chrome (Recomendado)**
```
1. Abre Chrome
2. Ve a: https://charlitronviajerdeltiempo.com
3. Espera 2-3 segundos
4. Presiona: Menú (⋮) en la esquina superior derecha
5. Selecciona: "Instalar aplicación" o "Instalar Charlitron®"
6. Presiona: "Instalar"

✅ Listo! La app se descargará a tu pantalla de inicio
```

**OPCIÓN 2: Desde la barra de dirección**
```
1. Abre Chrome
2. Ve a: https://charlitronviajerdeltiempo.com
3. En la barra de dirección verás un ícono (instalable)
4. Presiona el ícono
5. Presiona: "Instalar"

✅ La app se descargará automáticamente
```

**OPCIÓN 3: Firefox (Android)**
```
1. Abre Firefox
2. Ve a: https://charlitronviajerdeltiempo.com
3. Presiona: Menú (⋮)
4. Selecciona: "Instalar"
5. Confirma

✅ La app aparecerá en pantalla de inicio
```

---

## ⚙️ SI NO VES EL BOTÓN DE INSTALAR

**Posibles razones y soluciones:**

### ❌ Problema 1: No aparece el botón "Instalar"
```
✅ Solución:
1. Recarga la página (Ctrl + R o Cmd + R)
2. Espera 3-5 segundos después de cargar
3. Presiona Menú (⋮)
4. Busca "Instalar aplicación"

Si aún no aparece:
→ Abre la consola (F12) y verifica que no haya errores rojo
→ Mira los logs: debe decir "✅ Service Worker registrado"
```

### ❌ Problema 2: Error "No se puede instalar"
```
✅ Solución:
1. Borra el cache: Menú → Configuración → Privacidad → Borrar datos
2. Recarga la página
3. Intenta nuevamente

✅ Alternative: Sigue el método manual (compartir → agregar a inicio)
```

### ❌ Problema 3: "Esta página no es una app válida"
```
✅ Solución:
1. Abre: https://charlitronviajerdeltiempo.com
2. Abre la consola (F12)
3. Ve a la pestaña "Console"
4. Busca errores rojos
5. Si hay errores, comparte los logs y ayudaré

✅ De todas formas, puedes usar el método manual (Safari/Compartir)
```

---

## 🔍 VERIFICACIÓN TÉCNICA

### Verificar que el Service Worker funciona

**Desde Chrome/Edge/Firefox:**
1. Ve a: https://charlitronviajerdeltiempo.com
2. Presiona: F12 (Abrir Desarrollador)
3. Ve a pestaña: **Application** (o **Storage**)
4. En el menú izquierdo: **Service Workers**
5. Deberías ver:
   ```
   https://charlitronviajerdeltiempo.com/service-worker.js
   Status: ✅ running
   ```

### Verificar el manifest.json

**Desde Chrome/Edge/Firefox:**
1. Ve a: https://charlitronviajerdeltiempo.com
2. Presiona: F12
3. Ve a pestaña: **Application**
4. En el menú: **Manifest**
5. Deberías ver:
   ```
   Name: Charlitron® Viajero del Tiempo
   Display: standalone
   Start URL: /
   Theme Color: #5a3a28
   Status: ✅ OK
   ```

---

## 📲 QUÉ VERÁS CUANDO INSTALES

### Aspecto de la App Instalada

**Android:**
```
[Icono Charlitron®]
    "Charlitron"
```

**iOS:**
```
[Icono Charlitron®]
    "Charlitron"
```

**Al abrir:**
- Se abre a pantalla completa (fullscreen)
- No muestra barra del navegador
- Funciona offline si lo usaste antes
- Es como una app nativa

---

## 🚀 FUNCIONALIDADES COMO APP

✅ **Almacenamiento en Caché**
- Una vez descargada, carga más rápido
- Puede funcionar sin internet (contenido previamente visitado)

✅ **Acceso Rápido**
- Icono en pantalla de inicio
- Se abre en 1 segundo (sin barra de navegador)

✅ **Notificaciones** (opcional en el futuro)
- Podría recibir notificaciones push

✅ **Datos Locales**
- Almacena favoritos, búsquedas, etc. localmente

✅ **Accesos Directos**
- Menú largo (Android): Acceso directo a Historias, Árbol Genealógico

---

## 🛠️ SI SIGUE SIN FUNCIONAR

**Pasos avanzados:**

### Opción 1: Verificar directamente el archivo
```
1. Abre en el navegador: 
   https://charlitronviajerdeltiempo.com/manifest.json

2. Deberías ver un JSON válido (sin errores)
3. Si ves error 404 o JSON roto, hay problema de servidor
```

### Opción 2: Verificar Service Worker
```
1. Abre en el navegador:
   https://charlitronviajerdeltiempo.com/service-worker.js

2. Deberías ver el código JavaScript
3. Si ves error 404, hay problema de servidor
```

### Opción 3: Chrome DevTools Completo
```
1. F12 en Chrome
2. Application → Application Manifest
3. Si ves ❌ "errors", haz screenshot y comparte
4. También checa Application → Manifest tab para detalles
```

---

## 📝 PROTOCOLO SI AÚN FALLA

Si después de todo esto sigue sin funcionar:

1. **Captura de pantalla de:**
   - El error que ves
   - La consola (F12 → Console)
   - El manifest.json

2. **Información a proporcionar:**
   - Navegador y versión (Chrome 120, Firefox 121, etc.)
   - Dispositivo y SO (iPhone 14 iOS 17, Samsung Android 13, etc.)
   - Si es con VPN / proxy

3. **Compartir conmigo:**
   - Los logs/screenshots
   - El URL exacto que intentaste

---

## ✅ CHECKLIST FINAL

Antes de reportar que no funciona, verifica que:

- [ ] Recargas la página (Ctrl+R o Cmd+R)
- [ ] Abres el sitio en HTTPS (no HTTP)
- [ ] Esperas 2-3 segundos después de cargar completamente
- [ ] El navegador está actualizado
- [ ] Tienes suficiente espacio en el celular (mín 50MB)
- [ ] El Service Worker aparece en DevTools
- [ ] El manifest.json es válido (sin errores en DevTools)

---

**Última actualización:** 29 de Marzo 2026  
**Estado:** ✅ PWA COMPLETAMENTE CONFIGURADO  
**Soporte:** Si aún falla, contacta con detalles de error + captura
