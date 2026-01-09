# ✅ PLAN DE PRUEBAS - Sistema de Onboarding v2.16

## 🎯 Objetivo
Verificar que el flujo completo de onboarding funciona correctamente desde el login hasta el campus.

---

## 📋 PRE-REQUISITOS (Verificar primero)

### 1. ✅ Verificar Deploy de Vercel
1. Ve a: https://vercel.com/dashboard
2. Busca tu proyecto: **bravegirlsagency-api**
3. Verifica que el último deploy sea: **commit b0c1fcc**
4. Estado debe ser: ✅ **Ready** (no "Building" o "Error")

### 2. ✅ Verificar Migración SQL
Ejecuta en Vercel Postgres Query:
```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'lms_users' 
  AND column_name IN ('first_login', 'onboarding_completed_at', 'must_change_password', 'password_changed_at')
ORDER BY column_name;
```

**Resultado esperado**: Debe mostrar 4 filas con las nuevas columnas.

Si NO aparecen, ejecuta la migración:
```sql
ALTER TABLE lms_users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
ALTER TABLE lms_users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE lms_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE lms_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
```

### 3. ✅ Verificar archivos en Hostinger
Confirma que estos archivos existan vía FTP:
- `/lms/welcome.html`
- `/lms/login.html` (actualizado)

---

## 🧪 TEST 1: Verificar Backend API

### Paso 1.1: Test de endpoint /auth/me
Abre **Postman** o tu terminal y ejecuta:

```bash
# Desde PowerShell
Invoke-RestMethod -Uri "https://bravegirlsagency-api.vercel.app/api/lms/auth/me" `
  -Method GET `
  -Headers @{"Cookie"="lms_session=test"}
```

**Resultado esperado**: Error 401 (normal, no hay sesión válida)

Si ves **404 o 500**, el backend no está desplegado correctamente.

### Paso 1.2: Test de estructura de respuesta
Necesitamos un usuario real. Ve al Admin Panel y toma nota de un email existente.

---

## 🧪 TEST 2: Crear Usuario de Prueba

### Opción A: Desde Admin Panel
1. Ve a: `https://tudominio.com/lms/admin.html`
2. Login como admin
3. Tab "Users" → "Crear Usuario"
4. Crea usuario de prueba:
   ```
   Nombre: Test Onboarding 2026
   Email: onboarding-test@braveagency.com
   Password: TempPass123!
   Rol: chatter
   ```
5. Click "Crear"

### Opción B: Desde SQL (más rápido)
Ejecuta en Vercel Postgres:
```sql
-- Hash de "TempPass123!" con bcrypt
-- (Genera uno nuevo en: https://bcrypt-generator.com)
INSERT INTO lms_users (name, email, password_hash, role, first_login, onboarding_completed_at, active)
VALUES (
  'Test Onboarding 2026',
  'onboarding-test@braveagency.com',
  '$2a$10$YourBcryptHashHere',  -- Reemplaza con hash real
  'chatter',
  true,   -- ✅ Importante: first_login = true
  NULL,   -- ✅ Importante: onboarding_completed_at = NULL
  true
);
```

### Verificar que se creó correctamente:
```sql
SELECT 
  name, 
  email, 
  role, 
  first_login, 
  onboarding_completed_at,
  active
FROM lms_users
WHERE email = 'onboarding-test@braveagency.com';
```

**Resultado esperado**:
- `first_login` = `true`
- `onboarding_completed_at` = `NULL`

---

## 🧪 TEST 3: Flujo Completo de Onboarding

### Paso 3.1: Login y Redirección Automática
1. **Abre ventana de incógnito** (importante para evitar cookies viejas)
2. Ve a: `https://tudominio.com/lms/login.html`
3. Ingresa credenciales:
   - Email: `onboarding-test@braveagency.com`
   - Password: `TempPass123!`
4. Click "Iniciar Sesión"

**✅ Resultado esperado**: 
- Debe redirigir AUTOMÁTICAMENTE a `/lms/welcome.html`
- **NO debe ir a `/lms/campus.html`**

