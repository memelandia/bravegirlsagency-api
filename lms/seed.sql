-- ===================================================================
-- LMS SEED DATA
-- Datos iniciales para el curso de BraveGirls Agency
-- ===================================================================

-- Crear usuario admin por defecto (password: Admin2026!)
-- IMPORTANTE: Cambiar esta contraseña después del primer login
INSERT INTO lms_users (name, email, password_hash, role, active) VALUES
('Admin', 'admin@bravegirlsagency.com', crypt('Admin2026!', gen_salt('bf', 10)), 'admin', true);

-- ===================================================================
-- ETAPAS DEL CURSO
-- ===================================================================
INSERT INTO lms_stages (id, name, description, order_index) VALUES
('11111111-1111-1111-1111-111111111111', 'ETAPA 1 — Onboarding y Control', 'Introducción a la cultura y reglas de la agencia', 0),
('22222222-2222-2222-2222-222222222222', 'ETAPA 2 — Negocio y Producto', 'Comprensión del modelo de negocio y catálogo', 1),
('33333333-3333-3333-3333-333333333333', 'ETAPA 3 — Operación OnlyFans', 'Manejo operativo de la plataforma OnlyFans', 2),
('44444444-4444-4444-4444-444444444444', 'ETAPA 4 — OnlyMonster', 'Uso de herramientas de data y automatización', 3),
('55555555-5555-5555-5555-555555555555', 'ETAPA 5 — SOP Diario', 'Procedimientos operativos estándar diarios', 4),
('66666666-6666-6666-6666-666666666666', 'ETAPA 6 — Copy y Ejecución Comercial', 'Scripts y técnicas de comunicación con fans', 5),
('77777777-7777-7777-7777-777777777777', 'ETAPA 7 — Monetización Avanzada', 'Estrategias para maximizar ingresos con fans VIP', 6),
('88888888-8888-8888-8888-888888888888', 'ETAPA 8 — Incentivos', 'Sistema de incentivos y bonificaciones de la agencia', 7);

-- ===================================================================
-- MÓDULOS (uno por etapa)
-- ===================================================================
INSERT INTO lms_modules (id, stage_id, title, description, order_index, published) VALUES
(
  'a0000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'MÓDULO 0 — Cultura y Reglas',
  'Módulo obligatorio de introducción. Conoce la cultura de trabajo, valores y reglas fundamentales de BraveGirls Agency.',
  0,
  true
),
(
  'a1111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'MÓDULO 1 — Modelo de Negocio + Catálogo + Precios',
  'Comprende cómo funciona el negocio, qué productos vendemos y la tabla de precios oficial.',
  1,
  true
),
(
  'a2222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'MÓDULO 2 — OnlyFans Operativo',
  'Aprende a operar la plataforma OnlyFans sin teoría: acciones prácticas del día a día.',
  2,
  true
),
(
  'a3333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  'MÓDULO 3 — OnlyMonster: Data + Automatización + Insight',
  'Domina OnlyMonster para analizar datos, automatizar tareas y obtener insights de los fans.',
  3,
  true
),
(
  'a4444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  'MÓDULO 4 — Tareas Diarias Obligatorias (SOP)',
  'Checklist operativo diario que todo chatter debe cumplir sin excepción.',
  4,
  true
),
(
  'a5555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  'MÓDULO 5 — Scripts: Uso Correcto',
  'Aprende a usar los scripts de venta correctamente y cuándo personalizar.',
  5,
  true
),
(
  'a6666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  'MÓDULO 6 — Ballenas, Listas y High Ticket',
  'Estrategias avanzadas: customs caros, videollamadas (VC), venta de panties y manejo de fans VIP.',
  6,
  true
),
(
  'a7777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  'MÓDULO 7 — Incentivos de la Agencia',
  'Conoce el sistema de bonos, incentivos y recompensas para chatters de alto desempeño.',
  7,
  true
);

-- ===================================================================
-- LECCIONES INICIALES (placeholders - el admin debe completar)
-- ===================================================================

-- MÓDULO 0: Cultura y Reglas
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a0000000-0000-0000-0000-000000000000', 'Bienvenida y Cultura de BraveGirls', 'video', 0, 'https://www.loom.com/embed/placeholder-video-1');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a0000000-0000-0000-0000-000000000000', 'Reglas y Políticas Internas', 'text', 1, 
'# Reglas y Políticas Internas

## Horarios y Disponibilidad
- Cumplir con los horarios asignados
- Avisar con anticipación en caso de ausencias
- Mantener disponibilidad durante el turno

## Confidencialidad
- Toda información de fans y modelos es CONFIDENCIAL
- No compartir datos de acceso con terceros
- No tomar capturas ni copiar información sin autorización

## Rendimiento y KPIs
- Cumplir con los objetivos de ventas mensuales
- Mantener una buena relación con los fans
- Reportar cualquier problema o situación irregular

## Consecuencias por Incumplimiento
- Primera falta: advertencia verbal
- Segunda falta: advertencia por escrito
- Tercera falta: suspensión o terminación del contrato

**Al completar este módulo, aceptas haber leído y comprendido estas reglas.**');

