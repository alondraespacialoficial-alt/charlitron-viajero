# 🏆 Setup Concursos - Charlitron el Viajero

## Instalación Rápida

### 1️⃣ En tu panel de Supabase

1. Ve a **SQL Editor** en tu dashboard de Supabase
2. Copia TODO el contenido del archivo **`CONTESTS-SETUP.sql`** que encontrarás en la raíz del proyecto
3. Pégalo en el editor SQL
4. Dale click a **"Run"** (flecha verde)

✅ ¡Listo! Las tablas se crearán automáticamente

---

## 📋 Lo que se instala

### Tablas creadas:
- `contests` - Información principal del concurso
- `contest_answers` - Las 3 opciones de respuesta
- `contest_participations` - Registro de quién participó y si acertó
- `contest_codes` - Códigos únicos de un solo uso (VIAJERO-ABC123)
- `contest_winners` - Registro de ganadores

### Permisos (RLS):
- ✅ Lectura pública de concursos
- ✅ Solo admin puede crear/editar/eliminar
- ✅ Usuarios pueden participar automáticamente
- ✅ Códigos se generan automáticamente al acertar
- ✅ Índices optimizados para rendimiento

---

## 🎮 ¿Cómo funciona desde el Admin?

### Panel Admin → "Concursos"

1. **Nuevo Concurso:**
   - Dale click a "Nuevo Concurso"
   - Sube una imagen
   - Escribe la pregunta
   - Agrega 3 respuestas (marca una como correcta)
   - Escribe el nombre del ganador (opcional, se muestra públicamente)
   - Dale click a "Guardar"

2. **Activar/Desactivar:**
   - Solo los concursos "Activos" aparecen en la app
   - Puedes desactivar sin eliminar

3. **Eliminar:**
   - Borra el concurso y todo lo relacionado completamente

---

## 🎯 ¿Cómo ven los usuarios?

### Sección "Concursos" en la app

1. Ven una lista de concursos activos
2. Ven la imagen + pregunta
3. Seleccionan una de 3 respuestas
4. Si **aciertan:**
   - ✅ Ven un código generado automáticamente
   - 📱 Pueden copiar el código
   - 📲 Pueden compartir en redes (Twitter, Instagram, etc)
   - El código aparece en los comentarios de tu post en redes

5. Si **fallan:**
   - ❌ Les sale "Respuesta incorrecta"
   - Pueden intentar en el siguiente concurso

---

## 💡 Ejemplo de Concurso

**PREGUNTA:** "¿En qué década fue tomada esta foto?"

**OPCIONES:**
- 1950s (falsa)
- 1920s ✅ (CORRECTA)
- 1890s (falsa)

**GANADOR ACERTÓ:**
- Se genera: `VIAJERO1743829-ABC451`
- Usuario comparte en Instagram: "¡Gané en Charlitron! Código: VIAJERO1743829-ABC451 🏆"
- Quién lo vea primero y lo copie se lleva el premio

---

## 🔧 Para celular

✅ Todo funciona perfectamente en móvil (responsive)
- Los concursos se ven bien en pantallas pequeñas
- El código es fácil de copiar con un click
- El botón de "Compartir" usa el sistema nativo del celular

---

## 📊 Analytics

Los códigos compartidos quedan registrados automáticamente en la tabla `contest_winners`, donde puedes ver:
- Cuántas personas ganaron
- Quién compartió en redes (`shared_on_social: true`)
- Cuándo se generó cada código

---

## ❓ Preguntas frecuentes

**P: ¿Puedo hacer otro concurso después de cerrar uno?**
R: Sí, simplemente desactiva el anterior y crea uno nuevo.

**P: ¿Un usuario puede participar 2 veces en el mismo concurso?**
R: No, el sistema lo bloquea automáticamente. Solo SE PUEDE participar UNA VEZ por concurso.

**P: ¿Qué pasa si dos usuarios aciertan?**
R: Ambos generan sus propios códigos. El primero que lo comparta en redes se "lleva" la victoria (depende de ti verificarlo).

**P: ¿Puedo cambiar un código después de generado?**
R: No, es inmutable. Si necesitas "revertir", simplemente marca a otro usuario como ganador desde el admin.

---

## 🚀 ¡Listo!

```
Admin → Concursos → Crear → Subir imagen → Pregunta + Respuestas → Guardar
                                          ↓
                                    Usuarios ven
                                        ↓
                              Responden → Ganan código
                                        ↓
                              Comparten en redes
                                        ↓
                              ¡Viralidad + Engagement!
```

---

**Cualquier duda, aquí estoy hermano 🔥**
