-- Migración: Actualizar constraint de roles en crm_staff
-- Ejecutar esto en tu base de datos de Neon/Supabase

-- 1. Eliminar el constraint antiguo
ALTER TABLE crm_staff DROP CONSTRAINT IF EXISTS crm_staff_rol_check;

-- 2. Agregar el nuevo constraint con los roles actualizados
ALTER TABLE crm_staff ADD CONSTRAINT crm_staff_rol_check 
CHECK (rol IN ('EDITOR_REELS', 'PROGRAMADOR_PPV', 'AM_UPLOAD', 'CD', 'VA_EDITOR'));

-- 3. Actualizar registros existentes con VA_EDITOR a EDITOR_REELS (opcional)
-- UPDATE crm_staff SET rol = 'EDITOR_REELS' WHERE rol = 'VA_EDITOR';

-- Verificar la actualización
SELECT rol, COUNT(*) as cantidad 
FROM crm_staff 
GROUP BY rol 
ORDER BY rol;
