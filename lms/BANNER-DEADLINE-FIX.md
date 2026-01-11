# 🔧 FIX: Banner de Deadline Visible en Campus y Welcome

**Fecha**: 11 de Enero, 2026  
**Commit**: `0ed339a`  
**Problema Reportado**: El banner de días restantes no aparecía en campus.html

---

## 🐛 Problema Identificado

### 1. **Condición Incorrecta en Campus**
```javascript
// ❌ ANTES - Verificaba onboarding_completed_at
if (currentUser.onboarding_completed_at) return;

// ✅ AHORA - Verifica course_completed
if (currentUser.course_completed) return;
```

**Explicación**:
- `onboarding_completed_at` se marca cuando el usuario completa el welcome.html (primera vez)
- `course_completed` indica si completó TODO el curso (existe registro en `lms_course_completions`)
- El banner debe mostrarse hasta que complete TODO el curso, no solo el onboarding

---

### 2. **Faltaba Banner en Welcome**
El usuario solicitó que el banner también aparezca en `welcome.html` para que desde el primer login sepan su fecha límite.

---

### 3. **Backend No Retornaba `course_completed`**
Los endpoints `/auth/login` y `/auth/me` no incluían este campo, imposibilitando verificar si el usuario terminó el curso.

---

## ✅ Solución Implementada

### 1. **Backend: Retornar `course_completed`**

**Archivo**: `api/_handlers/lms-auth.js`

```javascript
// En handleLogin y handleMe, agregar consulta:
const completionResult = await query(
  'SELECT id FROM lms_course_completions WHERE user_id = $1',
  [user.id]
);
const courseCompleted = completionResult.rows.length > 0;

// Incluir en response:
return res.status(200).json({
  user: {
    // ... otros campos
    course_completed: courseCompleted
  }
});
```

**Impacto**: Ahora el frontend puede saber si el usuario completó el curso completo.

---

### 2. **Campus: Corregir Condición**

**Archivo**: `lms/campus.html`

```javascript
function showDeadlineBanner() {
  if (!currentUser.course_deadline) return;
  
  // ✅ Ahora verifica course_completed
  if (currentUser.course_completed) return;
  
  const daysRemaining = currentUser.days_remaining;
  // ... lógica del banner
}
```

**Resultado**: El banner se muestra mientras el curso no esté completo.

---

### 3. **Welcome: Agregar Banner**

**Archivo**: `lms/welcome.html`

#### HTML del Banner (líneas ~335-345):
```html
<!-- Deadline Warning Banner -->
<div id="deadlineBanner" class="hidden" style="margin-bottom: 30px; padding: 20px 24px; border-radius: 16px; display: flex; align-items: center; gap: 16px;">
  <i class="fas fa-clock" style="font-size: 28px;"></i>
  <div style="flex: 1;">
    <div id="deadlineTitle" style="font-weight: 700; font-size: 18px; margin-bottom: 6px;"></div>
    <div id="deadlineMessage" style="font-size: 15px; opacity: 0.95;"></div>
  </div>
</div>
```

#### JavaScript (líneas ~470-550):
```javascript
let currentUser = null;

async function checkAuth() {
  const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  const data = await response.json();
  
  currentUser = data.user;
  
  // Mostrar banner de deadline
  showDeadlineBanner();
}

function showDeadlineBanner() {
  if (!currentUser || !currentUser.course_deadline) return;
  
  const banner = document.getElementById('deadlineBanner');
  const title = document.getElementById('deadlineTitle');
  const message = document.getElementById('deadlineMessage');
  const daysRemaining = currentUser.days_remaining;

  if (currentUser.deadline_expired) {
    // Rojo crítico
    banner.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    title.innerHTML = '🚨 ¡Plazo Vencido!';
    message.innerHTML = `Tu fecha límite era el ${new Date(currentUser.course_deadline).toLocaleDateString('es-ES')}...`;
    banner.classList.remove('hidden');
  } else if (daysRemaining <= 1) {
    // Naranja urgente
    banner.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
    title.innerHTML = '⚠️ ¡ÚLTIMO DÍA!';
    banner.classList.remove('hidden');
  } else if (daysRemaining <= 3) {
    // Amarillo advertencia
    banner.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
    title.innerHTML = '⏱️ Tiempo Limitado';
    banner.classList.remove('hidden');
  } else if (daysRemaining <= 7) {
    // Azul informativo
    banner.style.background = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
    title.innerHTML = '📅 Fecha Límite para Completar el Curso';
    banner.classList.remove('hidden');
  }
}
```

**Resultado**: El usuario ve su deadline desde el primer login en welcome.html.

---

## 📊 Flujo Completo del Banner

```
1. Admin crea usuario con deadline (7 días, por ejemplo)
   ↓
2. Usuario recibe credenciales y hace login
   ↓
3. Backend calcula days_remaining y deadline_expired
   ↓
4. Backend consulta si existe en lms_course_completions → course_completed
   ↓
5. Frontend recibe currentUser con:
   - course_deadline: "2026-01-18T10:30:00.000Z"
   - days_remaining: 7
   - deadline_expired: false
   - course_completed: false
   ↓
6. welcome.html muestra banner azul: "📅 Fecha Límite... (7 días)"
   ↓
7. Usuario completa onboarding → Redirige a campus.html
   ↓
8. campus.html sigue mostrando banner (course_completed = false)
   ↓
9. Usuario estudia módulos, aprueba quizzes
   ↓
10. Banner cambia de color según días:
    - 7 días: Azul informativo
    - 3 días: Amarillo advertencia  
    - 1 día: Naranja urgente
    - 0 días: Rojo crítico
    ↓
11. Usuario aprueba último quiz → Backend inserta en lms_course_completions
    ↓
12. Siguiente request → course_completed = true
    ↓
13. Banner desaparece automáticamente ✅
```

