# 📋 CRM VISUAL - QUICK REFERENCE

## 📁 ESTRUCTURA COMPLETA DEL PROYECTO

```
bravegirlsagencyweb/
│
├── /crm/                          ⭐ NUEVO - Frontend CRM
│   ├── index.html                 - Página principal
│   ├── crm-auth.js                - Autenticación (wrapper)
│   ├── crm.css                    - Estilos aislados
│   ├── crm-app.jsx                - App React completa
│   └── DEPLOYMENT.md              - Instrucciones detalladas
│
├── /api/crm/                      ⭐ NUEVO - Backend CRM
│   ├── schema.sql                 - Base de datos completa
│   │
│   ├── models.js                  - CRUD Models (GET, POST)
│   ├── models/[id].js             - CRUD Models (GET, PUT, DELETE)
│   │
│   ├── chatters.js                - CRUD Chatters (GET, POST)
│   ├── chatters/[id].js           - CRUD Chatters (GET, PUT, DELETE)
│   │
│   ├── assignments.js             - CRUD Assignments (GET, POST)
│   ├── assignments/[id].js        - CRUD Assignments (GET, PUT, DELETE)
│   │
│   ├── social-accounts.js         - CRUD Social (GET, POST)
│   ├── social-accounts/[id].js    - CRUD Social (GET, PUT, DELETE)
│   │
│   ├── supervisors.js             - CRUD Supervisors (GET, POST)
│   ├── supervisors/[id].js        - CRUD Supervisors (GET, PUT, DELETE)
│   │
│   ├── staff.js                   - CRUD Staff (GET, POST)
│   └── staff/[id].js              - CRUD Staff (GET, PUT, DELETE)
│
├── /api/                          ✅ EXISTENTE - No modificado
│   ├── accounts/
│   ├── sheets/
│   └── supervision/
│
├── login.html                     ✅ EXISTENTE - No modificado
├── auth.js                        ✅ EXISTENTE - No modificado
├── config.js                      ✅ EXISTENTE - No modificado
├── dashboard-chatter.html         ✅ EXISTENTE - No modificado
├── dashboard-modelo.html          ✅ EXISTENTE - No modificado
└── ...                            ✅ EXISTENTE - No modificado
```

---

## 🔑 API ENDPOINTS

Base URL: `https://bravegirlsagency-api.vercel.app/api/crm`

### **Models**
- `GET    /crm/models` - Listar todos
- `POST   /crm/models` - Crear nuevo
- `GET    /crm/models/:id` - Ver uno
- `PUT    /crm/models/:id` - Actualizar
- `DELETE /crm/models/:id` - Eliminar

### **Chatters**
- `GET    /crm/chatters` - Listar todos
- `POST   /crm/chatters` - Crear nuevo
- `GET    /crm/chatters/:id` - Ver uno
- `PUT    /crm/chatters/:id` - Actualizar
- `DELETE /crm/chatters/:id` - Eliminar

### **Assignments**
- `GET    /crm/assignments` - Listar todos
- `POST   /crm/assignments` - Crear nuevo
- `GET    /crm/assignments/:id` - Ver uno
- `PUT    /crm/assignments/:id` - Actualizar
- `DELETE /crm/assignments/:id` - Eliminar

### **Social Accounts**
- `GET    /crm/social-accounts` - Listar todos
- `POST   /crm/social-accounts` - Crear nuevo
- `GET    /crm/social-accounts/:id` - Ver uno
- `PUT    /crm/social-accounts/:id` - Actualizar
- `DELETE /crm/social-accounts/:id` - Eliminar

### **Supervisors**
- `GET    /crm/supervisors` - Listar todos
- `POST   /crm/supervisors` - Crear nuevo
- `GET    /crm/supervisors/:id` - Ver uno
- `PUT    /crm/supervisors/:id` - Actualizar
- `DELETE /crm/supervisors/:id` - Eliminar

### **Staff**
- `GET    /crm/staff` - Listar todos
- `POST   /crm/staff` - Crear nuevo
- `GET    /crm/staff/:id` - Ver uno
- `PUT    /crm/staff/:id` - Actualizar
- `DELETE /crm/staff/:id` - Eliminar

---

## 📊 ENTIDADES Y CAMPOS

