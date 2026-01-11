# ⏰ Sistema de Deadlines - Implementación Completa

**Fecha**: 11 de Enero, 2026  
**Commit**: 15088fc  
**Estado**: ✅ COMPLETADO

---

## 📋 RESUMEN

Se ha implementado completamente el **Sistema de Fechas Límite** que resuelve el problema #3 de la Auditoría:

### ❌ Problema Original
- Chatters podían tomar meses/años en completar el curso
- No había sentido de urgencia o compromiso
- Admin no podía establecer deadlines para chatters

### ✅ Solución Implementada
Sistema completo de deadlines que permite:
1. **Admin establece deadline** al crear usuario (3, 7, 14 o 30 días)
2. **Backend calcula** fecha exacta: `NOW() + INTERVAL 'X days'`
3. **Campus muestra banner** según días restantes
4. **Colores progresivos**: azul → amarillo → naranja → rojo
5. **Bloqueo visual** cuando deadline vence

---

## 🗂️ ARCHIVOS MODIFICADOS/CREADOS

### 1. **lms/migrate-deadlines.sql** (NUEVO)

```sql
ALTER TABLE lms_users 
ADD COLUMN IF NOT EXISTS course_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS enrollment_date TIMESTAMP DEFAULT NOW();

-- Usuarios existentes sin deadline → 7 días
UPDATE lms_users u
SET course_deadline = NOW() + INTERVAL '7 days'
WHERE u.role = 'chatter' 
  AND u.course_deadline IS NULL
  AND NOT EXISTS (SELECT 1 FROM lms_course_completions WHERE user_id = u.id);
```

**Índices**:
```sql
CREATE INDEX idx_users_deadline ON lms_users(course_deadline);
CREATE INDEX idx_users_enrollment ON lms_users(enrollment_date);
```

**Para aplicar**:
1. Ve a Vercel Postgres Query
2. Copia y pega el archivo completo
3. Ejecuta

**Verificación**:
```sql
-- Ver usuarios con deadline próximo
SELECT 
  name, email, 
  course_deadline,
  course_deadline - NOW() as time_remaining
FROM lms_users 
WHERE role = 'chatter' AND course_deadline IS NOT NULL
ORDER BY course_deadline ASC;
```

---

### 2. **lms/admin.html** (MODIFICADO)

#### A. Nuevo campo en modal de creación

```html
<div class="form-group">
  <label>Días para completar curso</label>
  <select id="newUserDeadlineDays" class="form-select">
    <option value="">Sin fecha límite</option>
    <option value="3">3 días (urgente)</option>
    <option value="7" selected>7 días (recomendado)</option>
    <option value="14">14 días (extendido)</option>
    <option value="30">30 días (flexible)</option>
  </select>
  <small>⏰ Tiempo máximo para completar el curso</small>
</div>
```

#### B. Actualización de funciones JS

```javascript
// Capturar deadlineDays del formulario
const deadlineDays = document.getElementById('newUserDeadlineDays').value;

// Pasar a createUser()
createUser(name, email, role, password, deadlineDays);

// Enviar al backend
if (deadlineDays && deadlineDays !== '') {
  body.deadlineDays = parseInt(deadlineDays);
}
```

**Versión CSS**: `v=2.17.0` (cache busting)

---

### 3. **api/_handlers/lms-admin.js** (MODIFICADO)

#### Endpoint POST /admin/users

```javascript
const { name, email, role, password, deadlineDays } = req.body;

// Query dinámico según si hay deadline
let insertQuery = `
  INSERT INTO lms_users (
    name, email, role, password_hash, active, enrollment_date
    ${deadlineDays ? ', course_deadline' : ''}
  )
  VALUES (
    $1, $2, $3, $4, true, NOW()
    ${deadlineDays ? `, NOW() + INTERVAL '${parseInt(deadlineDays)} days'` : ''}
  )
  RETURNING id, name, email, role, active, enrollment_date, course_deadline, created_at
`;
```

**Ejemplo de uso**:
```javascript
// Admin crea usuario con deadline de 7 días
POST /admin/users
{
  "name": "Ana García",
  "email": "ana@example.com",
  "role": "chatter",
  "deadlineDays": 7
}

// Respuesta:
{
  "user": {
    "id": "uuid-...",
    "name": "Ana García",
    "email": "ana@example.com",
    "role": "chatter",
    "enrollment_date": "2026-01-11T10:00:00Z",
    "course_deadline": "2026-01-18T10:00:00Z" // 7 días después
  }
}
```

