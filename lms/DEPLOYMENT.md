# 🚀 Guía de Despliegue - LMS BraveGirls Agency

Esta guía te llevará paso a paso para desplegar el LMS usando **Hostinger (Frontend)** + **Vercel (API)** + **Neon.tech (Database)**.

**IGUAL QUE EL MÓDULO DE SUPERVISIÓN:**
- 🌐 Frontend HTML → Hostinger vía FTP (`www.bravegirlsagency.com/lms/`)
- ⚡ API Endpoints → Vercel (`bravegirlsagency-api.vercel.app/api/lms/`) ✅ YA DESPLEGADO
- 🗄️ PostgreSQL → Neon.tech (usar `supervision-db` existente)

---

## 📋 RESUMEN RÁPIDO - Lo que tienes que hacer

### ✅ Ya está hecho:
- El API ya está en GitHub y Vercel lo está desplegando automáticamente
- Los archivos HTML ya tienen las URLs correctas apuntando a Vercel
- El `vercel.json` ya tiene CORS configurado correctamente

### 🔴 Lo que DEBES hacer TÚ (30 minutos):

1. **Base de Datos** (10 min):
   - Ir a Neon → `supervision-db` → SQL Editor
   - Ejecutar `schema.sql` completo
   - Ejecutar `seed.sql` completo

2. **Frontend FTP** (15 min):
   - Conectar a Hostinger File Manager
   - Crear carpeta `public_html/lms/`
   - Subir 7 archivos: `*.html` + `lms-styles.css`

3. **Pruebas** (5 min):
   - Abrir `www.bravegirlsagency.com/lms/`
   - Login con admin: `admin@bravegirlsagency.com` / `Admin2026!`

---

## 📋 Pre-requisitos

- ✅ Acceso FTP a Hostinger (www.bravegirlsagency.com)
- ✅ Cuenta en Vercel (ya tienes el proyecto API)
- ✅ Cuenta en Neon.tech (ya tienes `supervision-db`)
- ✅ Cliente FTP o File Manager de Hostinger

---

## 🗄️ PARTE 1: Base de Datos (Neon.tech)

### ✅ Usar tu Base de Datos Existente `supervision-db`

**Buenas noticias:** Puedes usar tu base de datos existente `supervision-db` sin crear una nueva. Las tablas del LMS tienen prefijo `lms_*` y NO conflictúan con las de supervision o CRM.

### Paso 1: Ejecutar Schema en `supervision-db`

1. Ingresa a https://neon.tech
2. Selecciona tu proyecto existente **`supervision-db`**
3. Ve a **SQL Editor**
4. Abre el archivo **`/lms/schema.sql`** de tu proyecto local
5. Copia **TODO** el contenido (es largo, ~300 líneas)
6. Pégalo en el SQL Editor de Neon
7. Clic en **"Run"** 
8. Espera ~5 segundos hasta que diga "Success"

**Esto creará 8 tablas nuevas:**
- `lms_users`
- `lms_stages`
- `lms_modules`
- `lms_lessons`
- `lms_quizzes`
- `lms_questions`
- `lms_progress_lessons`
- `lms_quiz_attempts`

### Paso 2: Cargar Datos Iniciales

1. En el mismo SQL Editor de Neon
2. Abre el archivo **`/lms/seed.sql`** de tu proyecto local
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Clic en **"Run"**
6. Espera hasta que diga "Success"

**Esto insertará:**
- 1 usuario admin: `admin@bravegirlsagency.com` / `Admin2026!`
- 8 Etapas del curso
- 8 Módulos con descripciones
- ~20 Lecciones (con URLs placeholder de Loom)
- 8 Quizzes vacíos (sin preguntas aún)

### Paso 3: Verificar Instalación

Ejecuta en el SQL Editor para confirmar:

```sql
-- Verificar que se crearon las 8 tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'lms_%';

-- Verificar usuario admin
SELECT email, role, active FROM lms_users WHERE role = 'admin';

-- Verificar módulos (debe retornar 8)
SELECT COUNT(*) FROM lms_modules;
```

