# ✅ Testing Plan - BraveGirls LMS v2.8

## 🎯 CORRECCIONES COMPLETADAS

### ✅ 1. Funciones Duplicadas Eliminadas
- ❌ `loadModules()` duplicada → ✅ Solo 1 versión (mejorada)
- ❌ `loadLessons()` duplicada → ✅ Solo 1 versión (mejorada)

### ✅ 2. Badges CSS Corregidos
- ❌ `badge-🎥 Video` → ✅ `badge-info`
- ❌ `badge-📄 Texto` → ✅ `badge-secondary`

### ✅ 3. Manejo de Errores Mejorado
- Todas las funciones load ahora verifican `response.ok`
- Captura y muestra mensajes de error específicos
- Fallback a mensajes genéricos

### ✅ 4. Cache Busting v2.8
- Todos los HTML actualizados a `?v=2.8`

---

## 🧪 PLAN DE TESTING

### FASE 1: Login y Autenticación

#### Test 1.1: Login Exitoso (Chatter)
```
URL: /lms/login.html
Credenciales: usuario chatter existente
Esperado: 
  ✓ Redirección a /lms/campus.html
  ✓ Nombre de usuario visible en header
  ✓ No puede acceder a /lms/admin.html
```

#### Test 1.2: Login Exitoso (Admin)
```
URL: /lms/login.html
Credenciales: usuario admin
Esperado:
  ✓ Redirección a /lms/admin.html
  ✓ Nombre y rol visible en header
  ✓ Todas las pestañas accesibles
```

#### Test 1.3: Login Fallido
```
URL: /lms/login.html
Credenciales: incorrectas
Esperado:
  ✓ Alert de error visible
  ✓ Permanece en login
  ✓ Campos no se limpian
```

#### Test 1.4: Sesión Expirada
```
URL: /lms/campus.html (sin login)
Esperado:
  ✓ Redirección automática a /lms/login.html
```

---

### FASE 2: Campus (Vista de Estudiante)

#### Test 2.1: Visualización de Estadísticas
```
URL: /lms/campus.html (como chatter)
Verificar:
  ✓ 4 tarjetas de stats muestran números correctos
  ✓ Barra de progreso general refleja % correcto
  ✓ Datos coinciden con backend
```

#### Test 2.2: Lista de Módulos
```
Verificar cada módulo:
  ✓ Título y descripción visible
  ✓ Badge de estado (Completado/En Progreso/Bloqueado)
  ✓ Barra de progreso individual
  ✓ Score de quiz si está aprobado
  ✓ Número de intentos si ha tomado quiz
```

#### Test 2.3: Módulos Bloqueados
```
Hacer clic en módulo bloqueado:
  ✓ NO debe navegar
  ✓ Cursor NO debe ser pointer
  ✓ Badge indica "Bloqueado"
```

#### Test 2.4: Navegación a Módulo
```
Hacer clic en módulo desbloqueado:
  ✓ Navega a /lms/module.html?id=X
  ✓ X es el ID correcto del módulo
```

---

### FASE 3: Módulo (Vista de Lección)

#### Test 3.1: Carga de Módulo Válido
```
URL: /lms/module.html?id=1
Verificar:
  ✓ Breadcrumb: Campus › Etapa › Módulo
  ✓ Sidebar muestra todas las lecciones
  ✓ Quiz aparece al final (si existe)
  ✓ Primera lección se muestra por defecto
```

#### Test 3.2: Validación de ID Inválido
```
URLs a probar:
  - /lms/module.html?id=null
  - /lms/module.html?id=undefined
  - /lms/module.html?id=999999
  - /lms/module.html (sin id)

Esperado:
  ✓ Alert: "ID de módulo inválido"
  ✓ Redirección a /lms/campus.html tras 2 segundos
```

#### Test 3.3: Lección con Video
```
Seleccionar lección tipo video:
  ✓ iframe de Loom visible y funcional
  ✓ Video se puede reproducir
  ✓ Texto adicional debajo (si existe)
```

