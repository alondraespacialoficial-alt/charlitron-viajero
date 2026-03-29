# ⚡ VERIFICACIÓN RÁPIDA - PWA CHARLITRON® (2 MINUTOS)

## 🔥 HAZ ESTO AHORA EN TU CELULAR

### Escenario 1: ANDROID (Chrome)
```
1. Abre Chrome
2. Ve a: https://charlitronviajerdeltiempo.com
3. Espera que cargue completamente (3 seg)
4. Presiona Menú ⋮ (arriba a la derecha)
5. ¿Ves "Instalar aplicación"?
   
   ✅ SÍ → Presiona, instala, ¡LISTO!
   ❌ NO → Ve a "Solución de Problemas" abajo
```

### Escenario 2: iOS (Safari)
```
1. Abre Safari
2. Ve a: https://charlitronviajerdeltiempo.com
3. Presiona Compartir ↗ (abajo a la derecha)
4. Baja y busca: "Agregar a pantalla de inicio"
5. ¿Lo ves?
   
   ✅ SÍ → Presiona, nombra, ¡LISTO!
   ❌ NO → Ve a "Solución de Problemas" abajo
```

---

## 🔧 SI NO APARECE EL BOTÓN

### PASO 1: Abre Desarrollador (F12 o Cmd+Option+I)
```
Presiona: F12 en Android/Windows
Presiona: Cmd + Option + I en Mac
```

### PASO 2: Ve a "Application" / "Storage"
```
En Chrome/Edge: Pestaña "Application"
En Firefox: Pestaña "Storage"
```

### PASO 3: Mira "Service Worker" en el menú izquierdo
```
Deberías ver:
  Service Workers
    └─ https://charlitronviajerdeltiempo.com/service-worker.js
       Status: ✅ running

Si ves ❌ o "error", hay problema...
```

### PASO 4: Ve a "Manifest" en el mismo menú
```
Deberías ver:
  Name: Charlitron® Viajero del Tiempo
  Short name: Charlitron®
  Display: standalone
  ✅ Color theme, icons, etc.

Si ves ❌ error o "not found", reporta
```

### PASO 5: Abre "Console" y busca mensajes rojos
```
Presiona: F12 → Console
Busca mensajes rojos ❌
Nota qué dice exactamente
```

---

## ⚠️ PROBLEMAS COMUNES & SOLUCIONES RÁPIDAS

### Problema: "El sitio no es una app instalable"
```
✅ Soluciones rápidas:

1. Recarga: Ctrl+R (Windows) o Cmd+R (Mac)
   → Espera 5 segundos
   
2. Borra cache en Chrome:
   Menú → Configuración → Privacidad → "Borrar datos de navegación"
   → Selecciona TODO
   → Presiona Borrar
   
3. Recarga el sitio de nuevo

Si sigue sin funcionar:
   → Usa el método manual (compartir → agregar a inicio)
```

### Problema: "Error registrando Service Worker"
```
✅ Significa que el archivo service-worker.js no se encontró

Posibles razones:
1. El servidor no está sirviendo el archivo
2. El URL es incorrecto
3. Problema de CORS

Si ves esto:
1. Verifica que visitas HTTPS (no HTTP)
2. Abre directamente: https://charlitronviajerdeltiempo.com/service-worker.js
3. Si ves error 404 → reporta al servidor que falta el archivo
```

### Problema: Manifest.json no válido
```
✅ Rápida verificación:

Abre en el navegador:
  https://charlitronviajerdeltiempo.com/manifest.json

Deberías ver JSON válido (sin espacios raros, comillas balanced)

Si ves error → hay problema en el archivo JSON
```

---

## 📱 VERIFICACIÓN SIN DEVELOPER TOOLS

### La forma más FÁCIL (sin tecnicismos)

**Solo comparte el link en WhatsApp:**
```
1. Abre WhatsApp
2. Empieza un chat
3. Copia y pega: https://charlitronviajerdeltiempo.com
4. ¿Ves preview con imagen + título + descripción?
   
   ✅ SÍ → El sitio funciona correctamente
   ❌ NO → Hay problema de meta tags
```

**Presiona el ícono de app en el navegador:**
```
En Chrome:
  1. Ve a la barra de dirección
  2. A la derecha de la URL ves un ícono circular
  3. ¿Ese ícono está LLENO (no gris)?
  
  ✅ SÍ → Es instalable, presiona
  ❌ NO → Aún no está listo
```

---

## 🚀 SI LOGRÓ INSTALAR: VALIDA QUE FUNCIONA

```
1. Encuentra el ícono en pantalla de inicio: "Charlitron"
2. Presiona
3. ¿Se abre a pantalla completa (sin barra de navegador arriba)?
   
   ✅ SÍ → ¡PERFECTO! Es una PWA funcional
   ❌ NO → Abre en navegador (intenta nuevamente después)
```

---

## 📋 INFORMACIÓN A REPORTAR SI FALLA

Si después de todo esto no funciona, necesito saber:

```
DISPOSITIVO:
  □ iPhone (versión iOS)
  □ Android (versión Android)

NAVEGADOR:
  □ Chrome
  □ Firefox
  □ Safari
  □ Edge
  
VERSIÓN DEL NAVEGADOR:
  → Menú → Configuración → Acerca de → [versión]
  
ERROR EXACTO QUE VES:
  → Copia el error de la consola (F12 → Console)
  
CAPTURAS:
  □ Pantalla del error
  □ Consola de desarrollador (F12)
  □ Manifest/Service Worker status

LO QUE INTENTASTE:
  □ Instalar desde menú
  □ Instalar desde barra de dirección
  □ Compartir → agregar a inicio
  □ Otra...
```

---

## ✅ CHECKLIST FINAL (ANTES DE REPORTAR)

- [ ] Recargué la página (Ctrl+R)
- [ ] Esperé más de 3 segundos
- [ ] Usé HTTPS (no HTTP)
- [ ] Limpié cache/cookies
- [ ] Abrí el navegador en HTTPS
- [ ] El Service Worker aparece en DevTools
- [ ] El Manifest es válido (sin errores en DevTools)
- [ ] Probé en Incognito/Privado (sin extensiones)
- [ ] Mi navegador está actualizado

---

## 🆘 CONTACTO DE SOPORTE

Si checaste TODO y sigue sin funcionar:

1. Captura pantalla del error
2. Abre la consola (F12)
3. Copia los mensajes de error rojos
4. Comparte conmigo + información del checklist

---

**RESUMEN:** Si VES el botón "Instalar" → ¡Presionalo y listo! 
Si NO lo ves → Sigue "Solución de Problemas" arriba ☝️

**Última actualización:** 29 de Marzo 2026