**Resultado esperado:**
- Primera query: 8 filas (las 8 tablas)
- Segunda query: 1 fila con `admin@bravegirlsagency.com`
- Tercera query: `8`

✅ **Si todo sale bien, tu base de datos está lista.**

---

## ⚡ PARTE 2: API en Vercel

### ✅ El API ya está desplegado

**Ya hice el push a GitHub**, así que Vercel ya está desplegando automáticamente. Solo necesitas esperar 2-3 minutos.

### Paso 1: Verificar que el Deploy esté Completo

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto **`bravegirlsagency-api`**
3. Ve a la pestaña **"Deployments"**
4. Espera a que el primer deployment diga **"Ready"** (círculo verde)
5. Si dice "Building..." espera 1-2 minutos más

### Paso 2: Variables de Entorno (NO NECESITAS CAMBIAR NADA)

Tu variable `POSTGRES_URL` **ya existe** y apunta a `supervision-db`, así que el LMS usará la misma base de datos.

**Para verificar:**
1. En Vercel → Settings → Environment Variables
2. Busca `POSTGRES_URL`
3. Debe existir y tener un valor como: `postgresql://user:pass@ep-xxx.neon.tech/supervision-db`

✅ **Si existe, no toques nada. Ya está configurado correctamente.**

⚠️ **Solo si NO existe `POSTGRES_URL`:**
1. Clic en "Add New"
2. Name: `POSTGRES_URL`
3. Value: (copia el Connection String de tu DB `supervision-db` desde Neon)
4. Apply to: All (Production, Preview, Development)
5. Save
6. Haz "Redeploy" del último deployment

### Paso 3: Verificar que el API Funcione

Abre estos URLs en tu navegador:

```
1. https://bravegirlsagency-api.vercel.app/api/lms/auth/me
   → Debe responder: {"error":"No autenticado"}

2. https://bravegirlsagency-api.vercel.app/api/supervision/semanal
   → Debe funcionar normalmente (verificar que no rompimos nada)
```

**Si ves el error "No autenticado" en el primer link = ✅ API funcionando correctamente**

**Si ves error 500 o "Internal Server Error":**
1. Ve a Vercel → Deployments → (el último) → Runtime Logs
2. Busca el error rojo
3. Probablemente falta la variable `POSTGRES_URL`

---

## 🌐 PARTE 3: Frontend en Hostinger (FTP)

### Paso 1: Conectar por FTP

**Recomendado: File Manager de Hostinger (más fácil)**

1. Ingresa al panel de Hostinger
2. Ve a **Files → File Manager**
3. Navega a **`public_html/`**

**Alternativa: FileZilla**
1. Host: `ftp.bravegirlsagency.com`
2. Usuario: (tu usuario FTP)
3. Contraseña: (tu contraseña FTP)
4. Puerto: 21

### Paso 2: Crear Carpeta `/lms/`

1. Estando en `public_html/`, clic derecho → **New Folder**
2. Nombre: **`lms`** (todo en minúsculas)
3. Entra a la carpeta `lms/`

### Paso 3: Subir 7 Archivos HTML/CSS

Sube estos archivos desde tu proyecto local **`lms/`** a Hostinger **`public_html/lms/`**:

**Archivos a subir:**
1. ✅ `index.html`
2. ✅ `login.html`
3. ✅ `campus.html`
4. ✅ `module.html`
5. ✅ `quiz.html`
6. ✅ `admin.html`
7. ✅ `lms-styles.css`

**⚠️ NO subir:**
- ❌ `schema.sql`
- ❌ `seed.sql`
- ❌ `README.md`
- ❌ Carpetas de documentación

**En File Manager de Hostinger:**
- Clic en "Upload" (botón arriba)
- Selecciona los 7 archivos
- Espera a que termine

**En FileZilla:**
- Arrastra los 7 archivos desde tu carpeta local a la carpeta `public_html/lms/` en el servidor

