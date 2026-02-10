-- ============================================================================
-- VERIFICAR QUÉ SEMANAS EXISTEN EN LA BASE DE DATOS
-- ============================================================================

-- 1. Ver cuántos registros hay por semana
SELECT 
    semana,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN updated_at IS NOT NULL THEN 1 END) as con_datos,
    COUNT(CASE WHEN updated_at IS NULL THEN 1 END) as vacios
FROM supervision_semanal
GROUP BY semana
ORDER BY 
    CASE semana
        WHEN 'Semana 1' THEN 1
        WHEN 'Semana 2' THEN 2
        WHEN 'Semana 3' THEN 3
        WHEN 'Semana 4' THEN 4
        WHEN 'Semana 5' THEN 5
        ELSE 99
    END;

-- 2. Ver muestra de registros de cada semana
SELECT semana, chatter, cuenta, facturacion, updated_at
FROM supervision_semanal
WHERE semana IN ('Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5')
ORDER BY 
    CASE semana
        WHEN 'Semana 1' THEN 1
        WHEN 'Semana 2' THEN 2
        WHEN 'Semana 3' THEN 3
        WHEN 'Semana 4' THEN 4
        WHEN 'Semana 5' THEN 5
    END,
    chatter, cuenta
LIMIT 100;

-- 3. Ver todos los valores ÚNICOS de "semana" que existen
SELECT DISTINCT semana, COUNT(*) as cantidad
FROM supervision_semanal
GROUP BY semana
ORDER BY semana;

-- ============================================================================
-- INTERPRETACIÓN:
-- 
-- Si SOLO ves "Semana 1", "Semana 2", "Semana 3":
--   ❌ Las semanas 4 y 5 no están en la base de datos
--   Causa posible: Se perdieron al hacer el primer DELETE ALL
--
-- Si ves las 5 semanas con conteos bajos (0-5 registros):
--   ❌ Faltan la mayoría de los registros de esas semanas
--
-- Si ves las 5 semanas con 17 registros cada una (85 total):
--   ✅ Todas las semanas existen correctamente
--   El problema es otro (filtros en frontend, etc.)
-- ============================================================================