-- MÓDULO 1: Modelo de Negocio
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a1111111-1111-1111-1111-111111111111', 'Cómo funciona el negocio de OnlyFans', 'text', 0,
'# Modelo de Negocio OnlyFans

## ¿Qué hacemos?
BraveGirls Agency gestiona cuentas de creadoras de contenido en OnlyFans. Nuestro trabajo es:
- Chatear con los fans (suplantando a la modelo)
- Vender contenido personalizado y productos digitales
- Maximizar los ingresos por cuenta
- Mantener a los fans enganchados y gastando

## Estructura de Ingresos
1. **Suscripciones**: ingreso base mensual/anual
2. **Tips**: propinas por mensajes o contenido
3. **PPV (Pay Per View)**: contenido bloqueado que el fan debe pagar
4. **Customs**: contenido personalizado hecho a medida

## Tu rol como Chatter
- Eres el intermediario entre la modelo y sus fans
- Tu objetivo es VENDER más contenido
- Debes mantener la ilusión y el engagement
- Tu comisión depende de tus ventas

Esta es una industria de ventas digitales: **más vendes, más ganas.**');

INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a1111111-1111-1111-1111-111111111111', 'Catálogo de Productos y Precios', 'video', 1, 'https://www.loom.com/embed/placeholder-video-2');

-- MÓDULO 2: OnlyFans Operativo
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a2222222-2222-2222-2222-222222222222', 'Tour por la interfaz de OnlyFans', 'video', 0, 'https://www.loom.com/embed/placeholder-video-3');

INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a2222222-2222-2222-2222-222222222222', 'Cómo enviar mensajes y PPV', 'video', 1, 'https://www.loom.com/embed/placeholder-video-4');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a2222222-2222-2222-2222-222222222222', 'Checklist Operativo OnlyFans', 'text', 2,
'# Checklist Operativo OnlyFans

## Al inicio del turno
- [ ] Revisar notificaciones pendientes
- [ ] Leer mensajes nuevos
- [ ] Identificar oportunidades de venta

## Durante el turno
- [ ] Responder todos los mensajes en menos de 30 min
- [ ] Enviar al menos 2 PPV masivos
- [ ] Hacer seguimiento a fans inactivos
- [ ] Registrar ventas en el sistema

## Al finalizar el turno
- [ ] Dejar notas para el siguiente turno
- [ ] Reportar ventas del día
- [ ] Escalar cualquier problema o fan difícil');

-- MÓDULO 3: OnlyMonster
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a3333333-3333-3333-3333-333333333333', 'Introducción a OnlyMonster', 'video', 0, 'https://www.loom.com/embed/placeholder-video-5');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a3333333-3333-3333-3333-333333333333', 'Uso básico de OnlyMonster', 'text', 1,
'# OnlyMonster: Guía Operativa

## ¿Qué es OnlyMonster?
Herramienta de automatización y análisis para OnlyFans que te permite:
- Ver estadísticas de fans (gasto, última conexión, engagement)
- Automatizar mensajes masivos
- Segmentar fans por comportamiento
- Programar envíos

## Funciones clave
1. **Dashboard de Fans**: lista completa con métricas
2. **Mass Messaging**: envío de PPV a segmentos específicos
3. **Automation Rules**: respuestas automáticas
4. **Analytics**: reportes de ventas y engagement

## Mejores prácticas
- Revisar métricas diariamente
- Segmentar antes de enviar PPV masivo
- No abusar de la automatización (puede parecer spam)');

-- MÓDULO 4: SOP Diario
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a4444444-4444-4444-4444-444444444444', 'SOP Diario Explicado', 'video', 0, 'https://www.loom.com/embed/placeholder-video-6');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a4444444-4444-4444-4444-444444444444', 'Checklist SOP Obligatorio', 'text', 1,
'# SOP Diario Obligatorio

## Tareas OBLIGATORIAS cada día

### 1. Morning Routine (primeros 30 min)
- Revisar métricas del día anterior
- Leer notificaciones y mensajes urgentes
- Planificar PPVs del día

### 2. Engagement Continuo
- Responder todos los mensajes en <30 min
- Hacer follow-up a fans inactivos (última conexión >7 días)
- Agradecer tips y compras

### 3. Mass Messaging
- Enviar al menos 2 PPV masivos al día
- Horarios recomendados: 10am-12pm y 7pm-10pm
- Segmentar por tipo de fan (whales, mid-spenders, low-spenders)

### 4. Reportes
- Actualizar ventas en el sistema cada 2 horas
- Reportar cualquier issue o escalación
- Dejar notas para el siguiente turno

**El incumplimiento del SOP es motivo de advertencia.**');

-- MÓDULO 5: Scripts
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a5555555-5555-5555-5555-555555555555', 'Cómo usar scripts correctamente', 'video', 0, 'https://www.loom.com/embed/placeholder-video-7');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a5555555-5555-5555-5555-555555555555', 'Ejemplos de Scripts y Personalización', 'text', 1,
'# Scripts de Venta

## Tipos de Scripts

### 1. Mensaje de Bienvenida (nuevo suscriptor)
```
Hey baby! 💕 Thanks so much for subscribing! I''m so happy you''re here. 
What kind of content do you like? I want to make sure you get exactly what you want 😘
```

