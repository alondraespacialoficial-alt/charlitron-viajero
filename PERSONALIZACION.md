# 🎨 PERSONALIZACIÓN - CUSTOMIZA TU SISTEMA

## 🔤 CAMBIAR FORMATO DEL CÓDIGO

**Actual:** `VIAJERO1743829-ABC451`

**Donde cambiar:** `src/components/ContestsSection.tsx` línea ~199

```typescript
// ANTES:
const newCode = `VIAJERO${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// DESPUÉS (elige uno):
// Opción 1: Con tu nombre
const newCode = `CHARLITRON${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// Opción 2: Corto y simple
const newCode = `PREMIO${Date.now()}`.substring(0, 12);

// Opción 3: Con emoji
const newCode = `🏆${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

// Opción 4: Año + Random
const newCode = `${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

// Opción 5: Tu formato personalizado
const newCode = `VIA${Math.floor(Math.random()*9999)}`;
```

---

## 🎨 CAMBIAR COLORES

**Ubicación:** `src/components/ContestsSection.tsx`

### Verde → Azul
```jsx
// ANTES:
className="bg-gradient-to-r from-green-50 to-emerald-50"
className="border-green-200 rounded-xl"
className="text-green-600"

// DESPUÉS:
className="bg-gradient-to-r from-blue-50 to-cyan-50"
className="border-blue-200 rounded-xl"
className="text-blue-600"
```

### Naranja → Púrpura
```jsx
// ANTES:
className="bg-gradient-to-r from-amber-600 to-orange-600"

// DESPUÉS:
className="bg-gradient-to-r from-purple-600 to-pink-600"
```

### Paletas completas:

**Azul (Tech)**
```
from-blue-600 to-cyan-600
from-blue-50 to-cyan-50
border-blue-200
text-blue-700
```

**Verde (Naturaleza)**
```
from-green-600 to-emerald-600
from-green-50 to-emerald-50
border-green-200
text-green-700
```

**Púrpura (Mystique)**
```
from-purple-600 to-pink-600
from-purple-50 to-pink-50
border-purple-200
text-purple-700
```

**Rojo (Energía)**
```
from-red-600 to-rose-600
from-red-50 to-rose-50
border-red-200
text-red-700
```

---

## 🔔 CAMBIAR ÍCONO DEL BOTÓN

**Ubicación:** `src/App.tsx` líneas ~267 y ~337

### Antes
```jsx
<Trophy className="w-4 h-4" />
Concursos
```

### Después (elige uno)
```jsx
// Opción 1: Star
<Star className="w-4 h-4" />
Desafíos

// Opción 2: Zap (Rayo)
<Zap className="w-4 h-4" />
Retos

// Opción 3: Flame (Fuego)
<Flame className="w-4 h-4" />
Fuego de Preguntas

// Opción 4: Crown (Corona)
<Crown className="w-4 h-4" />
Campeones

// Opción 5: Award (Premio)
<Award className="w-4 h-4" />
Premios

// Opción 6: Target (Diana)
<Target className="w-4 h-4" />
Acierta
```

**No olvides agregar el import:**
```typescript
// En el import de lucide-react:
import { ... Star, Zap, Flame, Crown, Award, Target ... } from 'lucide-react';
```

---

## 📝 CAMBIAR TEXTOS

### En ContestsSection.tsx

**Encabezado:**
```jsx
// ANTES:
<h1 className="...">Concursos Viajeros</h1>

// DESPUÉS:
<h1 className="...">Desafía tu Memoria</h1>
```

**Instrección:**
```jsx
// ANTES:
<p className="...">Demuestra tu conocimiento y gana códigos exclusivos</p>

// DESPUÉS:
<p className="...">Prueba qué tanto sabes de nuestra historia</p>
```

**Botón enviar:**
```jsx
// ANTES:
{isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}

// DESPUÉS:
{isSubmitting ? 'Verificando...' : 'Verificar Respuesta'}
```

**Cuando gana:**
```jsx
// ANTES:
<span className="...">¡CORRECTO!</span>

// DESPUÉS:
<span className="...">¡LO LOGRASTE! 🎉</span>
```

---

## 🎯 CAMBIAR NOMBRE EN MENÚ

**Ubicación:** `src/App.tsx` líneas ~268 y ~338

### Antes
```jsx
<button onClick={onContests} ...>
  <Trophy className="w-4 h-4" />
  Concursos
</button>
```

### Después (elige uno)
```jsx
// Opción 1
Desafíos Viajeros

// Opción 2
Prueba tu Memoria

// Opción 3
Premios & Retos

// Opción 4
Acierta y Gana

// Opción 5
Juegosde Historia
```

---

## 🌍 CAMBIAR TEMA COMPLETO

Por si quieres transformar completamente la vibe...

### Tema: Ciencia & Tecnología
```
- Cambiar colores a cyan/blue
- Ícono: Zap en lugar de Trophy
- Nombre: "Lab de Conocimiento"
- Código: `LAB{random}` en lugar de `VIAJERO{random}`
```

### Tema: Aventura
```
- Cambiar colores a orange/red
- Ícono: Compass en lugar de Trophy
- Nombre: "Ruta Histórica"
- Código: `RUTA{random}`
- Pregunta: "¿Adivinas la siguiente parada?"
```

### Tema: Lujo/Premium
```
- Cambiar colores a gold/amber
- Ícono: Crown en lugar de Trophy
- Nombre: "Club Exclusivo"
- Código: `VIP{random}`
- Solo mostrar a usuarios premium
```

---

## 📦 CAMBIAR ESTRUCTURA DE RESPUESTAS

**¿Quieres 4 opciones en lugar de 3?**

En `ContestsAdmin.tsx` línea ~125:
```typescript
// ANTES:
setEditingAnswers([
  { answer_text: '', is_correct: false, answer_order: 1 },
  { answer_text: '', is_correct: false, answer_order: 2 },
  { answer_text: '', is_correct: false, answer_order: 3 },
]);

// DESPUÉS (agregar una 4ta):
setEditingAnswers([
  { answer_text: '', is_correct: false, answer_order: 1 },
  { answer_text: '', is_correct: false, answer_order: 2 },
  { answer_text: '', is_correct: false, answer_order: 3 },
  { answer_text: '', is_correct: false, answer_order: 4 },
]);
```

También update en el SQL (`CONTESTS-SETUP.sql`) la restricción si la hay.

---

## 🔐 AGREGAR AUTENTICACIÓN

Si quieres que SOLO usuarios registrados participen:

En `ContestsSection.tsx` top:
```typescript
// Importar usuario
const [user, setUser] = useState(null);

useEffect(() => {
  const { data: { user } } = await supabase.auth.getUser();
  setUser(user);
}, []);

// Luego, en lugar de usar:
const userSessionId = `user-${Date.now()}...`

// Hacer:
const userSessionId = user?.id || `guest-${Date.now()}...`
```

---

## 📊 AGREGAR ANALYTICS

Si quieres rastrear participaciones:

```typescript
// En ContestsSection.tsx
const trackContest = async (action: string, contestId: string) => {
  await supabase.from('contest_analytics').insert({
    contest_id: contestId,
    action, // 'viewed', 'participated', 'won'
    user_session_id: userSessionId,
    timestamp: new Date()
  });
};

// Llamar cuando:
// - Usuario ve el concurso: trackContest('viewed', contest.id)
// - Usuario responde: trackContest('participated', contest.id)
// - Usuario gana: trackContest('won', contest.id)
```

---

## 🎬 CAMBIAR ANIMACIONES

Las animaciones vienen de `motion/react`.

Si quieres hacerlas más lentas/rápidas:

```jsx
// ANTES:
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// DESPUÉS (más lento):
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 1 }} // 0.5 → 1 = 2x más lento
>

// O más rápido:
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.2 }} // 0.5 → 0.2 = más rápido
>
```

---

## ✨ COMBINA CUSTOMIZACIONES

### Ejemplo completo: Tema "Ancestros"
```
1. Color: Sepia → Mantener (ya matches con tema)
2. Ícono: Trophy → Crown
3. Nombre: Concursos → "Legado Familiar"
4. Código: VIAJERO → LEGADO
5. Botón: Más text sepia themed
6. Pregunta intro: "¿Qué sabes de..."
```

### Ejemplo completo: Tema "Gaming"
```
1. Color: Naranja/Púrpura
2. Ícono: Zap
3. Nombre: "Arena Histórica"
4. Código: BATALLA{random}
5. Texto: "Desafía o sé derrotado"
6. Leaderboard: Agrega top 10
```

---

## 🚀 DESPUÉS DE CUSTOMIZAR

1. **Guarda cambios**
2. **Recarga la app** (Ctrl+Shift+R o Cmd+Shift+R)
3. **Prueba en incógnito** para ver cambios purros
4. **Deploy** a producción

---

## 💡 TIPS

- Las Tailwind classes están en todas partes → cambiar globalmente = buscar/reemplazar
- Los tipos en TypeScript previenen errores → no cambies tipos a menos que sepas qué haces
- Las animaciones suelen verse mejor lentas qu rápidas
- Los colores se ven diferente en claro vs oscuro → prueba en modo oscuro también

---

¡Tu sistema, tu reglas hermano! 🔥

Cualquier customización que se te ocurra, el código está ahí para hacerlo.
