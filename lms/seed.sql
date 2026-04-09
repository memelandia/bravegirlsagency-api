-- ===================================================================
-- LMS SEED DATA — Curriculum v3 (Feb 2026)
-- Datos iniciales para el curso de BraveGirls Agency
-- 3 Etapas | 9 Módulos | 39 Lecciones | 9 Quizzes (sin preguntas)
-- ===================================================================

-- Crear usuario admin por defecto (password: Admin2026!)
-- IMPORTANTE: Cambiar esta contraseña después del primer login
INSERT INTO lms_users (name, email, password_hash, role, active) VALUES
('Admin', 'admin@bravegirlsagency.com', crypt('Admin2026!', gen_salt('bf', 10)), 'admin', true);

-- ===================================================================
-- ETAPAS DEL CURSO (3)
-- ===================================================================
INSERT INTO lms_stages (id, name, description, order_index) VALUES
('10000000-0000-0000-0000-000000000001', 'ETAPA 1 — Fundamentos BraveGirls', 'El chatter entiende dónde está, qué se espera, y conoce las reglas del juego. Día 1.', 0),
('20000000-0000-0000-0000-000000000002', 'ETAPA 2 — Las Herramientas', 'El chatter domina OnlyFans, OnlyMonster, y sabe clasificar fans. Día 2.', 1),
('30000000-0000-0000-0000-000000000003', 'ETAPA 3 — Ventas y Práctica', 'El chatter aprende a vender, fidelizar, manejar situaciones y conoce cómo se lo evalúa. Día 3.', 2);