### 2. PPV Teaser (venta de contenido)
```
I just recorded something VERY spicy for you 🔥
It''s 15 min of pure fun... want to see? 😈
*[locked video] - $20*
```

### 3. Custom Request (contenido personalizado)
```
I LOVE making customs baby! Tell me exactly what you want to see and I''ll make it happen 💋
Pricing:
- Photos (10 pics): $50
- Video (5-10min): $100
- Video (10-20min): $180
```

### 4. Re-engagement (fan inactivo)
```
Hey stranger! I miss you 😢
I have some new content I think you''ll LOVE... want a sneak peek? 👀
```

## Cuándo Personalizar
- Fan VIP/Whale: SIEMPRE personalizar
- Conversación larga: adaptar el tono
- Fan repetitivo: ajustar estrategia

## Cuándo NO cambiar scripts
- Mensajes masivos (PPV)
- Bienvenida estándar
- Pricing oficial (nunca ofrecer descuentos sin aprobación)');

-- MÓDULO 6: Ballenas y High Ticket
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a6666666-6666-6666-6666-666666666666', 'Identificación y manejo de Whales', 'video', 0, 'https://www.loom.com/embed/placeholder-video-8');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a6666666-6666-6666-6666-666666666666', 'Playbook de Monetización Avanzada', 'text', 1,
'# Monetización Avanzada: Whales y High Ticket

## ¿Qué es una Whale (Ballena)?
Fan que gasta +$500/mes. Representan el 80% de los ingresos.

## Cómo identificar Whales
- Gasto histórico alto
- Compra customs frecuentemente
- Responde rápido y siempre está online
- Pide atención exclusiva

## Estrategias para Whales

### 1. Atención Personalizada
- Responder SIEMPRE rápido
- Usar su nombre
- Recordar sus preferencias

### 2. Productos High Ticket
- **Customs premium**: $200-$500 (videos largos, fetiches específicos)
- **Videollamadas (VC)**: $100-$300 por 10-20 min
- **Panties usados**: $150-$300 (incluye envío)
- **GFE (Girlfriend Experience)**: $500-$1000/semana (atención 24/7)

### 3. Listas VIP
- Crear lista exclusiva de Whales
- Enviar contenido premium antes que al resto
- Ofrecer descuentos "exclusivos" (aprobados por supervisor)

### 4. Retention
- Nunca dejar a una Whale en visto
- Enviar mensajes proactivos ("thinking of you")
- Celebrar hitos (cumpleaños, aniversario de suscripción)

**Una Whale bien atendida puede generar $2000-$5000/mes.**');

-- MÓDULO 7: Incentivos
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('a7777777-7777-7777-7777-777777777777', 'Sistema de Incentivos y Bonos', 'text', 0,
'# Sistema de Incentivos BraveGirls

## Estructura de Comisiones

### Base
- 10% de las ventas que generes

### Bonos por Desempeño
- **Ventas >$5000/mes**: +2% (total 12%)
- **Ventas >$10000/mes**: +3% (total 13%)
- **Ventas >$15000/mes**: +5% (total 15%)

## Bonos Especiales
- **Top Chatter del Mes**: $300 extra
- **Mejor Whale Hunter**: $200 extra (quien cierre más customs >$200)
- **Perfect Attendance**: $100 extra (0 faltas en el mes)

## Penalizaciones
- Falta sin aviso: -$50
- Incumplimiento de SOP: advertencia escrita
- 3 advertencias = suspensión

## Pagos
- Quincenales (día 15 y último día del mes)
- Vía transferencia bancaria
- Reportes de ventas disponibles 24/7 en el sistema

**Tu esfuerzo se refleja directamente en tu salario. ¡Entre más vendas, más ganas!**');

INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('a7777777-7777-7777-7777-777777777777', 'Cómo maximizar tus incentivos', 'video', 1, 'https://www.loom.com/embed/placeholder-video-9');

-- ===================================================================
-- QUIZZES (configuración inicial sin preguntas)
-- ===================================================================
INSERT INTO lms_quizzes (module_id, passing_score, max_attempts, cooldown_minutes) VALUES
('a0000000-0000-0000-0000-000000000000', 80, 3, 60),
('a1111111-1111-1111-1111-111111111111', 80, 3, 60),
('a2222222-2222-2222-2222-222222222222', 80, 3, 60),
('a3333333-3333-3333-3333-333333333333', 80, 3, 60),
('a4444444-4444-4444-4444-444444444444', 80, 3, 60),
('a5555555-5555-5555-5555-555555555555', 80, 3, 60),
('a6666666-6666-6666-6666-666666666666', 80, 3, 60),
('a7777777-7777-7777-7777-777777777777', 80, 3, 60);

-- ===================================================================
-- NOTAS
-- ===================================================================
-- Los quizzes están creados pero SIN PREGUNTAS.
-- El admin debe agregar las preguntas desde el dashboard.
-- Las URLs de Loom son placeholders que deben ser reemplazadas.
-- El contenido de texto puede ser editado/mejorado desde el admin panel.