#### Test 3.4: Lección con Solo Texto
```
Seleccionar lección tipo texto:
  ✓ Contenido formateado visible
  ✓ Saltos de línea preservados
  ✓ No muestra iframe
```

#### Test 3.5: Completar Lección
```
1. Hacer clic en "Marcar como completo"
Verificar:
  ✓ Alert: "¡Lección completada!"
  ✓ Botón cambia a "✓ Completado" (disabled)
  ✓ Sidebar muestra checkmark en lección
  ✓ Barra de progreso se actualiza INMEDIATAMENTE
  ✓ Número de lecciones completadas aumenta

2. Recargar página
Verificar:
  ✓ Lección sigue marcada como completada
  ✓ Progreso persiste
```

#### Test 3.6: Navegación entre Lecciones
```
Botón "Siguiente":
  ✓ Avanza a siguiente lección
  ✓ Si es última, texto cambia a "Ir a la Evaluación →"
  ✓ Si lección no completada, muestra warning

Botón "Anterior":
  ✓ Retrocede a lección anterior
  ✓ Disabled si es primera lección
```

#### Test 3.7: Validación de Orden Secuencial
```
Intentar abrir lección bloqueada en sidebar:
  ✓ NO debe cambiar contenido principal
  ✓ Cursor NO pointer en item bloqueado
```

#### Test 3.8: Acceso a Quiz
```
Escenario A: Todas las lecciones completadas
  ✓ Botón "Comenzar Examen Ahora" visible
  ✓ Click navega a /lms/quiz.html?moduleId=X

Escenario B: Lecciones incompletas
  ✓ Mensaje: "Sin intentos disponibles" o cooldown
  ✓ Botón disabled o no visible
```

---

### FASE 4: Quiz (Evaluación)

#### Test 4.1: Carga de Quiz Válido
```
URL: /lms/quiz.html?moduleId=1
Verificar:
  ✓ Breadcrumb: Campus › Módulo › Evaluación
  ✓ Todas las preguntas se muestran
  ✓ Opciones son seleccionables (radio buttons)
  ✓ Botón "Enviar Evaluación" al final
```

#### Test 4.2: Validación de ID Inválido
```
URLs a probar:
  - /lms/quiz.html?moduleId=null
  - /lms/quiz.html?moduleId=undefined
  - /lms/quiz.html (sin moduleId)

Esperado:
  ✓ Alert: "ID de módulo inválido"
  ✓ Redirección a /lms/campus.html tras 2 segundos
```

#### Test 4.3: Interacción con Opciones
```
Para cada pregunta:
  ✓ Solo una opción seleccionable
  ✓ Hover muestra efecto visual
  ✓ Opción activa muestra borde verde
  ✓ Cambiar selección funciona correctamente
```

#### Test 4.4: Envío Parcial
```
1. Responder solo algunas preguntas
2. Hacer clic en "Enviar Evaluación"
Verificar:
  ✓ Confirm dialog: "No has respondido todas las preguntas..."
  ✓ Si cancela: permanece en quiz
  ✓ Si acepta: envía respuestas parciales
```

#### Test 4.5: Envío Completo - Aprobado
```
1. Responder todas las preguntas correctamente
2. Enviar
Verificar:
  ✓ Pantalla de resultados muestra "¡Felicidades!"
  ✓ Score mostrado (ej: 100%)
  ✓ Badge verde "Aprobado"
  ✓ Botón "Continuar al Siguiente Módulo"
  ✓ No muestra respuestas detalladas
```

#### Test 4.6: Envío Completo - Reprobado
```
1. Responder incorrectamente (< 70%)
2. Enviar
Verificar:
  ✓ Pantalla muestra "No alcanzaste el puntaje mínimo"
  ✓ Score mostrado (ej: 50%)
  ✓ Badge rojo "Reprobado"
  ✓ Muestra intentos restantes
  ✓ Botón "Intentar de Nuevo" (si hay intentos)
  ✓ Sección "Respuestas Detalladas" visible:
    - Cada pregunta con ✅ o ❌
    - Tu respuesta vs. respuesta correcta
    - Borde verde para correctas, rojo para incorrectas
```