---

## 🧪 Testing

### Escenario 1: Usuario Nuevo con Deadline 7 Días
1. Admin crea usuario con `deadlineDays = 7`
2. Usuario hace login
3. ✅ En welcome.html debe ver banner AZUL: "📅 Fecha Límite... (7 días)"
4. Completa onboarding → Redirige a campus
5. ✅ En campus.html debe ver mismo banner AZUL

### Escenario 2: Usuario con Deadline Próximo (3 días)
1. Usuario con deadline en 3 días entra a campus
2. ✅ Banner AMARILLO: "⏱️ Tiempo Limitado"
3. Mensaje: "Quedan 3 días para completar tu formación"

### Escenario 3: Usuario con Deadline Vencido
1. Usuario con deadline vencido hace login
2. ✅ Banner ROJO: "🚨 ¡Plazo Vencido!"
3. Mensaje: "Tu fecha límite era el... Contacta a tu supervisor urgentemente"

### Escenario 4: Usuario sin Deadline
1. Admin crea usuario sin seleccionar días
2. Usuario hace login
3. ✅ No se muestra banner (course_deadline = null)

### Escenario 5: Usuario Graduado
1. Usuario que completó curso (tiene registro en lms_course_completions)
2. Hace login → course_completed = true
3. ✅ Banner NO aparece (aunque tenga deadline)

---

## 📦 Archivos Modificados

### Backend (Deployed to Vercel)
- ✅ `api/_handlers/lms-auth.js`
  - Líneas ~100-120: Agregar consulta `course_completed` en `handleLogin`
  - Líneas ~175-195: Agregar consulta `course_completed` en `handleMe`

### Frontend (Needs FTP Upload)
- ⏳ `lms/campus.html` (v2.17.1)
  - Línea 147: Cambiar condición de `onboarding_completed_at` a `course_completed`
  
- ⏳ `lms/welcome.html` (v2.17.2)
  - Líneas ~335-345: HTML del banner
  - Líneas ~470-550: JavaScript para mostrar banner
  - Línea 17: Cache busting CSS `v=2.17.2`

---

## 🚀 Deployment

### 1. Backend (Ya Desplegado)
```bash
git push origin main  # ✅ Auto-deploy a Vercel (commit 0ed339a)
```

### 2. Frontend (Requiere FTP)
Subir a Hostinger `/public_html/lms/`:
- ⏳ `campus.html`
- ⏳ `welcome.html`

### 3. Database (Ya Ejecutada)
```sql
-- ✅ Ya existe de commit anterior (15088fc)
ALTER TABLE lms_users ADD COLUMN course_deadline TIMESTAMP;
ALTER TABLE lms_users ADD COLUMN enrollment_date TIMESTAMP;

-- ✅ Ya existe de commit anterior (b5d3e9d)
CREATE TABLE lms_course_completions (...);
```

---

## 🔍 Verificación Post-Deploy

### Consola del Navegador (DevTools → Network):
```javascript
// En login o /auth/me, verificar respuesta incluye:
{
  "user": {
    "course_deadline": "2026-01-18T10:30:00.000Z",
    "enrollment_date": "2026-01-11T08:15:00.000Z",
    "days_remaining": 7,
    "deadline_expired": false,
    "course_completed": false  // ← NUEVO CAMPO
  }
}
```

### Visual (Campus y Welcome):
- ✅ Banner visible si `days_remaining <= 7`
- ✅ Colores correctos según días
- ✅ Banner oculto si `course_completed = true`
- ✅ Banner oculto si `course_deadline = null`

---

## 📝 Notas Técnicas

### Cache Busting
```html
<!-- welcome.html -->
<link rel="stylesheet" href="/lms/lms-styles.css?v=2.17.2">

<!-- campus.html -->
<link rel="stylesheet" href="/lms/lms-styles.css?v=2.17.1">
```

Usuarios deben hacer **Ctrl+Shift+R** (hard refresh) después de subir archivos por FTP.

### Lógica de Días Restantes (Backend)
```javascript
const now = new Date();
const deadline = new Date(user.course_deadline);
const diffTime = deadline - now;
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

// Ejemplos:
// diffDays = 7 → "Quedan 7 días"
// diffDays = 1 → "¡ÚLTIMO DÍA!"
// diffDays = 0 → "¡QUEDAN HORAS!"
// diffDays = -3 → "Vencido hace 3 días"
```

---

## ✅ Checklist de Implementación

- [x] Backend retorna `course_completed` en `/auth/login`
- [x] Backend retorna `course_completed` en `/auth/me`
- [x] Campus verifica `course_completed` (no `onboarding_completed_at`)
- [x] Welcome tiene HTML del banner
- [x] Welcome tiene función `showDeadlineBanner()`
- [x] Welcome llama función después de `checkAuth()`
- [x] Cache busting actualizado (v2.17.2)
- [x] Git commit y push
- [ ] **Subir campus.html por FTP** ⏳
- [ ] **Subir welcome.html por FTP** ⏳
- [ ] Testing con usuario real ⏳

---

**Estado**: ✅ Código completado y desplegado a Vercel  
**Siguiente Paso**: Subir archivos HTML por FTP y probar con usuario chatter