-- ===================================================================
-- MÓDULOS (9) — order_index GLOBAL (0-8) para unlock secuencial
-- ===================================================================
INSERT INTO lms_modules (id, stage_id, title, description, order_index, published) VALUES
-- ETAPA 1
('b1100000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Módulo 1.1 — Cultura de Trabajo BraveGirls', 'Propósito de la agencia, lema, frase de compromiso personal, y los 5 valores principales de trabajo.', 0, true),
('b1200000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'Módulo 1.2 — Normativa y Operación Diaria', 'Reglas, código de conducta, tareas diarias obligatorias, precios, prioridades de venta, seguridad y reglas de oro del chat.', 1, true),
('b1300000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', 'Módulo 1.3 — Glosario del Chatter', 'Vocabulario esencial: PPV, Custom, Script, Bóveda, Tip, DM, Masivo, ARPPU, Conversion Rate y más.', 2, true),
-- ETAPA 2
('b2100000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000002', 'Módulo 2.1 — OnlyFans: Conociendo la Plataforma', 'Secciones de OnlyFans, chat, bóveda, estadísticas, mensajes masivos, pagos y restricciones.', 3, true),
('b2200000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'Módulo 2.2 — OnlyMonster: Tu Herramienta de Trabajo', 'Interfaz de OnlyMonster, chat, información del cliente, notas obligatorias y mensajes automáticos.', 4, true),
('b2300000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000002', 'Módulo 2.3 — Clasificación de Fans', 'Tipos de fans, cómo detectarlos, sistema de listas, clasificación paso a paso y psicología básica del fan.', 5, true),
-- ETAPA 3
('b3100000-0000-0000-0000-000000000031', '30000000-0000-0000-0000-000000000003', 'Módulo 3.1 — Técnicas de Venta', 'Cómo vender videollamadas, customs, scripts, upselling, tips, ventas especiales, fidelización e inicio de conversación.', 6, true),
('b3200000-0000-0000-0000-000000000032', '30000000-0000-0000-0000-000000000003', 'Módulo 3.2 — Situaciones Reales y Protocolo', 'Manejo de fans difíciles, errores comunes, protocolo de emergencia y flujo completo de una conversación de venta.', 7, true),
('b3300000-0000-0000-0000-000000000033', '30000000-0000-0000-0000-000000000003', 'Módulo 3.3 — Métricas y Evaluación', 'Qué se mide, cómo se evalúa, perfiles de modelo en Discord y estándares de calidad.', 8, true);

-- ===================================================================
-- LECCIONES — ETAPA 1 (8 lecciones, todas texto)
-- ===================================================================

-- Módulo 1.1 — Cultura de Trabajo BraveGirls (1 lección)
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1100000-0000-0000-0000-000000000011', '🏛️ Cultura BraveGirls', 'text', 0,
'# 🏛️ Cultura de Trabajo BraveGirls

## ¿Quiénes somos?
BraveGirls Agency es una agencia profesional de gestión de cuentas de creadoras de contenido.

## Nuestro lema
> **[COMPLETAR — Lema de la agencia]**

## Los 5 Valores de Trabajo
1. [COMPLETAR — Valor 1]
2. [COMPLETAR — Valor 2]
3. [COMPLETAR — Valor 3]
4. [COMPLETAR — Valor 4]
5. [COMPLETAR — Valor 5]

**Al completar esta lección, confirmas que entiendes la cultura de trabajo de BraveGirls Agency.**');

-- Módulo 1.2 — Normativa y Operación Diaria (6 lecciones)
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1200000-0000-0000-0000-000000000012', '📜 Normativa BraveGirls', 'text', 0,
'# 📜 Normativa BraveGirls

## Código de Conducta
- Cumplir horarios asignados
- Avisar con mínimo 24h de anticipación ausencias
- Mantener comportamiento profesional
- Confidencialidad absoluta

## Consecuencias
| 🟡 Leve | Advertencia verbal |
| 🟠 Media | Advertencia escrita |
| 🔴 Grave | Suspensión o terminación |
| ⛔ Crítica | Terminación inmediata |');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1200000-0000-0000-0000-000000000012', '✅ Tareas Diarias Obligatorias', 'text', 1,
'# ✅ Tareas Diarias Obligatorias

## 🌅 Arranque de Turno
- Revisar notas del turno anterior
- Leer mensajes sin responder y priorizarlos
- Revisar notificaciones

## 💬 Durante el Turno
- Responder TODOS los mensajes (objetivo: <4 min → 2-3 min)
- Vender activamente según orden de prioridad
- Reactivar fans inactivos usando listas de OnlyMonster

## 🌙 Cierre de Turno
- Completar notas en OnlyMonster
- Dejar resumen de pendientes para el siguiente turno

## 🔄 Traspaso
- Notas claras y útiles para el siguiente chatter');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1200000-0000-0000-0000-000000000012', '💰 Precios & Tarifas', 'text', 2,
'# 💰 Precios & Tarifas — Tabla Oficial

[COMPLETAR — Tabla completa de precios de todos los servicios]

**Los precios son IGUALES para todas las modelos. NUNCA negociar sin autorización del supervisor.**');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1200000-0000-0000-0000-000000000012', '🎯 Orden de Prioridad en Ventas', 'text', 3,
'# 🎯 Orden de Prioridad en Ventas

[COMPLETAR — Qué vender primero y por qué, en orden de prioridad]');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1200000-0000-0000-0000-000000000012', '🔒 Seguridad y Confidencialidad', 'text', 4,
'# 🔒 Seguridad y Confidencialidad

- NUNCA dar info personal
- NUNCA tomar screenshots sin autorización
- Protocolo de menores: avisar al supervisor INMEDIATAMENTE
- NUNCA revelar que es una agencia');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1200000-0000-0000-0000-000000000012', '🚫 Reglas de Oro del Chat', 'text', 5,
'# 🚫 Reglas de Oro del Chat

1. **Redes sociales**: SÍ las de trabajo, NUNCA las personales
2. **"¿Sos una agencia?"**: NEGAR SIEMPRE A MUERTE
3. **Contenido gratis**: NUNCA (excepción: retención de buen cliente)
4. **Tiempos de entrega**: "Lo haré en cuanto pueda", nunca fechas exactas
5. **Nunca hablar de otras modelos**
6. **Nunca discutir con un fan** → calma + supervisor
7. **Nunca inventar respuestas** → preguntar al supervisor');

-- Módulo 1.3 — Glosario del Chatter (1 lección)
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b1300000-0000-0000-0000-000000000013', '🔤 Vocabulario y Glosario', 'text', 0,
'# 🔤 Vocabulario y Glosario del Chatter

| Término | Significado |
|---------|-------------|
| **PPV** | Pay Per View — Contenido bloqueado que el fan paga para ver |
| **Custom** | Contenido hecho a medida según pedido del fan |
| **Script** | Guión de sexting interactivo |
| **Bóveda/Vault** | Almacén de contenido en OnlyFans |
| **Tip** | Pago voluntario del fan |
| **DM** | Mensaje directo/privado |
| **Masivo** | Mensaje enviado a muchos fans a la vez |
| **ARPPU** | Ingreso promedio por usuario que paga |
| **Conversion Rate** | % de fans que compran |
| **Free Trial** | Suscripción gratuita temporal |
| **Chargeback** | Fan pide reversión de pago a su banco |
| **Upselling** | Ofrecer producto adicional/superior |
| **Sexting** | Conversación sexual por texto (se cobra) |
| **Lista VIP** | Segmento de fans de alto valor |
| **Reactivación** | Contactar fans inactivos |');

-- ===================================================================
-- LECCIONES — ETAPA 2 (16 lecciones: 13 video + 3 texto)
-- ===================================================================

-- Módulo 2.1 — OnlyFans (5 video + 1 texto)
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('b2100000-0000-0000-0000-000000000021', '🌐 ¿Qué es OnlyFans?', 'video', 0, 'https://www.loom.com/embed/placeholder-modulo21-leccion01'),
('b2100000-0000-0000-0000-000000000021', '💬 El Chat de OnlyFans', 'video', 1, 'https://www.loom.com/embed/placeholder-modulo21-leccion02'),
('b2100000-0000-0000-0000-000000000021', '🗄️ La Bóveda (Vault)', 'video', 2, 'https://www.loom.com/embed/placeholder-modulo21-leccion03'),
('b2100000-0000-0000-0000-000000000021', '📊 Estadísticas', 'video', 3, 'https://www.loom.com/embed/placeholder-modulo21-leccion04'),
('b2100000-0000-0000-0000-000000000021', '📤 Mensajes Masivos', 'video', 4, 'https://www.loom.com/embed/placeholder-modulo21-leccion05');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b2100000-0000-0000-0000-000000000021', '💳 Pagos y Restricciones de OF', 'text', 5,
'# 💳 Pagos y Restricciones de OnlyFans

- OF retiene el **20%** de cada transacción
- El cliente paga un cargo adicional por procesamiento
- Si no puede pagar → dividir en 2-3 cuotas (no bajar precio)
- Contenido y términos prohibidos por TOS pueden causar suspensión de cuenta');

-- Módulo 2.2 — OnlyMonster (4 video + 1 texto)
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('b2200000-0000-0000-0000-000000000022', '🖥️ ¿Qué es OnlyMonster?', 'video', 0, 'https://www.loom.com/embed/placeholder-modulo22-leccion01'),
('b2200000-0000-0000-0000-000000000022', '💬 El Chat en OnlyMonster', 'video', 1, 'https://www.loom.com/embed/placeholder-modulo22-leccion02'),
('b2200000-0000-0000-0000-000000000022', '👤 Información del Cliente', 'video', 2, 'https://www.loom.com/embed/placeholder-modulo22-leccion03'),
('b2200000-0000-0000-0000-000000000022', '📝 Notas Obligatorias', 'video', 3, 'https://www.loom.com/embed/placeholder-modulo22-leccion04');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b2200000-0000-0000-0000-000000000022', '🤖 Mensajes Automáticos', 'text', 4,
'# 🤖 Mensajes Automáticos

- Están programados por la agencia — NO TOCARLOS
- Si un fan responde a un auto-message → seguir la conversación natural
- Nunca decir que fue un mensaje automático
- Aprovechar la respuesta para iniciar una venta');

-- Módulo 2.3 — Clasificación de Fans (4 video + 1 texto)
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('b2300000-0000-0000-0000-000000000023', '🎭 Tipos de Fans en OnlyFans', 'video', 0, 'https://www.loom.com/embed/placeholder-modulo23-leccion01'),
('b2300000-0000-0000-0000-000000000023', '🔍 Cómo Detectar cada Tipo de Fan', 'video', 1, 'https://www.loom.com/embed/placeholder-modulo23-leccion02'),
('b2300000-0000-0000-0000-000000000023', '📂 Sistema de Listas de la Agencia', 'video', 2, 'https://www.loom.com/embed/placeholder-modulo23-leccion03'),
('b2300000-0000-0000-0000-000000000023', '📋 Cómo Clasificar un Fan Paso a Paso', 'video', 3, 'https://www.loom.com/embed/placeholder-modulo23-leccion04');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b2300000-0000-0000-0000-000000000023', '🧠 Psicología Básica del Fan', 'text', 4,
'# 🧠 Psicología Básica del Fan

¿Por qué los fans gastan dinero en OnlyFans?
1. **Soledad** — buscan conexión humana
2. **Fantasía** — vivir experiencias que no pueden tener
3. **Conexión emocional** — sentir relación especial con la modelo
4. **Exclusividad** — recibir algo que otros no tienen
5. **Necesidad de atención** — que alguien les hable y les haga sentir importantes

> Entender la motivación = vender mejor sin ser agresivo.');

-- ===================================================================
-- LECCIONES — ETAPA 3 (15 lecciones: 11 video + 4 texto)
-- ===================================================================

-- Módulo 3.1 — Técnicas de Venta (9 video)
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('b3100000-0000-0000-0000-000000000031', '📹 Cómo Vender una Videollamada', 'video', 0, 'https://www.loom.com/embed/placeholder-modulo31-leccion01'),
('b3100000-0000-0000-0000-000000000031', '🎬 Cómo Vender un Custom', 'video', 1, 'https://www.loom.com/embed/placeholder-modulo31-leccion02'),
('b3100000-0000-0000-0000-000000000031', '📝 Cómo Vender un Script', 'video', 2, 'https://www.loom.com/embed/placeholder-modulo31-leccion03'),
('b3100000-0000-0000-0000-000000000031', '🗃️ Cómo Vender un Video de Bóveda como Custom', 'video', 3, 'https://www.loom.com/embed/placeholder-modulo31-leccion04'),
('b3100000-0000-0000-0000-000000000031', '⬆️ Cómo Ofrecer Extras y Upselling', 'video', 4, 'https://www.loom.com/embed/placeholder-modulo31-leccion05'),
('b3100000-0000-0000-0000-000000000031', '💸 Manejo de Tips', 'video', 5, 'https://www.loom.com/embed/placeholder-modulo31-leccion06'),
('b3100000-0000-0000-0000-000000000031', '🛍️ Otras Ventas Especiales', 'video', 6, 'https://www.loom.com/embed/placeholder-modulo31-leccion07'),
('b3100000-0000-0000-0000-000000000031', '💎 Fidelización de un Fan', 'video', 7, 'https://www.loom.com/embed/placeholder-modulo31-leccion08'),
('b3100000-0000-0000-0000-000000000031', '💬 Cómo Iniciar Conversación con un Fan Nuevo', 'video', 8, 'https://www.loom.com/embed/placeholder-modulo31-leccion09');

-- Módulo 3.2 — Situaciones Reales y Protocolo (2 video + 1 texto + 1 video)
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('b3200000-0000-0000-0000-000000000032', '😤 Manejo de Fans Difíciles', 'video', 0, 'https://www.loom.com/embed/placeholder-modulo32-leccion01'),
('b3200000-0000-0000-0000-000000000032', '⚠️ Errores Comunes de Chatters Nuevos', 'video', 1, 'https://www.loom.com/embed/placeholder-modulo32-leccion02');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b3200000-0000-0000-0000-000000000032', '🆘 Protocolo "No Sé Qué Hacer"', 'text', 2,
'# 🆘 Protocolo "No Sé Qué Hacer"

**Regla #1:** Si no sabés → preguntarle al supervisor ANTES de responder.

- Nunca inventar respuestas
- Nunca prometer algo sin confirmar
- Si la plataforma se cae → avisar al supervisor INMEDIATAMENTE');

INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
('b3200000-0000-0000-0000-000000000032', '🔄 Flujo Completo de una Conversación de Venta', 'video', 3, 'https://www.loom.com/embed/placeholder-modulo32-leccion04');

-- Módulo 3.3 — Métricas y Evaluación (2 texto)
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b3300000-0000-0000-0000-000000000033', '📈 Qué se te Va a Medir', 'text', 0,
'# 📈 Qué se te Va a Medir

- Predisposición y compromiso
- Proactividad
- Capacidad resolutiva
- **Tiempo de respuesta**: 4 min → 2-3 min
- Cantidad de respuestas
- Conversión (% fans que compran)
- Fidelización
- Calidad de trato');

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
('b3300000-0000-0000-0000-000000000033', '🎭 Perfil de Modelo', 'text', 1,
'# 🎭 Perfil de Modelo

- Cada modelo tiene su perfil de personalidad en **Discord**
- Es **OBLIGATORIO** estudiarlo antes de chatear
- Precios iguales para todas las modelos
- Incluye: personalidad, estilo, contenido, límites, datos ficticios');

-- ===================================================================
-- QUIZZES (9, sin preguntas — agregar desde admin panel)
-- ===================================================================
INSERT INTO lms_quizzes (module_id, passing_score, max_attempts, cooldown_minutes) VALUES
('b1100000-0000-0000-0000-000000000011', 80, 3, 1),
('b1200000-0000-0000-0000-000000000012', 80, 3, 1),
('b1300000-0000-0000-0000-000000000013', 80, 3, 1),
('b2100000-0000-0000-0000-000000000021', 80, 3, 1),
('b2200000-0000-0000-0000-000000000022', 80, 3, 1),
('b2300000-0000-0000-0000-000000000023', 80, 3, 1),
('b3100000-0000-0000-0000-000000000031', 80, 3, 1),
('b3200000-0000-0000-0000-000000000032', 80, 3, 1),
('b3300000-0000-0000-0000-000000000033', 80, 3, 1);

-- ===================================================================
-- NOTAS
-- ===================================================================
-- Curriculum v3: 3 Etapas, 9 Módulos, 39 Lecciones, 9 Quizzes
-- Los quizzes están creados pero SIN PREGUNTAS.
-- El admin debe agregar las preguntas (~43) desde el dashboard.
-- Las URLs de Loom son placeholders que deben ser reemplazadas con videos reales.
-- Los [COMPLETAR] en texto deben llenarse con datos reales de la agencia.
