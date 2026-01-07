# Consolidación de Endpoints - LMS API

## Problema Resuelto
Vercel Hobby plan limita a **12 funciones serverless máximo**. El proyecto inicial tenía **16 funciones**, causando error en deployment:
```
"No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan"
```

## Solución Aplicada
Consolidación de 15 endpoints en 3 archivos mediante **routing interno**.

### Antes (15 funciones LMS)
```
api/lms/
├── admin/
│   ├── users.js          (1 función)
│   ├── modules.js        (1 función)
│   ├── lessons.js        (1 función)
│   ├── questions.js      (1 función)
│   ├── progress.js       (1 función)
│   ├── stages.js         (1 función)
│   └── quizzes.js        (1 función)
├── auth/
│   ├── login.js          (1 función)
│   ├── logout.js         (1 función)
│   └── me.js             (1 función)
├── campus.js             (1 función)
├── module/[id].js        (1 función)
├── lesson/complete.js    (1 función)
├── quiz/[moduleId].js    (1 función)
└── quiz/[moduleId]/submit.js (1 función)

TOTAL: 15 funciones LMS
```

### Después (3 funciones LMS)
```
api/lms/
├── admin.js      → maneja 7 recursos (users, modules, lessons, questions, progress, stages, quizzes)
├── auth.js       → maneja 3 acciones (login, logout, me)
└── chatter.js    → maneja 5 rutas (campus, module/:id, lesson/complete, quiz/:id, quiz/:id/submit)

TOTAL: 3 funciones LMS
```

## Conteo Final de Funciones

### LMS: 3 funciones
1. `/api/lms/admin` - Consolidado de 7 endpoints
2. `/api/lms/auth` - Consolidado de 3 endpoints
3. `/api/lms/chatter` - Consolidado de 5 endpoints

### Supervision: 6 funciones
4. `/api/supervision/checklist`
5. `/api/supervision/errores`
6. `/api/supervision/migrate`
7. `/api/supervision/semanal`
8. `/api/supervision/vip-fans`
9. `/api/supervision/vip-repaso`

### Otros: 2 funciones
10. `/api/crm`
11. `/api/health`

**TOTAL: 11 funciones** ✅ (bajo el límite de 12)

## Cómo Funciona el Routing Interno

### Ejemplo: `/api/lms/admin.js`
```javascript
// vercel.json configura rewrites:
{ "source": "/api/lms/admin/users", "destination": "/api/lms/admin" }
{ "source": "/api/lms/admin/modules", "destination": "/api/lms/admin" }
// ... etc

// admin.js extrae el recurso del path:
const resource = req.url.split('/').pop(); // "users", "modules", etc.

switch(resource) {
  case 'users':
    return await handleUsers(req, res, user);
  case 'modules':
    return await handleModules(req, res, user);
  // ...
}
```

### Ventajas de este Approach
1. ✅ Cumple con límite de Vercel Hobby plan (gratis)
2. ✅ URLs externas NO cambian (frontend no requiere cambios)
3. ✅ Lógica de negocio intacta (código copiado, no reescrito)
4. ✅ Fácil mantener (cada handler es una función independiente)

## Commits Realizados

```bash
# 1. Consolidar admin endpoints
git commit -m "Consolidate admin endpoints - Reduce from 7 to 1 function for Vercel Hobby plan"
git commit -m "Remove individual admin endpoint files - now consolidated in admin.js"

# 2. Consolidar auth endpoints
git commit -m "Consolidate auth endpoints - Reduce 3 functions to 1"
git commit -m "Force add auth.js (was in gitignore)"
git commit -m "Remove individual auth files"

# 3. Consolidar chatter endpoints
git commit -m "Consolidate chatter endpoints - Reduce 5 functions to 1"
git commit -m "Remove individual chatter endpoint files"
```

## Archivos Modificados

### Nuevos archivos creados
- `api/lms/admin.js` (1010 líneas)
- `api/lms/auth.js` (155 líneas)
- `api/lms/chatter.js` (682 líneas)

### Archivos eliminados
- `api/lms/admin/*.js` (7 archivos)
- `api/lms/auth/*.js` (3 archivos)
- `api/lms/campus.js`
- `api/lms/module/[id].js`
- `api/lms/lesson/complete.js`
- `api/lms/quiz/[moduleId].js`
- `api/lms/quiz/[moduleId]/submit.js`

### Archivo actualizado
- `vercel.json` - agregados rewrites para routing

## Próximos Pasos

1. ✅ **Consolidación completada**
2. ⏳ **Esperar deployment de Vercel** (auto-deploy activado)
3. ⏳ **Ejecutar seed.sql** en Neon para poblar base de datos
4. ⏳ **Subir frontend** a Hostinger via FTP
5. ⏳ **Probar sistema completo** (login → campus → módulo → quiz)

## Alternativa Descartada

**Opción 2: Upgrade Vercel a Pro Plan ($20/mes)**
- Permite funciones ilimitadas
- No requiere consolidación
- Costo mensual recurrente

**Elegimos Opción 1 (consolidación)** porque:
- ✅ Gratis (mantiene plan Hobby)
- ✅ Ejercicio técnico valioso
- ✅ Código más organizado y mantenible
- ✅ Preparado para escalar sin costos adicionales

---

**Fecha de consolidación:** 2026-01-07  
**Commits:** 799974f, e27134b, c8a583a, ad43642, 56a64d3, 463b04a, 159a846  
**Reducción:** 15 funciones → 3 funciones (80% de reducción)
