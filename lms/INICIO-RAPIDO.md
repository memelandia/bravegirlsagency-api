# 🚀 GUÍA RÁPIDA - Despliegue LMS

## ✅ CONFIGURACIÓN COMPLETADA

El sistema está 100% configurado y el API **ya está desplegado en Vercel**:

- ✅ Frontend: HTML con URLs absolutas a Vercel
- ✅ Backend: API en GitHub, Vercel lo desplegó automáticamente
- ✅ CORS: Configurado para `www.bravegirlsagency.com`
- ✅ Base de datos: Schema y seed listos para ejecutar en `supervision-db`

---

## 📋 PASOS PARA COMPLETAR EL DESPLIEGUE (30 minutos)

### 1️⃣ BASE DE DATOS (10 min)

**Usar tu base de datos existente `supervision-db`** (NO crear una nueva)

1. Ve a https://neon.tech
2. Selecciona tu proyecto **`supervision-db`**
3. Clic en **SQL Editor**
4. Abre el archivo **`lms/schema.sql`** desde tu carpeta local
5. Copia TODO el contenido (300+ líneas)
6. Pega en SQL Editor y clic **"Run"**
7. Espera a que diga "Success"
8. Abre el archivo **`lms/seed.sql`**
9. Copia TODO el contenido
10. Pega en SQL Editor y clic **"Run"**
11. Espera a que diga "Success"

**Verificar:**
```sql
SELECT COUNT(*) FROM lms_modules; -- Debe dar 8
SELECT email FROM lms_users WHERE role = 'admin'; -- Debe mostrar admin@bravegirlsagency.com
```

---

### 2️⃣ VERIFICAR VERCEL (2 min)

1. Ve a https://vercel.com/dashboard
2. Selecciona **`bravegirlsagency-api`**
3. Ve a **Deployments**
4. Verifica que el último deployment diga **"Ready"** (círculo verde)

**Si dice "Building..."**: Espera 1-2 minutos más

**Probar API:**
- Abre: `https://bravegirlsagency-api.vercel.app/api/lms/auth/me`
- Debe responder: `{"error":"No autenticado"}` ✅

---

### 3️⃣ FRONTEND HOSTINGER (15 min)

#### Opción A: FileZilla/WinSCP
1. Conecta a `ftp.bravegirlsagency.com` con tus credenciales
2. Navega a `public_html/`
3. Crea carpeta `lms`
4. Sube estos 7 archivos a `public_html/lms/`:
   - `index.html`
   - `login.html`
   - `campus.html`
   - `module.html`
   - `quiz.html`
   - `admin.html`
   - `lms-styles.css`

**Opción B: File Manager de Hostinger (Más fácil)**
1. Panel de Hostinger → Files → File Manager
2. Navega a `public_html/`
3. Click "New Folder" → `lms`
4. Entra a `lms/` → Click "Upload"
5. Selecciona los 7 archivos y espera a que termine

---

### 4️⃣ PRUEBAS (5 min)

1. **Abrir sitio:**
   - Ve a: `https://www.bravegirlsagency.com/lms/`
   - Debe redirigir a login

2. **Login Admin:**
   - Email: `admin@bravegirlsagency.com`
   - Password: `Admin2026!`
   - Debe redirigir a `admin.html`

3. **Verificar panel:**
   - Tab "Usuarios" → 1 usuario (admin)
   - Tab "Módulos" → 8 módulos
   - Tab "Lecciones" → ~20 lecciones

4. **Crear usuario test:**
   - Tab "Usuarios" → "Crear Nuevo Usuario"
   - Nombre: Test Chatter
   - Email: `test@bravegirlsagency.com`
   - Rol: `chatter`
   - Anotar contraseña temporal

5. **Probar como chatter:**
   - Cerrar sesión (o incógnito)
   - Login con `test@bravegirlsagency.com`
   - Solo Módulo 1 debe estar desbloqueado
   - Marca lecciones como completadas
   - Intenta ir al quiz (debería funcionar después de completar todas las lecciones)

---

## ⚠️ TAREAS POST-DEPLOYMENT (CRÍTICO)

### Hacer INMEDIATAMENTE:

1. **Cambiar contraseña admin**
   - La actual `Admin2026!` es temporal
   - Panel admin → Usuarios → Admin → Resetear

2. **Crear preguntas de quiz** (8 quizzes vacíos)
   - Panel admin → Preguntas
   - Mínimo 5-10 preguntas por módulo
   - Cada pregunta: 4 opciones, 1 correcta

3. **Reemplazar videos de Loom**
   - Todas las URLs son placeholder: `https://www.loom.com/embed/placeholder-video-X`
   - Graba tus videos en Loom
   - Panel admin → Lecciones → Editar URL
   - Formato: `https://www.loom.com/embed/<ID_DEL_VIDEO>`

---

## 🆘 TROUBLESHOOTING

### No puedo hacer login (error "No autenticado")

**Causa**: Cookies no se envían entre dominios.

**Fix:**
1. Verifica que `vercel.json` tenga `Access-Control-Allow-Origin: "https://www.bravegirlsagency.com"` ✅ (ya está)
2. Limpia cache: Ctrl+Shift+Del → Cookies y cache
3. Prueba en navegador incógnito

### Error "Failed to fetch"

**Causa**: CORS bloqueando requests.

**Fix:**
1. Vercel → Deployments → última → Runtime Logs (busca errores)
2. F12 en el navegador → Console (busca errores CORS)
3. Verifica que pusiste `POSTGRES_URL` en Vercel Environment Variables

### Los videos no cargan

**Causa**: URLs placeholder no reemplazadas.

**Fix:**
1. Grava videos en Loom
2. Copia el ID después de `/share/` en la URL de Loom
3. Usa formato: `https://www.loom.com/embed/<ID>`

---

## 📂 ESTRUCTURA FINAL

```
www.bravegirlsagency.com/
├── (tu sitio actual - sin cambios)
├── supervision/             (ya existe)
│   └── index.html
└── lms/                     ← NUEVO
    ├── index.html
    ├── login.html
    ├── campus.html
    ├── module.html
    ├── quiz.html
    ├── admin.html
    └── lms-styles.css

bravegirlsagency-api.vercel.app/
├── api/
│   ├── supervision/         (ya existe)
│   └── lms/                 ← NUEVO
│       ├── lib/
│       ├── auth/
│       ├── admin/
│       ├── campus.js
│       ├── module/
│       ├── lesson/
│       └── quiz/
```

---

## 📝 NOTAS IMPORTANTES

1. **No rompe nada existente**: Todo está aislado en `/lms/`
2. **Mismo patrón que supervision**: Si supervision funciona, esto funcionará
3. **Documentación completa**: Ver `/lms/DEPLOYMENT.md` para detalles
4. **Seguridad**: Contraseñas bcrypt, cookies httpOnly, validación server-side

---

**¡Todo listo para desplegar! 🎉**

Sigue los 4 pasos en orden y tendrás el LMS funcionando en ~1 hora.
