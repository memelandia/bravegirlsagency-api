-- ═══════════════════════════════════════════════════════════════
-- SEED de datos reales — Modelos, Cuentas, Chatters activos
-- BraveGirls Agency · datos inferidos de la hoja maestra + facturas individuales
--
-- IMPORTANTE:
--   - Correr DESPUÉS de schema-admin.sql (necesita las tablas + seeds base)
--   - Ejecutar UNA STATEMENT A LA VEZ en Neon si te tira "read-only"
--   - Donde no tenía info exacta (ej. dirección, CUIT de algunos chatters),
--     dejé NULL para que después lo completes desde el dashboard
--   - Los % y montos están según lo que me confirmaste en chat
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- MODELOS
-- ═══════════════════════════════════════════════════════════
-- Plan IDs: 1=Inicial 40%, 2=Avanzado 50%, 3=Premium 60%
-- Numeración factura: si tenés ya un histórico, fijate el último número
-- emitido y poné ese como factura_numero_actual (la próxima será +1).

INSERT INTO modelos (
  nombre, nombre_fiscal, identificador, direccion, email, fecha_inicio,
  plan_id, porcentaje, moneda_default, medio_pago_default,
  factura_numero_actual, gasto_om_modelo_default, gasto_om_agencia_default,
  servicios_factura_texto, activa
) VALUES
  -- CARMEN — Plan Inicial 40%, factura en EUR vía Skrill/Binance, factura siguiente: #595
  ('CARMEN', 'Carmen', NULL, NULL, NULL, '2025-02-01',
   1, 40, 'EUR', 'Skrill/Binance',
   594, 20, 20,
   'Manejo de Chatting OF, Posteos, Publicaciones', TRUE),

  -- VICKY — Plan Avanzado 50%, factura a Malena Victoria, próxima #7
  ('VICKY', 'Malena Victoria Bouhebent', 'z1939032e',
   'Carrer de santa madrona 156 BAIXES, Badalona, Barcelona 08911', NULL, NULL,
   2, 50, 'USD', 'Transf',
   6, 50, 50,
   'Manejo de Chatting OF, Posteos, Publicaciones. Venta de Contenido a traves de la Plataforma. Manejo de Redes Sociales', TRUE),

  -- KATIEROSE — Plan Inicial 40%, factura a Malena Victoria también, próxima #8
  ('KATIEROSE', 'Malena Victoria Bouhebent', 'z1939032e',
   'Carrer de santa madrona 156 BAIXES, Badalona, Barcelona 08911', NULL, NULL,
   1, 40, 'USD', 'Transf',
   7, 20, 20,
   'Manejo de Chatting OF, Posteos, Publicaciones', TRUE),

  -- LILY MONTERO — Plan Avanzado 50%, factura a Catalina Balbuena (Lily Española + Americana)
  ('LILY MONTERO', 'Catalina Balbuena', NULL, 'Argentina', NULL, NULL,
   2, 50, 'USD', 'Transf',
   1, 35, 35,
   'Manejo de Chatting OF, Posteos, Publicaciones. Venta de Contenido a traves de la Plataforma. Manejo de Redes Sociales', TRUE),

  -- LILY JANE — Plan Avanzado 50% (asumido)
  ('LILY JANE', 'Catalina Balbuena', NULL, 'Argentina', NULL, NULL,
   2, 50, 'USD', 'Transf',
   0, 15, 15,
   'Manejo de Chatting OF, Posteos, Publicaciones. Venta de Contenido a traves de la Plataforma. Manejo de Redes Sociales', TRUE),

  -- LEXI — Plan Avanzado 50% (Gestion + T + Reels)
  ('LEXI', NULL, NULL, NULL, NULL, NULL,
   2, 50, 'USD', 'Transf',
   0, 15, 15,
   'Manejo de Chatting OF, Posteos, Publicaciones. Venta de Contenido a traves de la Plataforma. Manejo de Redes Sociales', TRUE),

  -- CAMILA MAZZARONI — Plan Avanzado 50%, próxima #9
  ('CAMILA MAZZARONI', 'Mazzaroni Camila Belén', '27-44209467-0',
   'América 3028, Villa Luzuriaga, 1754 — Buenos Aires, Argentina', NULL, NULL,
   2, 50, 'USD', 'Transf',
   8, 15, 15,
   'Manejo de Chatting OF, Posteos, Publicaciones. Venta de Contenido a traves de la Plataforma. Manejo de Redes Sociales', TRUE),

  -- SARAH — datos a completar
  ('SARAH', NULL, NULL, NULL, NULL, NULL,
   1, 40, 'USD', 'Transf',
   0, 15, 15,
   'Manejo de Chatting OF, Posteos, Publicaciones', TRUE),

  -- LUCY — datos a completar
  ('LUCY', NULL, NULL, NULL, NULL, NULL,
   1, 40, 'USD', 'Transf',
   0, 15, 15,
   'Manejo de Chatting OF, Posteos, Publicaciones', TRUE),

  -- SWEETBALLERINA — datos a completar
  ('SWEETBALLERINA', NULL, NULL, NULL, NULL, NULL,
   1, 40, 'USD', 'Transf',
   0, 15, 15,
   'Manejo de Chatting OF, Posteos, Publicaciones', TRUE)

ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- CUENTAS (cada modelo puede tener varias)
-- ═══════════════════════════════════════════════════════════
-- Uso subqueries para no depender de IDs concretos.