### Paso 4: Verificar Archivos Subidos

En File Manager de Hostinger, verifica que veas:

```
public_html/
  └── lms/
      ├── index.html
      ├── login.html
      ├── campus.html
      ├── module.html
      ├── quiz.html
      ├── admin.html
      └── lms-styles.css
```

**Total: 7 archivos**

✅ **Los archivos YA tienen las URLs correctas apuntando a Vercel** (ya las configuré antes del push).

---

## ✅ PARTE 4: Pruebas Finales

### 1. Verificar Acceso Público

Abre en tu navegador:

```
https://www.bravegirlsagency.com/lms/
```

Debería redirigirte automáticamente a:

```
https://www.bravegirlsagency.com/lms/login.html
```

### 2. Probar Login

1. Ingresa con el usuario admin:
   - **Email**: `admin@bravegirlsagency.com`
   - **Contraseña**: `Admin2026!`

2. Deberías ser redirigido a:
   ```
   https://www.bravegirlsagency.com/lms/admin.html
   ```

3. Verifica que se carguen los usuarios, módulos, lecciones, etc.

### 3. Crear un Chatter de Prueba

Desde el panel admin:

1. Ve a la pestaña **"Usuarios"**
2. Clic en **"Crear Nuevo Usuario"**
3. Llena el formulario:
   - **Nombre**: Test Chatter
   - **Email**: `test@bravegirlsagency.com`
   - **Rol**: `chatter`
   - **Activo**: Sí
4. Guarda el usuario
5. Anota la contraseña temporal generada

### 4. Probar Flujo Chatter

1. Cierra sesión (o usa navegador incógnito)
2. Ingresa con el usuario test:
   - **Email**: `test@bravegirlsagency.com`
   - **Contraseña**: (la temporal que anotaste)

3. Deberías ser redirigido a:
   ```
   https://www.bravegirlsagency.com/lms/campus.html
   ```

4. Verifica:
   - ✅ Se muestra el progreso general (0%)
   - ✅ Solo el primer módulo está desbloqueado (verde)
   - ✅ Los demás están bloqueados (gris con candado)

5. Haz clic en el primer módulo:
   - ✅ Deberías ver las lecciones del módulo
   - ✅ Puedes marcar lecciones como completadas
   - ✅ Después de completar todas, aparece el botón "Ir al Quiz"

6. Intenta acceder a un quiz sin completar lecciones:
   - Abre manualmente: `https://www.bravegirlsagency.com/lms/quiz.html?moduleId=<UUID>`
   - ✅ Debería mostrar error "Debes completar todas las lecciones primero"

---

## 🔧 Troubleshooting

### Error: "No autenticado" al hacer login

**Causa**: Cookies no se están enviando entre dominios.

**Solución**:
1. Verifica que `vercel.json` tenga `Access-Control-Allow-Credentials: true`
2. Verifica que `Access-Control-Allow-Origin` sea tu dominio exacto (NO `*`)
3. En el código de login.html, asegúrate que el fetch tenga:
   ```javascript
   fetch(API_URL, {
     method: 'POST',
     credentials: 'include', // ← IMPORTANTE
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   })
   ```

### Error: "Failed to fetch" o CORS

**Causa**: Configuración CORS incorrecta.

**Solución**:
1. Revisa `vercel.json` en la raíz del proyecto
2. Asegúrate de que `Access-Control-Allow-Origin` sea `https://www.bravegirlsagency.com` (sin barra final)
3. Re-despliega Vercel después de cambiar `vercel.json`

### Los módulos no se desbloquean

**Causa**: Función `lms_can_access_module()` no está creada en la base de datos.

**Solución**:
1. Ve a Neon SQL Editor
2. Ejecuta nuevamente el contenido de `schema.sql` (específicamente la función al final)
3. Verifica:
   ```sql
   SELECT lms_can_access_module('<USER_ID>', '<MODULE_ID>');
   ```

### Las lecciones de video no cargan (Loom)