#### Test 4.7: Función goBack()
```
Hacer clic en "Volver al Módulo":
  ✓ Redirección a /lms/module.html?id=X
  ✓ X es el moduleId correcto
  ✓ No error si moduleId es válido
```

#### Test 4.8: Cooldown entre Intentos
```
Después de reprobar:
  ✓ Si hay cooldown activo, muestra minutos restantes
  ✓ Botón "Intentar de Nuevo" disabled
  ✓ Mensaje informativo visible
```

---

### FASE 5: Panel Admin

#### Test 5.1: Acceso Restringido
```
Login como chatter:
  ✓ No puede acceder a /lms/admin.html
  ✓ Redirección automática a /lms/campus.html
```

#### Test 5.2: Pestaña Usuarios
```
Verificar tabla:
  ✓ Columna "Último Login" muestra texto correcto (no �)
  ✓ Badges de rol con colores correctos
  ✓ Badges de estado (Activo/Inactivo)
  ✓ Botones "Reset Password" y "Activar/Desactivar"
```

#### Test 5.3: Búsqueda en Usuarios
```
1. Escribir en input de búsqueda
Verificar:
  ✓ Filtrado en tiempo real
  ✓ Busca en nombre, email y rol
  ✓ Filas no coincidentes se ocultan
```

#### Test 5.4: Pestaña Módulos
```
Verificar tabla:
  ✓ Columnas: Orden, Etapa, Título, Estado, Contenido, Acciones
  ✓ Badge de estado (Publicado/Borrador)
  ✓ Contador de lecciones y quiz
  ✓ Botones "Editar" y "Eliminar" presentes
  ✓ NO HAY funciones duplicadas en consola
```

#### Test 5.5: Editar Módulo
```
1. Hacer clic en "Editar" en un módulo
Verificar:
  ✓ Modal se abre correctamente
  ✓ Campos pre-llenados con datos actuales
  ✓ Puede modificar y guardar
  ✓ Tabla se actualiza tras guardar
```

#### Test 5.6: Pestaña Lecciones
```
Verificar tabla:
  ✓ Badges de tipo: "🎥 Video" con clase badge-info
  ✓ Badges de tipo: "📄 Texto" con clase badge-secondary
  ✓ NO hay clases CSS con emoji (ej: badge-🎥)
  ✓ Filtro por módulo funciona
  ✓ Botones Editar/Eliminar presentes
```

#### Test 5.7: Búsqueda en Lecciones
```
1. Seleccionar un módulo en filtro
2. Escribir en input de búsqueda
Verificar:
  ✓ Filtrado funciona en tiempo real
  ✓ Busca en título y módulo
```

#### Test 5.8: Editar Lección
```
1. Hacer clic en "Editar" en una lección
Verificar:
  ✓ Modal se abre correctamente
  ✓ Campos pre-llenados
  ✓ Toggle entre Video/Texto funciona
  ✓ Guardar actualiza tabla
```

#### Test 5.9: Pestaña Preguntas
```
1. Seleccionar módulo con preguntas
Verificar:
  ✓ Tabla muestra todas las preguntas
  ✓ Opciones listadas con respuesta correcta en verde
  ✓ Botón "Preview Quiz" visible
  ✓ Botón "Eliminar" funciona
```

#### Test 5.10: Preview de Quiz
```
1. Hacer clic en "Preview Quiz"
Verificar:
  ✓ Modal se abre con todas las preguntas
  ✓ Opciones correctas marcadas en verde
  ✓ Indicador "✓ CORRECTA" visible
  ✓ Contador total de preguntas
  ✓ Puede cerrar modal (botón, clic fuera, ESC)
```

