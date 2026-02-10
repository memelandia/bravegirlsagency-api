-- ============================================================================
-- VERIFICAR SI LOS DATOS SE ESTÁN GUARDANDO EN LA BASE DE DATOS
-- ============================================================================

-- 1. Ver las últimas actualizaciones de supervision_semanal
SELECT 
    chatter,
    cuenta,
    semana,
    facturacion,
    nuevos_fans,
    updated_at
FROM supervision_semanal
ORDER BY updated_at DESC
LIMIT 20;

-- 2. Ver cuántos registros se actualizaron HOY
SELECT 
    DATE(updated_at) as fecha,
    COUNT(*) as registros_actualizados
FROM supervision_semanal
WHERE updated_at >= CURRENT_DATE
GROUP BY DATE(updated_at);

-- 3. Ver las últimas actualizaciones de vip_repaso
SELECT 
    key,
    status,
    updated_at
FROM vip_repaso
ORDER BY updated_at DESC
LIMIT 20;

-- 4. Ver cuántos registros de VIP se actualizaron HOY
SELECT 
    DATE(updated_at) as fecha,
    COUNT(*) as registros_actualizados
FROM vip_repaso
WHERE updated_at >= CURRENT_DATE
GROUP BY DATE(updated_at);

-- ============================================================================
-- INTERPRETACIÓN:
-- 
-- Si NO ves registros con fecha de HOY en supervision_semanal:
--   ❌ Los datos NO se están guardando en la base de datos
--   ✅ Solo se guardan en localStorage del navegador
--
-- Si VES registros con fecha de HOY:
--   ✅ Los datos SÍ se están guardando correctamente
-- ============================================================================