---

### 4. **api/_handlers/lms-auth.js** (MODIFICADO)

#### A. Incluir nuevos campos en SELECT

```javascript
// En handleLogin y validateSession (usado por /auth/me)
const result = await query(
  'SELECT id, name, email, password_hash, role, active, first_login, onboarding_completed_at, must_change_password, course_deadline, enrollment_date FROM lms_users WHERE email = $1',
  [email.toLowerCase()]
);
```

#### B. Calcular días restantes

```javascript
// Calcular días restantes si hay deadline
let daysRemaining = null;
let deadlineExpired = false;

if (user.course_deadline) {
  const now = new Date();
  const deadline = new Date(user.course_deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  daysRemaining = diffDays;
  deadlineExpired = diffDays < 0;
}
```

#### C. Respuesta actualizada

```javascript
return res.status(200).json({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    // ... otros campos
    course_deadline: user.course_deadline,
    enrollment_date: user.enrollment_date,
    days_remaining: daysRemaining,      // ← NUEVO
    deadline_expired: deadlineExpired   // ← NUEVO
  }
});
```

**Ejemplos de respuesta**:

```javascript
// Usuario con 5 días restantes
{
  "user": {
    "course_deadline": "2026-01-16T10:00:00Z",
    "days_remaining": 5,
    "deadline_expired": false
  }
}

// Usuario con deadline vencido hace 2 días
{
  "user": {
    "course_deadline": "2026-01-09T10:00:00Z",
    "days_remaining": -2,
    "deadline_expired": true
  }
}

// Usuario sin deadline
{
  "user": {
    "course_deadline": null,
    "days_remaining": null,
    "deadline_expired": false
  }
}
```

---

### 5. **lms/campus.html** (MODIFICADO)

#### A. Banner HTML

```html
<div id="deadlineBanner" class="hidden" style="margin-bottom: 20px; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
  <i class="fas fa-clock" style="font-size: 24px;"></i>
  <div style="flex: 1;">
    <div id="deadlineTitle" style="font-weight: 600; font-size: 16px;"></div>
    <div id="deadlineMessage" style="font-size: 14px;"></div>
  </div>
</div>
```

#### B. Función showDeadlineBanner()

**Lógica de colores**:

```javascript
function showDeadlineBanner() {
  if (!currentUser.course_deadline) return; // Sin deadline
  if (currentUser.onboarding_completed_at) return; // Ya completó

  const daysRemaining = currentUser.days_remaining;

  if (currentUser.deadline_expired) {
    // 🚨 DEADLINE VENCIDO - ROJO CRÍTICO
    banner.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    title.innerHTML = '🚨 ¡Plazo Vencido!';
    message.innerHTML = `Tu fecha límite era el ${fecha}. Contacta a tu supervisor urgentemente.`;
    
  } else if (daysRemaining <= 1) {
    // ⏰ MENOS DE 1 DÍA - NARANJA URGENTE
    banner.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
    title.innerHTML = daysRemaining === 1 ? '⚠️ ¡ÚLTIMO DÍA!' : '⏰ ¡QUEDAN HORAS!';
    
  } else if (daysRemaining <= 3) {
    // ⏱️ 2-3 DÍAS - AMARILLO ADVERTENCIA
    banner.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
    title.innerHTML = '⏱️ Tiempo Limitado';
    message.innerHTML = `Quedan ${daysRemaining} días para completar tu formación. ¡Apresúrate!`;
    
  } else if (daysRemaining <= 7) {
    // 📅 4-7 DÍAS - AZUL INFORMATIVO
    banner.style.background = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
    title.innerHTML = '📅 Fecha Límite Próxima';
    message.innerHTML = `Tienes hasta el ${fecha} para completar el curso (${daysRemaining} días).`;
  }
  
  // > 7 días: NO mostrar banner
}
```

**Versión CSS**: `v=2.17.1` (cache busting)

---

## 🎨 EJEMPLOS VISUALES