### **Model**
```json
{
  "id": 1,
  "handle": "carmencitax",
  "estimado_facturacion_mensual": 15000,
  "prioridad": 5,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### **Chatter**
```json
{
  "id": 1,
  "nombre": "Yaye Sanchez",
  "estado": "activo",
  "nivel": "senior",
  "pais": "México",
  "disponibilidad": {
    "L": ["09:00-17:00"],
    "M": ["09:00-17:00"]
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### **Assignment**
```json
{
  "id": 1,
  "chatter_id": 1,
  "model_id": 1,
  "horario": {
    "L": ["09:00-17:00"],
    "M": ["09:00-17:00"]
  },
  "estado": "activa",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### **SocialAccount**
```json
{
  "id": 1,
  "model_id": 1,
  "plataforma": "Instagram",
  "handle": "carmen_official",
  "idioma": "Español",
  "nicho": "Fitness",
  "verticales": ["lifestyle", "wellness"],
  "estado": "activa",
  "link_principal": "https://instagram.com/carmen_official",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### **Supervisor**
```json
{
  "id": 1,
  "nombre": "María Rodríguez",
  "scope": {
    "type": "todos"
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### **Staff**
```json
{
  "id": 1,
  "nombre": "Ana Martínez",
  "rol": "VA_EDITOR",
  "estado": "activo",
  "modelos_asignados": [1, 2],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

## 🎨 VISTAS DEL CRM

### 1️⃣ **Estructura** (`/crm` → tab "Estructura")
- Mapa interactivo con React Flow
- Visualización: Supervisores → Chatters → Modelos
- Drag & drop para reposicionar
- Zoom/Pan
- Click en nodo → Sidebar con detalles

### 2️⃣ **Modelo → Redes** (`/crm` → tab "Modelo → Redes")
- Grid de cards por modelo
- Lista de redes sociales asociadas
- Badge con estado de cada cuenta

### 3️⃣ **Marketing** (`/crm` → tab "Marketing")
- 3 columnas: VA/Editores, AM/Upload, Content Directors
- Lista de staff agrupado por rol

### 4️⃣ **Configuración** (`/crm` → tab "Configuración")
- Sub-tabs: Modelos, Chatters, Redes Sociales, Supervisores, Staff
- Tablas con CRUD completo
- Modales para crear/editar
- Botones de acción por fila

---

## 🔐 FLUJO DE AUTENTICACIÓN

```
Usuario → /crm
    ↓
¿Hay sessionStorage.currentUser?
    ↓ NO
    Redirigir → /login.html
    ↓ (login exitoso)
    sessionStorage.currentUser = {...}
    ↓
    Redirigir → /dashboard-* (según tipo)
    ↓
    Usuario navega manualmente → /crm
    ↓ SÍ
    Cargar window.CRM_USER
    ↓
    Mostrar CRM App
```

**IMPORTANTE**: El CRM NO modifica el flujo de login existente. Solo lee la sesión.

---

## 🚀 DEPLOYMENT EN 5 PASOS

```bash
# 1. Configurar base de datos (Vercel Postgres o Supabase)
psql [DATABASE_URL] < api/crm/schema.sql

# 2. Configurar variable de entorno en Vercel
# Vercel Dashboard → Settings → Environment Variables
# DATABASE_URL = [tu connection string]

# 3. Push código a Git
git add .
git commit -m "Add CRM module"
git push origin main

# 4. Vercel auto-deploy (o trigger manual)
# Los endpoints estarán en: https://[proyecto].vercel.app/api/crm/*

# 5. Acceder al CRM
# https://bravegirlsagency.com/crm
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de considerar completo el deployment:

- [ ] Base de datos creada y schema ejecutado
- [ ] `DATABASE_URL` configurado en Vercel
- [ ] Archivos de `/crm` subidos al servidor
- [ ] API endpoints accesibles (test con curl)
- [ ] Login existente funciona (sin cambios)
- [ ] Al acceder a `/crm` sin login → redirige a login
- [ ] Al acceder a `/crm` con login → muestra el CRM
- [ ] Datos de prueba visibles en las tablas
- [ ] Mapa interactivo carga correctamente
- [ ] Crear nuevo modelo funciona
- [ ] Editar modelo funciona
- [ ] Eliminar modelo funciona
- [ ] Logout desde CRM funciona

---

## 🐛 ERRORES COMUNES

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot connect to database` | `DATABASE_URL` no configurado | Agregar en Vercel Environment Variables |
| `404 en /crm` | Carpeta no subida | Verificar que `/crm` esté en el servidor |
| `CORS error` | Headers no configurados | Verificar `vercel.json` tiene reglas para `/api/*` |
| `Module 'pg' not found` | Dependencia faltante | `npm install pg` |
| Redirige a login constantemente | sessionStorage vacío | Verificar que login existente funcione primero |
| Estilos rotos | Paths incorrectos | Verificar que `/styles.css` exista en root |

---

## 📞 CONTACTO / SOPORTE

Para reportar problemas o solicitar cambios:

1. **Problema técnico**: Describe el error exacto y el paso donde ocurre
2. **Necesidad de modificar código existente**: Indica qué archivo necesitas cambiar y por qué
3. **Nueva funcionalidad**: Describe qué quieres agregar al CRM

**RECUERDA**: Este CRM fue diseñado para NO tocar ningún archivo existente. Si necesitas integrarlo más profundamente con el sitio actual, requerirá autorización explícita para modificar archivos existentes.

---

## 🎯 ROADMAP / MEJORAS FUTURAS

### Fase 1 (Actual) ✅
- [x] Estructura básica
- [x] Autenticación reutilizada
- [x] CRUD Modelos completo
- [x] Mapa interactivo básico
- [x] API endpoints completos

### Fase 2 (Próximo)
- [ ] Completar todos los CRUDs con modales
- [ ] Búsqueda/filtros en tablas
- [ ] Persistencia de posiciones en mapa
- [ ] Sidebar de edición rápida en mapa
- [ ] Validaciones avanzadas

### Fase 3 (Futuro)
- [ ] Dashboard de métricas
- [ ] Exportar/Importar datos
- [ ] Historial de cambios (audit log)
- [ ] Notificaciones en tiempo real
- [ ] Modo colaborativo

---

## 💡 TIPS PRO

- **Performance**: El mapa puede ser lento con muchos nodos. Considera virtualización o agrupamiento.
- **UX**: Agregar tooltips en los nodos del mapa con información rápida.
- **Mobile**: Considerar vista adaptativa para tablet/móvil (sidebar colapsable).
- **Seguridad**: Implementar rate limiting en los endpoints de API.
- **Backup**: Exportar datos regularmente (agregar endpoint `/crm/export`).

---

**Versión**: 1.0.0  
**Fecha**: 31 de diciembre de 2025  
**Última actualización**: Implementación inicial completa