**❌ Si va directo a campus.html**:
- El campo `first_login` está en `false` en la DB
- O la lógica de redirección no funcionó

**❌ Si ves error 404 en welcome.html**:
- El archivo no se subió por FTP a Hostinger

### Paso 3.2: Verificar Contenido de Welcome
Deberías ver:
- ✅ Título: "¡Bienvenido/a a BraveGirls Academy! 🎓"
- ✅ Video embed de Loom (puede estar vacío si no personalizaste)
- ✅ Sección "¿Qué te espera en este curso?"
- ✅ Sección "Reglas Importantes"
- ✅ Botón grande: "Comenzar mi Formación"
- ✅ Botón secundario: "Hacer Tour del Campus"

### Paso 3.3: Tour Interactivo (Opcional)
1. Click en "Hacer Tour del Campus"
2. **✅ Resultado esperado**: Aparece modal de Shepherd.js con pasos del tour
3. Click "Comenzar Tour"
4. Navega por los steps
5. En el último step, click "Empezar Ahora"

### Paso 3.4: Completar Onboarding
1. Click en botón principal: "Comenzar mi Formación"
2. **✅ Resultado esperado**: 
   - Botón cambia a: "🔄 Preparando..."
   - Aparece indicador de progreso (3 dots animados)
   - Después de ~1 segundo, redirige a `/lms/campus.html`

**❌ Si ves error o no redirige**:
- Abre DevTools (F12) → Tab "Console"
- Busca errores en rojo
- Busca errores en tab "Network" en la petición `complete-onboarding`

### Paso 3.5: Verificar que llegó al Campus
Deberías estar en: `https://tudominio.com/lms/campus.html`
- ✅ Ves las etapas del curso
- ✅ Puedes navegar normalmente

---

## 🧪 TEST 4: Verificar que NO Vuelve a Salir

### Paso 4.1: Logout y Re-login
1. En campus.html, click en "Cerrar Sesión" (arriba derecha)
2. Vuelves a login.html
3. Login NUEVAMENTE con el mismo usuario:
   - Email: `onboarding-test@braveagency.com`
   - Password: `TempPass123!`

**✅ Resultado esperado**: 
- Debe ir **DIRECTO a `/lms/campus.html`**
- **NO debe pasar por welcome.html**

**❌ Si vuelve a welcome.html**:
- El endpoint `/auth/complete-onboarding` no actualizó la DB
- Verifica en SQL:
```sql
SELECT first_login, onboarding_completed_at 
FROM lms_users 
WHERE email = 'onboarding-test@braveagency.com';
```
- Debería ser: `first_login = false`, `onboarding_completed_at = (fecha/hora)`

---

## 🧪 TEST 5: Verificar Usuarios Existentes

### Paso 5.1: Login con usuario viejo
1. Usa un usuario que YA existía ANTES de la migración
2. Login con ese usuario
3. **✅ Resultado esperado**: Va DIRECTO a campus (no pasa por welcome)

**Razón**: La migración marcó a todos los usuarios existentes como si ya completaron onboarding.

### Paso 5.2: Verificar en DB
```sql
SELECT 
  name,
  email,
  first_login,
  onboarding_completed_at,
  created_at
FROM lms_users
WHERE created_at < '2026-01-09'  -- Usuarios viejos
ORDER BY created_at DESC
LIMIT 5;
```

**✅ Resultado esperado**: Todos tienen:
- `first_login = false`
- `onboarding_completed_at` con timestamp

---

## 🧪 TEST 6: Verificar Admin/Supervisor

### Paso 6.1: Login como Admin
1. Login con usuario rol `admin` o `supervisor`
2. **✅ Resultado esperado**: Va DIRECTO a `/lms/admin.html`
3. **NO pasa por welcome.html** (aunque sea first_login = true)

**Razón**: La lógica de redirección solo aplica onboarding a rol `chatter`.

---

## 🧪 TEST 7: Test de Seguridad del Endpoint

### Paso 7.1: Intentar completar onboarding sin login
Abre DevTools Console y ejecuta:
```javascript
fetch('https://bravegirlsagency-api.vercel.app/api/lms/auth/complete-onboarding', {
  method: 'PATCH',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log(data));
```

