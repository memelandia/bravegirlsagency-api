# BraveGirls Agency - LMS (Learning Management System)

Sistema de gestión de aprendizaje interno para capacitación de chatters.

## 📋 Características

- **Autenticación segura** con cookies httpOnly y bcrypt
- **Roles de usuario**: Admin, Supervisor, Chatter
- **Estructura de curso**: 8 Etapas → 8 Módulos → Lecciones (Video/Texto) → Quiz
- **Gating secuencial**: Los módulos se desbloquean al completar el anterior
- **Evaluaciones**: Multiple choice con validación server-side
- **Control de intentos**: Máximo 3 intentos con cooldown de 60 minutos
- **Dashboard Admin**: Gestión completa de usuarios, contenido y progreso
- **UI ligera y rápida**: CSS vanilla, sin frameworks pesados

## 🗂️ Estructura del Proyecto

```
/lms/
  ├── schema.sql              # Esquema de base de datos
  ├── seed.sql                # Datos iniciales (8 módulos con contenido)
  ├── lms-styles.css          # Estilos CSS mínimos
  ├── login.html              # Página de login
  ├── campus.html             # Campus del chatter
  ├── module.html             # Vista de módulo con lecciones
  ├── quiz.html               # Evaluación multiple choice
  ├── admin.html              # Dashboard administrativo
  ├── package.json            # Dependencias NPM
  └── README.md               # Este archivo

/api/lms/
  ├── lib/
  │   ├── db.js               # Conexión a PostgreSQL
  │   ├── auth.js             # Autenticación y autorización
  │   └── utils.js            # Utilidades generales
  ├── auth/
  │   ├── login.js            # POST /api/lms/auth/login
  │   ├── logout.js           # POST /api/lms/auth/logout
  │   └── me.js               # GET /api/lms/auth/me
  ├── campus.js               # GET /api/lms/campus
  ├── module/
  │   └── [id].js             # GET /api/lms/module/:id
  ├── lesson/
  │   └── complete.js         # POST /api/lms/lesson/complete
  ├── quiz/
  │   ├── [moduleId].js       # GET /api/lms/quiz/:moduleId
  │   └── [moduleId]/
  │       └── submit.js       # POST /api/lms/quiz/:moduleId/submit
  └── admin/
      ├── users.js            # CRUD usuarios
      ├── modules.js          # CRUD módulos
      ├── lessons.js          # CRUD lecciones
      ├── questions.js        # CRUD preguntas
      └── progress.js         # GET progreso de usuarios
```

## 🚀 Instalación

### 1. Configurar Base de Datos (PostgreSQL)