**Causa**: URLs placeholder aún no reemplazadas.

**Solución**:
1. Ingresa al admin panel
2. Ve a **Lecciones**
3. Edita cada lección de tipo "video"
4. Reemplaza `https://www.loom.com/embed/placeholder-video-X` con URLs reales de Loom

**Formato correcto de URL Loom:**
```
https://www.loom.com/embed/abc123def456
```
(NO incluir `/share/` ni parámetros extra)

### No puedo aprobar quizzes

**Causa**: Quizzes vacíos (sin preguntas).

**Solución**:
1. Ingresa al admin panel
2. Ve a **Preguntas**
3. Crea al menos 5-10 preguntas para cada módulo
4. Asegúrate de marcar correctamente la opción correcta (campo `is_correct`)

---

## 📊 Post-Deployment Tasks

### ⚠️ CRÍTICO - Cambiar Contraseña Admin

```sql
-- Ejecutar en Neon SQL Editor
UPDATE lms_users 
SET password_hash = '$2a$10$<NUEVO_HASH>' 
WHERE email = 'admin@bravegirlsagency.com';
```

O mejor, desde el panel admin:
1. Ve a **Usuarios**
2. Busca al admin
3. Haz clic en "Resetear Contraseña"
4. Usa la nueva contraseña temporal generada y cámbiala nuevamente por la interfaz de login (si implementas cambio de contraseña)

### ✅ Tareas de Contenido

1. **Reemplazar videos placeholder** (20 lecciones):
   - Graba los videos en Loom
   - Copia el ID del video (después de `/share/`)
   - Actualiza cada lección en el admin panel
   - Formato: `https://www.loom.com/embed/<ID>`

2. **Crear preguntas de quiz** (8 quizzes):
   - Cada quiz debe tener mínimo 5-10 preguntas
   - Usa preguntas de opción múltiple (4 opciones)
   - Marca claramente cuál es la correcta
   - Evita preguntas muy obvias o muy difíciles

3. **Crear usuarios chatters reales**:
   - Usa emails corporativos reales
   - Asigna nombres reales (no "Test User")
   - Envía las credenciales por email seguro

---

## 🚀 URLs Finales

Una vez todo esté desplegado:

- **Frontend (Chatters)**: https://www.bravegirlsagency.com/lms/
- **Admin Panel**: https://www.bravegirlsagency.com/lms/admin.html
- **API Base**: https://bravegirlsagency-api.vercel.app/api/lms/

---

## 📝 Notas Importantes

1. **No modifica el sitio existente**: Todo el LMS está aislado en `/lms/`, no afecta el resto de `www.bravegirlsagency.com`

2. **Mismo patrón que supervision**: Si supervision funciona, este LMS funcionará igual (mismo setup FTP + Vercel)

3. **Cookies cross-domain**: Las cookies se comparten entre `www.bravegirlsagency.com` (frontend) y `bravegirlsagency-api.vercel.app` (backend) gracias a la configuración CORS

4. **Seguridad**:
   - Todas las contraseñas usan bcrypt con salt factor 10
   - Las sesiones expiran a las 24 horas
   - Los quizzes se validan server-side (no se pueden hackear desde el cliente)
   - El gating secuencial se valida con la función `lms_can_access_module()` en PostgreSQL

5. **Escalabilidad**:
   - Neon.tech Free Tier soporta hasta 10GB de datos
   - Vercel Free Tier soporta 100GB de bandwidth/mes
   - Para más usuarios, considera upgrade a planes pagos

---

## 🆘 Soporte

Si tienes problemas:

1. **Revisa logs de Vercel**: Dashboard → Deployments → (última) → Runtime Logs
2. **Revisa logs del navegador**: F12 → Console (busca errores CORS o fetch)
3. **Verifica base de datos**: Ejecuta queries de verificación en Neon SQL Editor
4. **Consulta README.md**: Tiene toda la documentación técnica de las APIs

---

**¡Listo para desplegar! 🎉**
