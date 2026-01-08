# 📚 Guía de Configuración del Sistema de Evaluaciones

## 🎯 ¿Cómo Funciona la Academia?

### Flujo del Estudiante

```
1. CAMPUS → Ve todos los módulos disponibles
   ↓
2. SELECCIONA MÓDULO → Entra a ver las lecciones
   ↓
3. COMPLETA LECCIONES → Lee/ve todas las lecciones del módulo
   ↓
4. TOMA EVALUACIÓN → Responde las preguntas del quiz
   ↓
5. APRUEBA (80%+) → Puede avanzar al siguiente módulo
   ↓
6. SI FALLA → Puede reintentar según intentos configurados
```

### Condiciones para Tomar el Quiz

Para que el botón "Comenzar Examen Ahora" aparezca, se deben cumplir **TODAS** estas condiciones:

✅ **Lecciones Completadas**: El estudiante debe haber completado TODAS las lecciones del módulo  
✅ **No Aprobado**: El estudiante no ha aprobado el quiz anteriormente  
✅ **Intentos Disponibles**: Quedan intentos restantes (ej: 2 de 3 usados)  
✅ **Sin Cooldown**: No está en período de espera entre intentos  
✅ **Preguntas Configuradas**: El quiz tiene al menos 1 pregunta creada

---

## 🔧 Configuración desde el Panel de Admin

### Paso 1: Crear Etapa y Módulo

1. Ir a **Panel Admin** (`/lms/admin.html`)
2. Pestaña **"🗂️ Etapas"**
   - Crear etapas (ej: "Módulo 0 - Cultura y Reglas")
3. Pestaña **"📚 Módulos"**
   - Crear módulos dentro de cada etapa
   - Configurar nombre y descripción

### Paso 2: Agregar Lecciones

1. Pestaña **"📖 Lecciones"**
2. Filtrar por módulo
3. Crear lecciones:
   - Título de la lección
   - Tipo: Video (URL Loom) o Texto (contenido HTML)
   - Orden de aparición

### Paso 3: **CONFIGURAR QUIZ** ⚠️ CRÍTICO

#### 3.1 Verificar que el Módulo Tiene Quiz Habilitado

1. Pestaña **"📚 Módulos"**
2. Buscar tu módulo en la lista
3. En la columna "Contenido" debe decir: `X lecciones, 1 quiz` ✅
4. Si NO dice "1 quiz", necesitas **editar el módulo**:
   - Click en "Editar" del módulo
   - Buscar la sección "Configuración del Quiz"
   - Marcar ✅ **"Habilitar Quiz Final"**
   - Configurar:
     - Puntaje Mínimo: `80` (%)
     - Intentos Máximos: `3` (o los que quieras)
     - Cooldown: `5` (minutos entre intentos)
   - Guardar cambios

#### 3.2 Agregar Preguntas al Quiz

1. Pestaña **"❓ Preguntas"**
2. **Seleccionar el módulo** del dropdown
3. Click en **"+ Agregar Pregunta"**
4. Completar formulario:
   ```
   Pregunta: "¿Cuál es la cultura de BraveGirls?"
   
   Opciones (mínimo 2, máximo 4):
   A) Respeto y profesionalismo
   B) Solo ganar dinero
   C) Mentir a los fans
   D) No importa la calidad
   
   Respuesta Correcta: A ✅
   ```
5. Guardar pregunta
6. **Repetir hasta tener al menos 1 pregunta** (recomendado: 5-10 preguntas)

---

## 🐛 Diagnóstico de Problemas

### Problema: Aparece "📝 Evaluación disponible próximamente"

**Causa**: El quiz no está correctamente configurado.

**Solución**: Usar el **Panel de Depuración** (solo visible para admins):

1. Ir al módulo como admin
2. Click en la sección "Evaluación Final"
3. Abrir el desplegable **"🔧 Panel de Depuración"**
4. Revisar cada condición:

```
✅ allLessonsCompleted: true  → Todas las lecciones completadas
❌ quiz.totalQuestions: 0     → NO HAY PREGUNTAS ← PROBLEMA
✅ quiz.attemptsRemaining: 3  → Intentos disponibles
✅ quiz.cooldownRemaining: 0  → Sin cooldown
```

### Problema: "⚠️ Este módulo aún no tiene preguntas configuradas"

**Causa**: El quiz existe pero no tiene preguntas.

**Solución**:
1. Ir a **Admin → Pestaña "❓ Preguntas"**
2. Seleccionar tu módulo
3. Si la tabla está vacía, agregar preguntas con el botón **"+ Agregar Pregunta"**

### Problema: "⚠️ Completa todas las lecciones antes de tomar el examen"

**Causa**: El estudiante no ha visto todas las lecciones.

**Solución**:
1. Ir al módulo
2. Click en cada lección del sidebar
3. Ver el contenido completo
4. Esperar 2-3 segundos (se marca automáticamente como completada)
5. Verificar que todas tengan ✅

### Problema: "❌ Sin intentos disponibles. Has usado todos tus X intentos"

**Causa**: El estudiante falló el quiz las veces permitidas.

**Soluciones**:
- **Opción A (Recomendada)**: El estudiante contacta al supervisor
- **Opción B (Admin)**: Ir a **Admin → Pestaña "📊 Progreso"** → Buscar al usuario → Reiniciar sus intentos

---

## ✅ Checklist de Configuración Completa

Usa esta lista para verificar que un módulo está listo:

- [ ] Etapa creada
- [ ] Módulo creado dentro de la etapa
- [ ] Lecciones agregadas al módulo (mínimo 1)
- [ ] Quiz habilitado en configuración del módulo
- [ ] Configuración del quiz:
  - [ ] Puntaje mínimo definido (recomendado: 80%)
  - [ ] Intentos máximos definidos (recomendado: 3)
  - [ ] Cooldown configurado (recomendado: 5 minutos)
- [ ] **Preguntas agregadas al quiz (mínimo 1, recomendado: 5-10)**
- [ ] Preview del quiz realizado
- [ ] Prueba como estudiante completada

---

## 📊 Ejemplo de Configuración Típica

```yaml
Etapa: "MÓDULO 0 — Cultura y Reglas"
  └─ Módulo: "Introducción a BraveGirls"
      ├─ Lecciones:
      │   ├─ 1. Bienvenida (Video Loom)
      │   ├─ 2. Nuestra Cultura (Texto)
      │   └─ 3. Reglas Importantes (Video Loom)
      │
      └─ Quiz:
          ├─ Puntaje mínimo: 80%
          ├─ Intentos máximos: 3
          ├─ Cooldown: 5 minutos
          └─ Preguntas:
              ├─ 1. "¿Cuál es el valor principal?"
              ├─ 2. "¿Qué está prohibido?"
              ├─ 3. "¿Cómo tratar a los fans?"
              ├─ 4. "¿Horario de trabajo?"
              └─ 5. "¿Qué hacer ante problemas?"
```

---

## 🆘 Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. **Revisa el Panel de Depuración** (como admin en el módulo)
2. **Verifica la consola del navegador** (F12) para errores técnicos
3. **Contacta al desarrollador** con screenshots del panel de depuración

---

**Última actualización**: v2.10 (2026-01-08)