Necesitas una instancia de PostgreSQL. Recomendado: [Neon](https://neon.tech) (gratis).

```bash
# Ejecutar schema
psql -U usuario -d nombre_db -f lms/schema.sql

# Ejecutar seed (datos iniciales)
psql -U usuario -d nombre_db -f lms/seed.sql
```

### 2. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/database
# O para Neon:
POSTGRES_URL=postgresql://usuario:password@host.neon.tech/database?sslmode=require

# Entorno
NODE_ENV=production
```

### 3. Instalar Dependencias

```bash
cd lms
npm install
```

### 4. Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Hacer login
vercel login

# Deploy
vercel --prod
```

**Importante**: Configurar las variables de entorno en Vercel Dashboard:
- `DATABASE_URL` o `POSTGRES_URL`
- `NODE_ENV=production`

## 👤 Usuario Admin por Defecto

Después de ejecutar el seed:

- **Email**: admin@bravegirlsagency.com
- **Password**: Admin2026!

⚠️ **CAMBIAR ESTA CONTRASEÑA INMEDIATAMENTE DESPUÉS DEL PRIMER LOGIN**

## 📚 Contenido del Curso (Seed)

El LMS incluye 8 módulos pre-configurados:

1. **Módulo 0**: Cultura y Reglas (obligatorio)
2. **Módulo 1**: Modelo de negocio + Catálogo + Precios
3. **Módulo 2**: OnlyFans Operativo
4. **Módulo 3**: OnlyMonster (Data + Automatización)
5. **Módulo 4**: SOP Diario
6. **Módulo 5**: Scripts (uso correcto)
7. **Módulo 6**: Ballenas y High Ticket
8. **Módulo 7**: Incentivos de la Agencia

Cada módulo incluye:
- 1-3 lecciones (video Loom o texto)
- 1 quiz (configurado pero sin preguntas - admin debe agregarlas)

## 🔧 Configuración de Quizzes

Los quizzes están creados pero **sin preguntas**. El admin debe:

1. Login como admin
2. Ir a Dashboard → Preguntas
3. Seleccionar módulo
4. Agregar preguntas multiple choice

**Parámetros por defecto:**
- Passing Score: 80%
- Max Attempts: 3
- Cooldown: 60 minutos

## 🛠️ API Endpoints

### Autenticación
- `POST /api/lms/auth/login` - Login
- `POST /api/lms/auth/logout` - Logout
- `GET /api/lms/auth/me` - Usuario actual

### Campus (Chatter)
- `GET /api/lms/campus` - Lista de módulos con progreso
- `GET /api/lms/module/:id` - Detalles de módulo
- `POST /api/lms/lesson/complete` - Marcar lección completada

### Quiz
- `GET /api/lms/quiz/:moduleId` - Obtener preguntas del quiz
- `POST /api/lms/quiz/:moduleId/submit` - Enviar respuestas

### Admin (Solo Admin/Supervisor)
- `GET/POST/PUT/DELETE /api/lms/admin/users` - Gestión de usuarios
- `GET/POST/PUT/DELETE /api/lms/admin/modules` - Gestión de módulos
- `GET/POST/PUT/DELETE /api/lms/admin/lessons` - Gestión de lecciones
- `GET/POST/PUT/DELETE /api/lms/admin/questions` - Gestión de preguntas
- `GET /api/lms/admin/progress` - Progreso de usuarios

## 🔐 Seguridad

- Passwords hasheados con bcrypt (cost factor 10)
- Sesiones con cookies httpOnly y secure (en producción)
- Rate limiting en login (5 intentos cada 15 min)
- Validación de roles server-side en todos los endpoints
- Gating de módulos validado en backend
- Control de intentos y cooldown de quizzes

## 🎨 UI/UX

- **Desktop-only** (no responsive móvil)
- CSS vanilla ligero (~3KB)
- Sin animaciones pesadas
- Sin frameworks (React, Vue, etc.)
- Carga rápida y minimalista

## 📊 Base de Datos

### Tablas principales:
- `lms_users` - Usuarios del sistema
- `lms_stages` - Etapas del curso
- `lms_modules` - Módulos secuenciales
- `lms_lessons` - Lecciones (video/texto)
- `lms_quizzes` - Configuración de evaluaciones
- `lms_questions` - Preguntas multiple choice
- `lms_progress_lessons` - Lecciones completadas por usuario
- `lms_quiz_attempts` - Intentos de evaluación

### Vista auxiliar:
- `lms_user_module_progress` - Progreso agregado por usuario y módulo

### Función auxiliar:
- `lms_can_access_module(user_id, module_id)` - Validación de acceso

## 🆘 Troubleshooting

### Error de conexión a DB
```bash
# Verificar variables de entorno
echo $DATABASE_URL

# Probar conexión directa
psql $DATABASE_URL
```

### Usuario no puede acceder a módulo
- Verificar que completó todas las lecciones del módulo anterior
- Verificar que aprobó el quiz del módulo anterior
- Revisar orden de módulos en DB

### Quiz no aparece
- Verificar que el quiz tiene preguntas cargadas
- Revisar consola del navegador para errores

### Reset de contraseña
```sql
-- Manual reset via psql
UPDATE lms_users 
SET password_hash = crypt('NuevaPassword123', gen_salt('bf', 10))
WHERE email = 'usuario@email.com';
```

## 📝 Tareas Post-Deployment

- [ ] Cambiar contraseña del admin
- [ ] Crear usuarios chatters
- [ ] Reemplazar URLs placeholder de Loom con videos reales
- [ ] Agregar preguntas a todos los quizzes
- [ ] Revisar y mejorar contenido de texto de lecciones
- [ ] Configurar backup automático de DB
- [ ] Configurar monitoreo de errores (Sentry, etc.)

## 🔄 Mantenimiento

### Agregar nuevo módulo
1. Admin Dashboard → Módulos → Crear
2. Agregar lecciones al módulo
3. Configurar quiz y agregar preguntas
4. Publicar módulo

### Editar contenido existente
1. Admin Dashboard → Lecciones
2. Filtrar por módulo
3. Editar texto o cambiar URL de Loom

### Ver progreso de chatters
1. Admin Dashboard → Progreso
2. Ver tabla con % de completitud
3. Identificar chatters "stuck" o inactivos

## 📧 Soporte

Para cualquier problema técnico o pregunta:
- Revisar logs en Vercel Dashboard
- Consultar tabla `lms_quiz_attempts` para ver intentos fallidos
- Revisar `lms_progress_lessons` para debug de progreso

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2026  
**Desarrollado para**: BraveGirls Agency
