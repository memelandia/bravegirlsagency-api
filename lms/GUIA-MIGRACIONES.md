# 📋 GUÍA DE MIGRACIONES - LMS BraveGirls

**Fecha**: 12 de Enero, 2026  
**Base de datos**: Vercel Postgres

---

## 🎯 RESUMEN EJECUTIVO

| Migración | Estado | Prioridad | Descripción |
|-----------|--------|-----------|-------------|
| migrate-indexes.sql | ✅ Listo | **ALTA** | Índices de performance (15+) |
| migrate-unique-order.sql | ✅ Listo | **ALTA** | UNIQUE constraints para order_index |
| migrate-time-tracking.sql | ⚠️ Verificar | MEDIA | Columnas de tracking de tiempo |
| migrate-course-completions.sql | ⚠️ Verificar | BAJA | Tabla de graduaciones |
| migrate-onboarding.sql | ❓ No revisado | BAJA | Columnas de onboarding |
| migrate-deadlines.sql | ❓ No revisado | BAJA | Sistema de deadlines |

---

## 📝 ORDEN DE EJECUCIÓN RECOMENDADO

### 1️⃣ **VERIFICAR COLUMNAS EXISTENTES** (PRIMERO)

Antes de ejecutar migraciones, verifica qué ya está en producción:

```sql
-- Conectarse a Vercel Postgres y ejecutar:

-- 1. Verificar columnas de time tracking
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lms_progress_lessons' 
  AND column_name IN ('time_spent_seconds', 'started_at', 'last_activity_at');

-- Resultado esperado:
-- Si devuelve 3 filas → Ya está aplicado ✅
-- Si devuelve 0 filas → Necesitas ejecutar migrate-time-tracking.sql

-- 2. Verificar columnas de lecciones
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lms_lessons' 
  AND column_name IN ('estimated_duration_seconds', 'min_time_required_seconds');

-- Resultado esperado:
-- Si devuelve 2 filas → Ya está aplicado ✅
-- Si devuelve 0 filas → Necesitas ejecutar migrate-time-tracking.sql

-- 3. Verificar tabla course_completions
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'lms_course_completions'
);

-- Resultado esperado:
-- true → Ya está aplicado ✅
-- false → Necesitas ejecutar migrate-course-completions.sql

-- 4. Verificar UNIQUE constraints
SELECT conname 
FROM pg_constraint 
WHERE conname LIKE 'unique_%_order_%';

-- Resultado esperado:
-- Si devuelve 3 filas → Ya está aplicado ✅
-- Si devuelve 0 filas → Necesitas ejecutar migrate-unique-order.sql
```

---

### 2️⃣ **VERIFICAR DUPLICADOS** (ANTES DE UNIQUE CONSTRAINTS)

**IMPORTANTE**: Ejecutar ANTES de aplicar migrate-unique-order.sql

```sql
-- Verificar duplicados en lms_modules
SELECT stage_id, order_index, COUNT(*) as count, 
       STRING_AGG(id::text, ', ') as ids
FROM lms_modules
GROUP BY stage_id, order_index
HAVING COUNT(*) > 1;

-- Verificar duplicados en lms_lessons
SELECT module_id, order_index, COUNT(*) as count,
       STRING_AGG(id::text, ', ') as ids
FROM lms_lessons
GROUP BY module_id, order_index
HAVING COUNT(*) > 1;

-- Verificar duplicados en lms_questions
SELECT quiz_id, order_index, COUNT(*) as count,
       STRING_AGG(id::text, ', ') as ids
FROM lms_questions
GROUP BY quiz_id, order_index
HAVING COUNT(*) > 1;
```

**Si hay duplicados**, corregir manualmente:
```sql
-- Ejemplo: Reordenar lecciones duplicadas
UPDATE lms_lessons SET order_index = 0 WHERE id = 'uuid-1';
UPDATE lms_lessons SET order_index = 1 WHERE id = 'uuid-2';
UPDATE lms_lessons SET order_index = 2 WHERE id = 'uuid-3';
```

---

### 3️⃣ **EJECUTAR MIGRACIONES EN ORDEN**

#### **Paso 1: Índices de Performance** (⚡ Mejora velocidad)

```bash
# Archivo: migrate-indexes.sql
# Tiempo estimado: 30-60 segundos
# Reversible: Sí (cada índice se puede eliminar individualmente)
```

**Ejecutar**:
```sql
\i migrate-indexes.sql
```

**Verificar**:
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename LIKE 'lms_%' 
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Deberías ver ~15 índices nuevos
```

**Rollback** (si es necesario):
```sql
DROP INDEX IF EXISTS idx_quiz_attempts_user_created;
DROP INDEX IF EXISTS idx_quiz_attempts_quiz_passed;
-- ... (ver archivo para lista completa)
```

---

#### **Paso 2: UNIQUE Constraints** (🔒 Previene duplicados)

```bash
# Archivo: migrate-unique-order.sql
# Tiempo estimado: 10-30 segundos
# Reversible: Sí
# REQUISITO: No debe haber duplicados (verificar en Paso 2️⃣)
```

**Ejecutar**:
```sql
\i migrate-unique-order.sql
```

**Verificar**:
```sql
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname LIKE 'unique_%_order_%'
ORDER BY conrelid::regclass;