**✅ Resultado esperado**: Error 401 "No autorizado"

### Paso 7.2: Verificar que solo acepta PATCH
Intenta con GET:
```javascript
fetch('https://bravegirlsagency-api.vercel.app/api/lms/auth/complete-onboarding', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log(data));
```

**✅ Resultado esperado**: Error 405 "Método no permitido"

---

## 📊 CHECKLIST DE VALIDACIÓN FINAL

Marca cada item después de probarlo:

### Backend (Vercel):
- [ ] Deploy exitoso (commit b0c1fcc)
- [ ] Endpoint `/auth/me` responde (aunque sea 401)
- [ ] Endpoint `/auth/complete-onboarding` existe
- [ ] Login retorna campos `first_login`, `onboarding_completed_at`

### Base de Datos:
- [ ] Columnas nuevas existen en `lms_users`
- [ ] Usuarios viejos tienen `first_login = false`
- [ ] Nuevos usuarios se crean con `first_login = true`

### Frontend (Hostinger):
- [ ] `/lms/welcome.html` existe y carga correctamente
- [ ] `/lms/login.html` actualizado (lógica de redirección)
- [ ] CSS carga correctamente (v2.15)
- [ ] Shepherd.js carga (tour interactivo)

### Flujo de Usuario Nuevo:
- [ ] Login → Redirige a welcome.html automáticamente
- [ ] Welcome muestra contenido correcto
- [ ] Botón "Comenzar Formación" funciona
- [ ] Redirige a campus.html después de completar
- [ ] Re-login → Va directo a campus (sin welcome)

### Flujo de Usuario Existente:
- [ ] Login → Va directo a campus (sin welcome)

### Flujo de Admin/Supervisor:
- [ ] Login → Va directo a admin.html (sin welcome)

### Seguridad:
- [ ] No se puede completar onboarding sin login
- [ ] Solo acepta método PATCH

---

## ❌ TROUBLESHOOTING COMÚN

### Problema: "404 Not Found" en welcome.html
**Causa**: Archivo no subido por FTP
**Solución**: 
1. Verifica ruta en Hostinger: `/public_html/lms/welcome.html`
2. Re-sube el archivo
3. Verifica permisos (644)

### Problema: Usuario siempre va a welcome.html (loop infinito)
**Causa**: Endpoint `/complete-onboarding` no actualiza DB
**Solución**:
1. Verifica logs en Vercel: Dashboard → Functions → lms → Logs
2. Busca errores en la query UPDATE
3. Verifica que las columnas existan en la DB

### Problema: Todos van a campus, nadie a welcome
**Causa**: Usuarios se crean con `first_login = false` por defecto
**Solución**:
1. Verifica schema.sql: `first_login BOOLEAN DEFAULT true`
2. Al crear usuario manualmente, establece explícitamente `first_login = true`

### Problema: Error "correctOptionIndex is not defined"
**Causa**: Confusión con otro feature (quiz security)
**Solución**: Esto es para el SIGUIENTE paso de la auditoría, no afecta onboarding

### Problema: CSS roto en welcome.html
**Causa**: Ruta incorrecta de lms-styles.css
**Solución**: Verifica línea 14 de welcome.html:
```html
<link rel="stylesheet" href="/lms/lms-styles.css?v=2.15">
```

---

## 🎉 ÉXITO - Todo Funciona!

Si completaste TODOS los checks del checklist, ¡felicitaciones! 🎊

El sistema de onboarding está **100% funcional** y listo para producción.

### Siguiente Paso Recomendado:
1. **Personalizar video** en welcome.html (línea 238)
2. **Implementar Fase 1.2**: Deadlines y tracking de tiempo
3. **Implementar Fase 1.3**: Seguridad en quiz (ocultar respuestas correctas)

---

**Creado**: 9 Enero 2026  
**Tiempo de testing**: 15-20 minutos  
**Prioridad**: CRÍTICA (debe funcionar antes de continuar)