#### Test 5.11: Pestaña Progreso
```
Verificar:
  ✓ 4 tarjetas de estadísticas con datos reales:
    - Total Usuarios
    - Módulos Completados
    - Progreso Promedio (%)
    - Quizzes Realizados
  ✓ Tabla de progreso por usuario
  ✓ Barras de progreso visual
  ✓ Contador X / Y de módulos
```

#### Test 5.12: Funciones NO Duplicadas
```
Abrir consola del navegador:
  ✓ NO debe haber warnings de funciones redefinidas
  ✓ loadModules solo se define 1 vez
  ✓ loadLessons solo se define 1 vez
```

---

## 🐛 ERRORES CONOCIDOS A VERIFICAR

### ❓ Posibles Issues Pendientes

1. **Drag & Drop en Lecciones**
   - Verificar si SortableJS se carga correctamente
   - Probar reordenar lecciones arrastrando

2. **Validación Secuencial Estricta**
   - Verificar que NO se puedan saltar módulos
   - Verificar que NO se puedan saltar lecciones

3. **Cooldown de Quiz**
   - Verificar que el tiempo de espera funcione correctamente
   - Verificar que el contador disminuya

---

## 📋 CHECKLIST DE TESTING

### Pre-Testing
- [ ] Desplegar cambios a producción
- [ ] Limpiar cache del navegador (Ctrl+Shift+R)
- [ ] Verificar que CSS v2.8 se carga
- [ ] Abrir consola de DevTools para monitorear errores

### Testing Básico (Flujo Estudiante)
- [ ] Login exitoso
- [ ] Campus carga correctamente
- [ ] Módulo abre y muestra lecciones
- [ ] Completar una lección actualiza progreso
- [ ] Quiz se puede tomar y enviar
- [ ] Resultados se muestran correctamente

### Testing Avanzado (Flujo Admin)
- [ ] Panel admin accesible solo para admins
- [ ] Todas las tablas cargan datos
- [ ] Búsqueda funciona en tiempo real
- [ ] Editar abre modales con datos correctos
- [ ] Eliminar funciona con confirmación
- [ ] Preview de quiz muestra todas las preguntas

### Testing de Validación
- [ ] URLs con IDs inválidos redirigen correctamente
- [ ] Módulos bloqueados no son accesibles
- [ ] Quiz valida respuestas completas
- [ ] Progreso se actualiza en tiempo real

### Testing de Errores
- [ ] No hay errores en consola
- [ ] No hay funciones duplicadas
- [ ] Badges CSS tienen clases válidas
- [ ] Encoding UTF-8 correcto en todas las tablas

---

## 📊 CRITERIOS DE ACEPTACIÓN

### ✅ PASA si:
- Todos los flujos principales funcionan sin errores
- Validación de datos previene acciones inválidas
- UI es consistente y profesional
- Progreso se actualiza correctamente
- Admin puede gestionar contenido sin problemas

### ❌ FALLA si:
- Errores en consola del navegador
- Funciones duplicadas generan warnings
- Badges CSS rotos o invisibles
- Progreso no se actualiza en tiempo real
- URLs inválidas causan páginas rotas

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DEL TESTING

1. **Si todo pasa**: 
   - ✅ Marcar v2.8 como estable
   - ✅ Actualizar documentación
   - ✅ Notificar a usuarios

2. **Si hay fallos menores**:
   - 🔧 Corregir issues encontrados
   - 🔄 Re-testing
   - 📝 Documentar cambios

3. **Si hay fallos críticos**:
   - 🚨 Rollback a v2.7
   - 🐛 Debug exhaustivo
   - 🔍 Revisión de código

---

**Versión a Testear**: v2.8  
**Fecha**: 2026-01-08  
**Prioridad**: 🔴 ALTA  
**Tiempo Estimado**: 45-60 minutos  
**Responsable**: Usuario/QA Team