INSERT INTO cuentas (modelo_id, nombre_cuenta, tipo, of_username, activa) VALUES
  ((SELECT id FROM modelos WHERE nombre='CARMEN' LIMIT 1),       'CARMEN PAID',         'PAID',  'carmencitax', TRUE),
  ((SELECT id FROM modelos WHERE nombre='CARMEN' LIMIT 1),       'CARMEN BIZUM',        'BIZUM',  NULL,         TRUE),
  ((SELECT id FROM modelos WHERE nombre='VICKY' LIMIT 1),        'VICKY PAID',          'PAID',  'xvickyluna', TRUE),
  ((SELECT id FROM modelos WHERE nombre='VICKY' LIMIT 1),        'VICKY BIZUM',         'BIZUM',  NULL,         TRUE),
  ((SELECT id FROM modelos WHERE nombre='VICKY' LIMIT 1),        'VICKY AMERICANA',     'AMERICANA', NULL,      TRUE),
  ((SELECT id FROM modelos WHERE nombre='KATIEROSE' LIMIT 1),    'KATIEROSE FREE',      'FREE',  'xxkatierose', TRUE),
  ((SELECT id FROM modelos WHERE nombre='LILY MONTERO' LIMIT 1), 'LILY ESPAÑA',         'ESPAÑA',  'lilymontero', TRUE),
  ((SELECT id FROM modelos WHERE nombre='LILY MONTERO' LIMIT 1), 'LILY AMERICANA',      'AMERICANA', NULL,        TRUE),
  ((SELECT id FROM modelos WHERE nombre='LILY JANE' LIMIT 1),    'LILY JANE',           'FREE',  'lilyjane_x', TRUE),
  ((SELECT id FROM modelos WHERE nombre='LEXI' LIMIT 1),         'LEXI PAID',           'PAID',  'lexyymlg',   TRUE),
  ((SELECT id FROM modelos WHERE nombre='LEXI' LIMIT 1),         'LEXI ENG',            'ENG',   NULL,         TRUE),
  ((SELECT id FROM modelos WHERE nombre='CAMILA MAZZARONI' LIMIT 1), 'CAMILA PAID',     'PAID',  NULL,         TRUE),
  ((SELECT id FROM modelos WHERE nombre='SARAH' LIMIT 1),        'SARAH FREE',          'FREE',  'sarahmacaron', TRUE),
  ((SELECT id FROM modelos WHERE nombre='LUCY' LIMIT 1),         'LUCY FREE',           'FREE',  'lucygarcia', TRUE),
  ((SELECT id FROM modelos WHERE nombre='SWEETBALLERINA' LIMIT 1), 'SWEETBALLERINA',    'FREE',  'sweetballerina', TRUE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- CHATTERS
-- ═══════════════════════════════════════════════════════════
-- Default %: comisión 15, supervisor 5
-- Excepción: Nico = comisión 20, supervisor 3 (confirmado por owner)
-- Team leader: KARI tiene bonus +$100 mensual

INSERT INTO chatters_admin (
  nombre, nombre_fiscal, identificador, direccion, email, fecha_inicio,
  porcentaje_default, porcentaje_supervisor, rol, es_team_leader, activo
) VALUES
  ('Alfonso',  'Alfonso Silva',         NULL, NULL, NULL, NULL, 15, 5, 'chatter',     FALSE, TRUE),
  ('Kari',     'Kari Narvaez',          NULL, NULL, NULL, NULL, 15, 5, 'team_leader', TRUE,  TRUE),
  ('Leo',      'Leo',                   NULL, NULL, NULL, NULL, 15, 5, 'chatter',     FALSE, TRUE),
  ('Nico',     'Nicolas Viganotti',     NULL, NULL, NULL, NULL, 20, 3, 'chatter',     FALSE, TRUE),
  ('Yaye',     'Yaye Sanchez',          NULL, NULL, NULL, NULL, 15, 5, 'chatter',     FALSE, TRUE),
  ('Camila',   'Camila',                NULL, NULL, NULL, NULL, 15, 5, 'chatter',     FALSE, TRUE),
  ('Genesys',  'Genesys',               NULL, NULL, NULL, NULL, 15, 5, 'chatter',     FALSE, TRUE),
  ('Carlo',    'Carlo',                 NULL, NULL, NULL, NULL, 15, 5, 'chatter',     FALSE, TRUE),
  ('Jony',     'Jonatan Benitez',       NULL, NULL, NULL, NULL,  0, 0, 'supervisor',  FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════
-- Al final podés correr esto para chequear que cargó bien:
--
-- SELECT count(*) AS modelos      FROM modelos      WHERE activa = TRUE;   -- esperado: 10
-- SELECT count(*) AS cuentas      FROM cuentas      WHERE activa = TRUE;   -- esperado: 15
-- SELECT count(*) AS chatters     FROM chatters_admin WHERE activo = TRUE; -- esperado: 9
-- SELECT count(*) AS planes       FROM planes_servicio;                    -- esperado: 3
-- SELECT count(*) AS equipo_fijo  FROM equipo_fijo;                        -- esperado: 2
--
-- SELECT m.nombre, m.porcentaje, p.nombre AS plan, m.moneda_default
-- FROM modelos m LEFT JOIN planes_servicio p ON p.id = m.plan_id
-- WHERE m.activa = TRUE ORDER BY m.nombre;