-- Resultado esperado:
-- unique_module_order_per_stage  | lms_modules   | UNIQUE (stage_id, order_index)
-- unique_lesson_order_per_module | lms_lessons   | UNIQUE (module_id, order_index)
-- unique_question_order_per_quiz | lms_questions | UNIQUE (quiz_id, order_index)
```

**Rollback** (si es necesario):
```sql
ALTER TABLE lms_modules DROP CONSTRAINT IF EXISTS unique_module_order_per_stage;
ALTER TABLE lms_lessons DROP CONSTRAINT IF EXISTS unique_lesson_order_per_module;
ALTER TABLE lms_questions DROP CONSTRAINT IF EXISTS unique_question_order_per_quiz;
```

---

#### **Paso 3: Time Tracking** (⏱️ Opcional - Mejora UX)

```bash
# Archivo: migrate-time-tracking.sql
# Tiempo estimado: 20-40 segundos
# Reversible: Sí (pero se perderían datos si ya se usó)
# NOTA: El sistema ya es tolerante si estas columnas no existen
```

**¿Ejecutar?**:
- ✅ **SÍ** si quieres prevenir que chatters completen lecciones sin estudiarlas
- ⚠️ **NO** si prefieres mantener el sistema simple (actual)

**Ejecutar**:
```sql
\i migrate-time-tracking.sql
```

**Verificar**:
```sql
-- Verificar columnas en lms_progress_lessons
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lms_progress_lessons' 
  AND column_name IN ('time_spent_seconds', 'started_at', 'last_activity_at');

-- Verificar columnas en lms_lessons
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lms_lessons' 
  AND column_name IN ('estimated_duration_seconds', 'min_time_required_seconds');
```

**Rollback** (si es necesario):
```sql
ALTER TABLE lms_progress_lessons 
  DROP COLUMN IF EXISTS time_spent_seconds,
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS last_activity_at;

ALTER TABLE lms_lessons 
  DROP COLUMN IF EXISTS estimated_duration_seconds,
  DROP COLUMN IF EXISTS min_time_required_seconds;
```

---

#### **Paso 4: Course Completions** (🎓 Opcional - Graduaciones)

```bash
# Archivo: migrate-course-completions.sql
# Tiempo estimado: 10-20 segundos
# Reversible: Sí
# NOTA: Tabla para certificados y contrataciones
```

**¿Ejecutar?**:
- ✅ **SÍ** si quieres tracking de graduaciones y certificados
- ⚠️ **NO** si no usarás esta funcionalidad aún

**Ejecutar**:
```sql
\i migrate-course-completions.sql
```

**Verificar**:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'lms_course_completions'
);

-- Resultado esperado: true
```

**Rollback** (si es necesario):
```sql
DROP TABLE IF EXISTS lms_course_completions CASCADE;
```

---

## 🚦 DECISIÓN RÁPIDA

### **EJECUTAR OBLIGATORIO** (Prioridad ALTA):

1. ✅ **migrate-indexes.sql** - Mejora performance significativamente
2. ✅ **migrate-unique-order.sql** - Previene bugs en drag & drop

### **EJECUTAR OPCIONAL** (Prioridad MEDIA/BAJA):

3. ⚠️ **migrate-time-tracking.sql** - Solo si quieres validar tiempo mínimo de estudio
4. ⚠️ **migrate-course-completions.sql** - Solo si vas a usar certificados/contrataciones

---

## 📊 COMANDO COMPLETO (Todo en uno)

**Si quieres ejecutar todas las migraciones críticas de una vez**:

```sql
-- 1. Verificar que no hay duplicados PRIMERO
SELECT 'DUPLICADOS EN MODULES' as check, stage_id, order_index, COUNT(*) 
FROM lms_modules 
GROUP BY stage_id, order_index 
HAVING COUNT(*) > 1;

SELECT 'DUPLICADOS EN LESSONS' as check, module_id, order_index, COUNT(*) 
FROM lms_lessons 
GROUP BY module_id, order_index 
HAVING COUNT(*) > 1;

SELECT 'DUPLICADOS EN QUESTIONS' as check, quiz_id, order_index, COUNT(*) 
FROM lms_questions 
GROUP BY quiz_id, order_index 
HAVING COUNT(*) > 1;

-- Si no hay duplicados (0 rows), continuar:

-- 2. Ejecutar índices
\i migrate-indexes.sql

-- 3. Ejecutar UNIQUE constraints
\i migrate-unique-order.sql

-- Verificar éxito:
\echo '✅ Migraciones completadas'
```

---

## ⚠️ TROUBLESHOOTING

### Error: "duplicate key value violates unique constraint"

**Causa**: Hay duplicados en order_index  
**Solución**: Ver Paso 2️⃣ y corregir duplicados manualmente

### Error: "column already exists"

**Causa**: Migración ya fue aplicada anteriormente  
**Solución**: Verificar columnas existentes (Paso 1️⃣) y saltar esa migración

### Error: "permission denied"

**Causa**: Usuario sin permisos de ALTER TABLE  
**Solución**: Usar usuario admin de Vercel Postgres

---

## 📞 CONTACTO

Si tienes dudas durante la ejecución:
1. Verificar logs de Vercel Postgres
2. Ejecutar queries de verificación del Paso 1️⃣
3. Consultar rollback commands si algo sale mal

**Última actualización**: 12 de Enero, 2026  
**Versión LMS**: v2.19.0