### 1. Banner Azul (4-7 días)
```
┌──────────────────────────────────────────────────────────┐
│ 🕐  📅 Fecha Límite Próxima                              │
│     Tienes hasta el 18 de enero para completar el curso │
│     (6 días).                                            │
└──────────────────────────────────────────────────────────┘
```
- **Color**: Azul (#60a5fa)
- **Tono**: Informativo, sin presión

### 2. Banner Amarillo (2-3 días)
```
┌──────────────────────────────────────────────────────────┐
│ 🕐  ⏱️ Tiempo Limitado                                   │
│     Quedan 2 días para completar tu formación.          │
│     ¡Apresúrate!                                         │
└──────────────────────────────────────────────────────────┘
```
- **Color**: Amarillo (#fbbf24)
- **Tono**: Advertencia moderada

### 3. Banner Naranja (1 día o menos)
```
┌──────────────────────────────────────────────────────────┐
│ 🕐  ⚠️ ¡ÚLTIMO DÍA!                                      │
│     Tu plazo vence mañana. Completa el curso lo antes   │
│     posible.                                             │
└──────────────────────────────────────────────────────────┘
```
- **Color**: Naranja (#f97316)
- **Tono**: Urgente

### 4. Banner Rojo (vencido)
```
┌──────────────────────────────────────────────────────────┐
│ 🕐  🚨 ¡Plazo Vencido!                                   │
│     Tu fecha límite era el 10 de enero. Contacta a tu   │
│     supervisor urgentemente.                             │
└──────────────────────────────────────────────────────────┘
```
- **Color**: Rojo (#ef4444)
- **Tono**: Crítico
- **Acción**: Contactar supervisor

---

## 🚀 FLUJO COMPLETO

### Paso 1: Admin crea usuario con deadline

1. Login en `/lms/admin.html`
2. Click "Crear Usuario"
3. Llenar formulario:
   - Nombre: "Ana García"
   - Email: "ana@example.com"
   - Rol: "Chatter"
   - **Días para completar**: 7 días (recomendado)
4. Click "Crear Usuario"

**Backend registra**:
```sql
INSERT INTO lms_users (
  name, email, role, password_hash, 
  enrollment_date, course_deadline
) VALUES (
  'Ana García', 'ana@example.com', 'chatter', 'hash...',
  '2026-01-11 10:00:00',
  '2026-01-18 10:00:00'  -- +7 días
);
```

---

### Paso 2: Chatter hace login

```javascript
POST /api/lms/auth/login
{
  "email": "ana@example.com",
  "password": "temporal123"
}

// Response:
{
  "user": {
    "name": "Ana García",
    "course_deadline": "2026-01-18T10:00:00Z",
    "enrollment_date": "2026-01-11T10:00:00Z",
    "days_remaining": 7,
    "deadline_expired": false
  }
}
```

---

### Paso 3: Campus muestra banner según días

#### Día 1 (11 ene) - Quedan 7 días
- **Banner**: NO mostrado (> 7 días es flexible)

#### Día 5 (15 ene) - Quedan 3 días
- **Banner**: Amarillo
- **Mensaje**: "⏱️ Tiempo Limitado - Quedan 3 días"

#### Día 7 (17 ene) - Queda 1 día
- **Banner**: Naranja
- **Mensaje**: "⚠️ ¡ÚLTIMO DÍA! - Tu plazo vence mañana"

#### Día 8 (18 ene) - Quedan horas
- **Banner**: Naranja brillante
- **Mensaje**: "⏰ ¡QUEDAN HORAS! - Completa el curso HOY"

#### Día 9 (19 ene) - Vencido
- **Banner**: Rojo crítico
- **Mensaje**: "🚨 ¡Plazo Vencido! - Contacta a tu supervisor"

---

## 🧪 PRUEBAS RECOMENDADAS

### 1. Crear usuario con deadline de 3 días
```bash
# Backend:
POST /admin/users
{
  "name": "Test User",
  "email": "test@example.com",
  "role": "chatter",
  "deadlineDays": 3
}

# Verificar en DB:
SELECT course_deadline, course_deadline - NOW() as time_left 
FROM lms_users 
WHERE email = 'test@example.com';
```

### 2. Simular diferentes escenarios de deadline

```sql
-- Caso 1: Usuario con 1 día restante
UPDATE lms_users 
SET course_deadline = NOW() + INTERVAL '1 day'
WHERE email = 'test@example.com';

-- Caso 2: Usuario con deadline vencido hace 2 días
UPDATE lms_users 
SET course_deadline = NOW() - INTERVAL '2 days'
WHERE email = 'test@example.com';

-- Caso 3: Usuario sin deadline
UPDATE lms_users 
SET course_deadline = NULL
WHERE email = 'test@example.com';
```

Luego hacer login con ese usuario y verificar que el banner se muestre correctamente.

### 3. Verificar días restantes en response

```bash
# Hacer login
POST /api/lms/auth/login
{
  "email": "test@example.com",
  "password": "..."
}

# Verificar response.user.days_remaining
# Debe coincidir con CEIL((deadline - NOW()) / 1 day)
```

---

## 🔍 QUERIES ÚTILES

```sql
-- Ver todos los chatters con deadline próximo (< 7 días)
SELECT 
  name, email,
  enrollment_date,
  course_deadline,
  CEIL(EXTRACT(EPOCH FROM (course_deadline - NOW())) / 86400) as days_remaining,
  EXISTS(SELECT 1 FROM lms_course_completions WHERE user_id = lms_users.id) as completed
FROM lms_users 
WHERE role = 'chatter' 
  AND course_deadline IS NOT NULL
  AND course_deadline > NOW()
  AND course_deadline < NOW() + INTERVAL '7 days'
ORDER BY course_deadline ASC;

-- Ver chatters que vencieron deadline y NO completaron
SELECT 
  name, email,
  course_deadline,
  CEIL(EXTRACT(EPOCH FROM (NOW() - course_deadline)) / 86400) as days_overdue
FROM lms_users 
WHERE role = 'chatter' 
  AND course_deadline < NOW()
  AND NOT EXISTS(SELECT 1 FROM lms_course_completions WHERE user_id = lms_users.id);

-- Ver estadísticas de deadlines
SELECT 
  COUNT(*) FILTER (WHERE course_deadline IS NOT NULL) as with_deadline,
  COUNT(*) FILTER (WHERE course_deadline IS NULL) as without_deadline,
  COUNT(*) FILTER (WHERE course_deadline < NOW()) as expired,
  COUNT(*) FILTER (WHERE course_deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days') as urgent,
  COUNT(*) FILTER (WHERE EXISTS(SELECT 1 FROM lms_course_completions WHERE user_id = lms_users.id)) as completed
FROM lms_users 
WHERE role = 'chatter';
```

---

## 📝 NOTAS TÉCNICAS

### Limitaciones Actuales
1. **No hay bloqueo real**: Si deadline vence, solo se muestra banner rojo. No se bloquea acceso al campus.
2. **No hay emails**: No se envían notificaciones automáticas cuando quedan pocos días.
3. **Admin no puede editar deadline**: Solo se establece al crear usuario.

### Próximos Pasos (Opcionales)
1. **Bloqueo de acceso**: Si deadline vencido → redirigir a página de error
2. **Emails automáticos**:
   - Día -3: "Quedan 3 días"
   - Día -1: "¡Último día!"
   - Día 0: "Deadline vencido"
3. **Campo editable en admin**: Permitir modificar deadline después de crear usuario
4. **Extensiones**: Botón para supervisor/admin extender deadline +X días

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear tabla con columnas `course_deadline` y `enrollment_date`
- [x] Agregar campo en formulario admin (select de días)
- [x] Backend calcular deadline con INTERVAL
- [x] Endpoint /auth/me retornar days_remaining
- [x] Función showDeadlineBanner() con 4 niveles
- [x] Colores progresivos (azul → amarillo → naranja → rojo)
- [x] No mostrar banner si > 7 días
- [x] No mostrar banner si ya completó curso
- [x] Cache busting (v2.17.0 admin, v2.17.1 campus)
- [x] Índices en DB para performance

---

## 🎯 IMPACTO

### Antes
- ❌ Chatters sin sentido de urgencia
- ❌ Podían tomar meses en completar
- ❌ Admin sin control sobre tiempos

### Después
- ✅ Deadline claro desde el inicio
- ✅ Banner visual que aumenta presión
- ✅ Admin controla tiempos de formación
- ✅ Urgencia gradual (7 días → colores)
- ✅ Tracking de vencimientos en DB

---

**Implementado por**: AI Assistant  
**Commit**: 15088fc  
**Próximo deployment**: Automático vía Vercel
