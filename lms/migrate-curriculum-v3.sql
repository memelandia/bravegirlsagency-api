-- ===================================================================
-- MIGRACIÓN: Curriculum v3 — BraveGirls LMS
-- Fecha: 15 de Febrero, 2026
-- Reemplaza etapas, módulos, lecciones y quizzes con el curriculum v3
-- 3 Etapas | 9 Módulos | 39 Lecciones | 9 Quizzes (sin preguntas)
-- ===================================================================
-- ⚠️  ADVERTENCIA: Este script BORRA todo el progreso existente.
--    Ejecutar solo en entorno limpio o de staging.
-- ===================================================================

BEGIN;

-- ===================================================================
-- 1. LIMPIAR DATOS EXISTENTES (orden por dependencias FK)
-- ===================================================================
DELETE FROM lms_quiz_attempts;
DELETE FROM lms_progress_lessons;
DELETE FROM lms_questions;
DELETE FROM lms_quizzes;
DELETE FROM lms_lessons;
DELETE FROM lms_modules;
DELETE FROM lms_stages;

-- ===================================================================
-- 2. ETAPAS (3)
-- ===================================================================
INSERT INTO lms_stages (id, name, description, order_index) VALUES
(
  '10000000-0000-0000-0000-000000000001',
  'ETAPA 1 — Fundamentos BraveGirls',
  'El chatter entiende dónde está, qué se espera, y conoce las reglas del juego. Día 1.',
  0
),
(
  '20000000-0000-0000-0000-000000000002',
  'ETAPA 2 — Las Herramientas',
  'El chatter domina OnlyFans, OnlyMonster, y sabe clasificar fans. Día 2.',
  1
),
(
  '30000000-0000-0000-0000-000000000003',
  'ETAPA 3 — Ventas y Práctica',
  'El chatter aprende a vender, fidelizar, manejar situaciones y conoce cómo se lo evalúa. Día 3.',
  2
);

-- ===================================================================
-- 3. MÓDULOS (9) — order_index GLOBAL (0-8) para unlock secuencial
-- ===================================================================
INSERT INTO lms_modules (id, stage_id, title, description, order_index, published) VALUES
-- ETAPA 1
(
  'b1100000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000001',
  'Módulo 1.1 — Cultura de Trabajo BraveGirls',
  'Propósito de la agencia, lema, frase de compromiso personal, y los 5 valores principales de trabajo.',
  0,
  true
),
(
  'b1200000-0000-0000-0000-000000000012',
  '10000000-0000-0000-0000-000000000001',
  'Módulo 1.2 — Normativa y Operación Diaria',
  'Reglas, código de conducta, tareas diarias obligatorias, precios, prioridades de venta, seguridad y reglas de oro del chat.',
  1,
  true
),
(
  'b1300000-0000-0000-0000-000000000013',
  '10000000-0000-0000-0000-000000000001',
  'Módulo 1.3 — Glosario del Chatter',
  'Vocabulario esencial: PPV, Custom, Script, Bóveda, Tip, DM, Masivo, ARPPU, Conversion Rate y más.',
  2,
  true
),
-- ETAPA 2
(
  'b2100000-0000-0000-0000-000000000021',
  '20000000-0000-0000-0000-000000000002',
  'Módulo 2.1 — OnlyFans: Conociendo la Plataforma',
  'Secciones de OnlyFans, chat, bóveda, estadísticas, mensajes masivos, pagos y restricciones.',
  3,
  true
),
(
  'b2200000-0000-0000-0000-000000000022',
  '20000000-0000-0000-0000-000000000002',
  'Módulo 2.2 — OnlyMonster: Tu Herramienta de Trabajo',
  'Interfaz de OnlyMonster, chat, información del cliente, notas obligatorias y mensajes automáticos.',
  4,
  true
),
(
  'b2300000-0000-0000-0000-000000000023',
  '20000000-0000-0000-0000-000000000002',
  'Módulo 2.3 — Clasificación de Fans',
  'Tipos de fans, cómo detectarlos, sistema de listas, clasificación paso a paso y psicología básica del fan.',
  5,
  true
),
-- ETAPA 3
(
  'b3100000-0000-0000-0000-000000000031',
  '30000000-0000-0000-0000-000000000003',
  'Módulo 3.1 — Técnicas de Venta',
  'Cómo vender videollamadas, customs, scripts, upselling, tips, ventas especiales, fidelización e inicio de conversación.',
  6,
  true
),
(
  'b3200000-0000-0000-0000-000000000032',
  '30000000-0000-0000-0000-000000000003',
  'Módulo 3.2 — Situaciones Reales y Protocolo',
  'Manejo de fans difíciles, errores comunes, protocolo de emergencia y flujo completo de una conversación de venta.',
  7,
  true
),
(
  'b3300000-0000-0000-0000-000000000033',
  '30000000-0000-0000-0000-000000000003',
  'Módulo 3.3 — Métricas y Evaluación',
  'Qué se mide, cómo se evalúa, perfiles de modelo en Discord y estándares de calidad.',
  8,
  true
);

-- ===================================================================
-- 4. LECCIONES — ETAPA 1 (8 lecciones, todas texto)
-- ===================================================================

-- ─── Módulo 1.1 — Cultura de Trabajo BraveGirls (1 lección) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b1100000-0000-0000-0000-000000000011',
  '🏛️ Cultura BraveGirls',
  'text',
  0,
  '# 🏛️ Cultura de Trabajo BraveGirls

## ¿Quiénes somos?

BraveGirls Agency es una agencia profesional de gestión de cuentas de creadoras de contenido. Nuestro trabajo es maximizar los ingresos de cada modelo a través del chat, las ventas y la fidelización de fans.

## Nuestro lema

> **[COMPLETAR — Lema de la agencia]**

## Frase de compromiso personal

Al unirte a BraveGirls, te comprometes con lo siguiente:

> **[COMPLETAR — Frase de compromiso que cada chatter debe aceptar]**

## Los 5 Valores de Trabajo de BraveGirls

Estos son los principios que guían todo lo que hacemos:

### 1. [COMPLETAR — Valor 1]
[Descripción del valor]

### 2. [COMPLETAR — Valor 2]
[Descripción del valor]

### 3. [COMPLETAR — Valor 3]
[Descripción del valor]

### 4. [COMPLETAR — Valor 4]
[Descripción del valor]

### 5. [COMPLETAR — Valor 5]
[Descripción del valor]

---

**Estos valores no son decorativos.** Se reflejan en tu trabajo diario, en tu trato con los fans y en cómo te evalúan tus supervisores. Si no los compartes, este no es tu lugar.

**Al completar esta lección, confirmas que entiendes y aceptas la cultura de trabajo de BraveGirls Agency.**'
);

-- ─── Módulo 1.2 — Normativa y Operación Diaria (6 lecciones) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b1200000-0000-0000-0000-000000000012',
  '📜 Normativa BraveGirls',
  'text',
  0,
  '# 📜 Normativa BraveGirls

## Código de Conducta

Como chatter de BraveGirls Agency, debes cumplir las siguientes reglas sin excepción:

### Horarios y Asistencia
- Cumplir con los horarios asignados de tu turno
- Avisar con **mínimo 24 horas** de anticipación en caso de ausencia
- No abandonar tu turno sin autorización del supervisor
- Estar **activo** durante todo tu turno (no AFK)

### Comportamiento Profesional
- Tratar a todos los fans con respeto, sin importar su comportamiento
- Nunca llevar problemas personales al chat
- Mantener un tono profesional en las comunicaciones internas
- Colaborar con tu equipo y supervisores

### Confidencialidad Absoluta
- Toda información de fans, modelos y la agencia es **100% CONFIDENCIAL**
- Está terminantemente prohibido compartir datos de acceso con terceros
- No tomar capturas de pantalla del chat sin autorización
- No hablar de la agencia ni de modelos fuera del equipo

## Consecuencias por Incumplimiento

| Nivel | Falta | Consecuencia |
|-------|-------|-------------|
| 🟡 Leve | Llegar tarde, respuestas lentas | Advertencia verbal |
| 🟠 Media | Incumplir SOP, faltar sin aviso | Advertencia escrita |
| 🔴 Grave | Violar confidencialidad, inventar info | Suspensión o terminación |
| ⛔ Crítica | Compartir datos de acceso, estafar | Terminación inmediata |

**Al completar esta lección, aceptas haber leído y comprendido estas reglas.**'
),
(
  'b1200000-0000-0000-0000-000000000012',
  '✅ Tareas Diarias Obligatorias',
  'text',
  1,
  '# ✅ Tareas Diarias Obligatorias

Estas son las tareas que **TODO chatter** debe cumplir cada día, sin excepción.

## 🌅 Arranque de Turno

1. **Revisar notas** del turno anterior (¿qué quedó pendiente?)
2. **Leer mensajes** sin responder y priorizarlos
3. **Revisar notificaciones** de OnlyFans y OnlyMonster
4. **Identificar fans activos** con oportunidades de venta
5. **Confirmar** que tienes acceso a todas las herramientas

## 💬 Durante el Turno

1. **Responder TODOS los mensajes** lo más rápido posible (objetivo: <4 min → mejorar a 2-3 min)
2. **Vender activamente** siguiendo el orden de prioridad
3. **Hacer seguimiento** a fans que mostraron interés
4. **Reactivar fans inactivos** usando las listas automáticas de OnlyMonster (fans que llevan tiempo sin gastar → obligación escribirles y generar interés)
5. **Registrar** toda venta y dato relevante en las notas del fan
6. **Escalar** cualquier situación difícil al supervisor

## 🌙 Cierre de Turno

1. **Completar notas** en OnlyMonster de CADA fan con quien hablaste
2. **Dejar resumen** de pendientes para el siguiente turno
3. **Reportar** ventas del turno
4. **Flag** fans que necesiten seguimiento urgente

## 🔄 Traspaso al Siguiente Chatter

- Las notas deben ser **claras y útiles** — el siguiente chatter debe poder continuar la conversación SIN preguntar qué pasó
- Incluir: nombre del fan, qué pidió, en qué quedaron, si hay algo pendiente de entregar
- Si un fan está en medio de una negociación → dejar instrucciones claras

---

⚠️ **El incumplimiento de estas tareas es motivo de advertencia.**'
),
(
  'b1200000-0000-0000-0000-000000000012',
  '💰 Precios & Tarifas',
  'text',
  2,
  '# 💰 Precios & Tarifas — Tabla Oficial

Esta es la tabla de precios oficial de BraveGirls Agency. **NUNCA** ofrezcas precios diferentes sin aprobación del supervisor.

## Tabla de Precios

| Producto / Servicio | Precio | Notas |
|---------------------|--------|-------|
| [COMPLETAR — Servicio 1] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 2] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 3] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 4] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 5] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 6] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 7] | $[COMPLETAR] | [Notas] |
| [COMPLETAR — Servicio 8] | $[COMPLETAR] | [Notas] |

## Reglas importantes

- **Los precios son IGUALES para todas las modelos**
- **Nunca negociar** precios sin autorización del supervisor
- Si un fan dice que no puede pagar → ofrecer **dividir en 2-3 cuotas** (no bajar el precio)
- Las propinas (tips) NO tienen precio fijo — son voluntarias del fan

---

📌 **Memoriza estos precios.** En el quiz se te preguntará sobre ellos.'
),
(
  'b1200000-0000-0000-0000-000000000012',
  '🎯 Orden de Prioridad en Ventas',
  'text',
  3,
  '# 🎯 Orden de Prioridad en Ventas

No todos los productos generan lo mismo. Cuando tengas oportunidad de vender, sigue este orden de prioridad:

## Prioridad de Venta (de mayor a menor)

| # | Producto | ¿Por qué? |
|---|----------|-----------|
| 1 | [COMPLETAR — Producto más prioritario] | [Razón] |
| 2 | [COMPLETAR] | [Razón] |
| 3 | [COMPLETAR] | [Razón] |
| 4 | [COMPLETAR] | [Razón] |
| 5 | [COMPLETAR] | [Razón] |

## ¿Cómo aplicar esto?

- Si un fan muestra interés general → ofrece primero el producto de mayor prioridad
- Si ya compró el #1 → ofrece el #2 como adicional (upselling)
- Si no puede pagar el #1 → baja al #2 o #3 (no le bajes el precio del #1)

## Ejemplo práctico

> Un fan dice "quiero algo especial de la modelo". Según la prioridad, le ofrecés primero [COMPLETAR], y si no le interesa, bajás a [COMPLETAR].

---

📌 **Saber qué vender primero es lo que separa a un chatter promedio de uno que factura.**'
),
(
  'b1200000-0000-0000-0000-000000000012',
  '🔒 Seguridad y Confidencialidad',
  'text',
  4,
  '# 🔒 Seguridad y Confidencialidad

Este módulo cubre las reglas de seguridad más importantes. **Romper cualquiera de estas reglas es motivo de terminación inmediata.**

## ❌ Lo que NUNCA debes hacer

### Información Personal
- **NUNCA** dar información personal: ni tuya, ni de la modelo, ni de la agencia
- **NUNCA** compartir redes sociales personales del equipo
- **NUNCA** revelar nombres reales, ubicaciones o datos de contacto

### Capturas y Registros
- **NUNCA** tomar screenshots del chat sin autorización
- **NUNCA** copiar conversaciones fuera de las herramientas de trabajo
- **NUNCA** grabar pantalla durante tu turno sin permiso

### Datos de Acceso
- **NUNCA** compartir tus credenciales de OnlyFans u OnlyMonster
- **NUNCA** acceder desde dispositivos no autorizados
- **NUNCA** dejar sesiones abiertas al terminar tu turno

## 🚨 Protocolo de Menores

> **Si un fan dice o insinúa ser menor de edad:**
>
> 1. **DETENER** toda conversación inmediatamente
> 2. **NO bloquear** — no hacer nada por tu cuenta
> 3. **AVISAR al supervisor INMEDIATAMENTE**
> 4. **NO** seguir chateando "a ver si miente"
> 5. **NO** preguntar la edad para confirmarlo
>
> **El supervisor se encarga. Tu única tarea es avisar.**

## 🤫 La Regla de Oro de la Confidencialidad

**NUNCA revelar que es una agencia.** Ni directa ni indirectamente. Si un fan pregunta, la respuesta es siempre que la modelo responde sus propios mensajes.

---

⚠️ **Violar cualquiera de estas reglas = terminación inmediata, sin excepciones.**'
),
(
  'b1200000-0000-0000-0000-000000000012',
  '🚫 Reglas de Oro del Chat',
  'text',
  5,
  '# 🚫 Reglas de Oro del Chat

Estas son las prohibiciones y excepciones fundamentales del trabajo diario. **Memoriza cada una.**

## Las 7 Reglas de Oro

### 🔴 1. Redes Sociales
**SÍ** se pueden dar las **redes DE TRABAJO** de la modelo (las oficiales).
**NUNCA** dar las redes personales del chatter ni de nadie del equipo.

### 🔴 2. "¿Sos una agencia?"
**NEGAR SIEMPRE. A MUERTE.**
> Respuesta tipo: *"Yo respondo mis propios mensajes, me ofende que pienses eso, jamás le daría mi contraseña a nadie."*

La modelo **se siente ofendida** por el cuestionamiento. Nunca dudar, nunca admitir nada.

### 🔴 3. Contenido Gratis
En general **NUNCA enviar contenido sin cobrar.**

**EXCEPCIÓN:** Si el fan es un buen cliente y está cabreado, o si la modelo no entregó un contenido a tiempo, se puede enviar un "regalito" (una foto) para mantenerlo conforme. Esto es una estrategia de retención, no una costumbre.

### 🔴 4. Tiempos de Entrega
**SIEMPRE** decir:
- *"Lo haré en cuanto pueda"*
- *"Lo haré lo antes posible"*
- Para llamadas: *"La haremos en cuanto me prepare"*

Si la modelo no puede → meter una excusa natural.
**NUNCA** prometer fechas exactas que no controlás.

### 🔴 5. Nunca Hablar de Otras Modelos
El fan **NO debe saber** que hay otras modelos en la agencia. Cada modelo es independiente en la mente del fan.

### 🔴 6. Nunca Discutir con un Fan
Si se pone agresivo → **mantener la calma** → avisar al supervisor.
Nunca escalar, nunca insultar, nunca amenazar. Tu trabajo es desactivar, no alimentar.

### 🔴 7. Nunca Inventar Respuestas
Si no sabés → **preguntarle al supervisor ANTES de responder.**
Mejor tardar 2 minutos en responder correctamente que responder al instante con algo falso.

---

📌 **Estas reglas no tienen excepciones (salvo las indicadas). Violerlas tiene consecuencias directas.**'
);

-- ─── Módulo 1.3 — Glosario del Chatter (1 lección) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b1300000-0000-0000-0000-000000000013',
  '🔤 Vocabulario y Glosario',
  'text',
  0,
  '# 🔤 Vocabulario y Glosario del Chatter

Material de referencia. **No necesitas memorizar todo**, pero debes saber qué significa cada término cuando lo veas.

## Términos Esenciales

| Término | Significado |
|---------|-------------|
| **PPV** | **Pay Per View** — Contenido bloqueado que el fan debe pagar para ver. Se envía por DM. |
| **Custom** | Contenido hecho **a medida** según el pedido específico del fan (video, fotos, audio). |
| **Script** | Guión de sexting interactivo entre la "modelo" y el fan. Se vende como experiencia exclusiva. |
| **Bóveda / Vault** | Almacén de contenido ya subido en OnlyFans. Se usa para enviar contenido existente. |
| **Tip / Propina** | Pago voluntario del fan sin recibir contenido a cambio (generalmente como muestra de aprecio). |
| **DM** | Direct Message — Mensaje directo/privado entre el fan y la modelo. |
| **Masivo** | Mensaje enviado a muchos fans a la vez (Mass Message). Se usa para vender PPV a escala. |
| **ARPPU** | Average Revenue Per Paying User — Ingreso promedio por usuario que paga. Métrica clave. |
| **Conversion Rate** | Tasa de conversión — % de fans que compran algo del total que ven tu oferta. |
| **Free Trial** | Suscripción gratuita temporal. El fan entra sin pagar para "probar". |
| **Chargeback** | Cuando un fan pide a su banco que revierta un pago. Pérdida de dinero + riesgo para la cuenta. |
| **Upselling** | Ofrecer un producto adicional o superior al que el fan ya compró/está por comprar. |
| **Sexting** | Conversación sexual por texto entre "la modelo" y el fan. Se cobra por sesión/minutos. |
| **Lista VIP** | Segmento especial de fans de alto valor. Reciben trato y contenido exclusivo. |
| **Reactivación** | Contactar a fans inactivos para volver a engancharlos y que vuelvan a gastar. |
| **GFE** | Girlfriend Experience — Experiencia de "novia virtual". Atención personalizada 24/7. |
| **Whale / Ballena** | Fan que gasta mucho dinero (>$500/mes). El cliente más valioso. |
| **TOS** | Terms of Service — Términos de servicio de OnlyFans. Violarlos puede causar suspensión. |
| **Engagement** | Nivel de interacción y conexión del fan con la modelo. Más engagement = más ventas. |

---

📌 **Usa este glosario como referencia. Si ves un término que no conocés durante tu turno, volvé acá.**'
);

-- ===================================================================
-- 5. LECCIONES — ETAPA 2 (16 lecciones: 13 video + 3 texto)
-- ===================================================================

-- ─── Módulo 2.1 — OnlyFans: Conociendo la Plataforma (6 lecciones) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
(
  'b2100000-0000-0000-0000-000000000021',
  '🌐 ¿Qué es OnlyFans?',
  'video',
  0,
  'https://www.loom.com/embed/placeholder-modulo21-leccion01'
),
(
  'b2100000-0000-0000-0000-000000000021',
  '💬 El Chat de OnlyFans',
  'video',
  1,
  'https://www.loom.com/embed/placeholder-modulo21-leccion02'
),
(
  'b2100000-0000-0000-0000-000000000021',
  '🗄️ La Bóveda (Vault)',
  'video',
  2,
  'https://www.loom.com/embed/placeholder-modulo21-leccion03'
),
(
  'b2100000-0000-0000-0000-000000000021',
  '📊 Estadísticas',
  'video',
  3,
  'https://www.loom.com/embed/placeholder-modulo21-leccion04'
),
(
  'b2100000-0000-0000-0000-000000000021',
  '📤 Mensajes Masivos',
  'video',
  4,
  'https://www.loom.com/embed/placeholder-modulo21-leccion05'
);

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b2100000-0000-0000-0000-000000000021',
  '💳 Pagos y Restricciones de OF',
  'text',
  5,
  '# 💳 Pagos y Restricciones de OnlyFans

## Cómo funcionan los pagos

### Comisión de OnlyFans
OnlyFans **retiene el 20%** de cada transacción. Esto significa:
- Si un fan paga $100 → la modelo recibe $80
- Este 20% aplica a **todo**: suscripciones, tips, PPV, customs

### Costo adicional para el cliente
El fan también paga un **cargo adicional** por procesamiento que varía según su método de pago y ubicación.

### ¿Qué pasa si el fan no puede pagar el monto completo?
Ofrecerle **dividir el pago en 2 o 3 cuotas** por separado:
> *"Si quieres, puedo hacértelo en 2 partes para que sea más fácil 😘"*

**NUNCA** bajar el precio. Solo dividir.

## Restricciones de los TOS (Términos de Servicio)

OnlyFans tiene reglas estrictas. Violarlas puede causar **suspensión o cierre de la cuenta**.

### ⛔ Contenido y acciones PROHIBIDAS por TOS:
- [COMPLETAR — Lista de términos/acciones prohibidas según TOS de OnlyFans]
- Usar ciertas palabras explícitas en mensajes (OF las detecta automáticamente)
- Mencionar menores de edad en cualquier contexto
- Ofrecer encuentros presenciales
- Compartir contenido de terceros sin consentimiento

### ✅ Buenas prácticas para evitar problemas:
- Usar lenguaje sugestivo pero no explícitamente prohibido
- Nunca usar palabras que OnlyFans flagea automáticamente
- Ante la duda → pregunta al supervisor

---

⚠️ **Una suspensión de cuenta = pérdida de ingresos para TODOS. Sé cuidadoso con el lenguaje.**'
);

-- ─── Módulo 2.2 — OnlyMonster: Tu Herramienta de Trabajo (5 lecciones) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
(
  'b2200000-0000-0000-0000-000000000022',
  '🖥️ ¿Qué es OnlyMonster?',
  'video',
  0,
  'https://www.loom.com/embed/placeholder-modulo22-leccion01'
),
(
  'b2200000-0000-0000-0000-000000000022',
  '💬 El Chat en OnlyMonster',
  'video',
  1,
  'https://www.loom.com/embed/placeholder-modulo22-leccion02'
),
(
  'b2200000-0000-0000-0000-000000000022',
  '👤 Información del Cliente',
  'video',
  2,
  'https://www.loom.com/embed/placeholder-modulo22-leccion03'
),
(
  'b2200000-0000-0000-0000-000000000022',
  '📝 Notas Obligatorias',
  'video',
  3,
  'https://www.loom.com/embed/placeholder-modulo22-leccion04'
);

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b2200000-0000-0000-0000-000000000022',
  '🤖 Mensajes Automáticos',
  'text',
  4,
  '# 🤖 Mensajes Automáticos

## ¿Qué son?

La agencia tiene **mensajes automáticos** (auto-messages) programados que se envían a los fans en ciertos momentos:
- Cuando se suscriben por primera vez
- Cuando llevan X días sin interactuar
- En fechas o momentos específicos

## ⚠️ Regla importante: NO LOS TOQUES

Los mensajes automáticos están configurados por la agencia. **No los modifiques, desactives ni reprogrames.** Si crees que hay un problema con alguno, avisa al supervisor.

## ¿Qué hago si un fan responde a un auto-message?

Esto es lo más común. Un fan recibe un mensaje automático y responde algo.

**Lo que debes hacer:**
1. **Leer** el mensaje automático que le llegó al fan (revisa el historial)
2. **Seguir la conversación de forma natural** a partir de lo que el auto-message le envió
3. **Nunca decirle** que fue un mensaje automático
4. Aprovechar la oportunidad para **iniciar una venta**

**Lo que NUNCA debes hacer:**
- ❌ Decir "eso fue un error"
- ❌ Decir "ese mensaje no lo mandé yo"
- ❌ Ignorar al fan
- ❌ Borrar el mensaje automático

## Ejemplo

> **Auto-message al fan:** *"Hey baby, I missed you! 💕 I have something special for you..."*
> **Fan responde:** *"Oh really? What is it?"*
> **Tú (siguiendo natural):** *"I just recorded something VERY spicy this morning... want to see? 🔥"*

---

📌 **Los auto-messages son herramientas de reactivación. Tu trabajo es convertir esas respuestas en ventas.**'
);

-- ─── Módulo 2.3 — Clasificación de Fans (5 lecciones) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
(
  'b2300000-0000-0000-0000-000000000023',
  '🎭 Tipos de Fans en OnlyFans',
  'video',
  0,
  'https://www.loom.com/embed/placeholder-modulo23-leccion01'
),
(
  'b2300000-0000-0000-0000-000000000023',
  '🔍 Cómo Detectar cada Tipo de Fan',
  'video',
  1,
  'https://www.loom.com/embed/placeholder-modulo23-leccion02'
),
(
  'b2300000-0000-0000-0000-000000000023',
  '📂 Sistema de Listas de la Agencia',
  'video',
  2,
  'https://www.loom.com/embed/placeholder-modulo23-leccion03'
),
(
  'b2300000-0000-0000-0000-000000000023',
  '📋 Cómo Clasificar un Fan Paso a Paso',
  'video',
  3,
  'https://www.loom.com/embed/placeholder-modulo23-leccion04'
);

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b2300000-0000-0000-0000-000000000023',
  '🧠 Psicología Básica del Fan',
  'text',
  4,
  '# 🧠 Psicología Básica del Fan

Entender **por qué** los fans gastan dinero en OnlyFans es la clave para vender más sin ser agresivo.

## ¿Por qué gastan?

Los fans no pagan solo por contenido. Pagan por **emociones**:

### 1. 🫂 Soledad
Muchos fans buscan una conexión humana que no tienen en su vida real. Sienten que la modelo les presta atención genuina.

### 2. 🌟 Fantasía
OnlyFans les permite vivir una fantasía que no pueden tener en la realidad. El chat personalizado es parte de esa fantasía.

### 3. 💕 Conexión Emocional
El fan quiere sentir que tiene una relación especial con la modelo. Que no es "uno más".

### 4. 👑 Exclusividad
Saber que reciben algo que otros no tienen. Los customs, las listas VIP y los mensajes personalizados alimentan esto.

### 5. 🔔 Necesidad de Atención
Algunos fans simplemente quieren que alguien les hable, les responda rápido y les haga sentir importantes.

## ¿Cómo usar esto para vender?

| Motivación del fan | Cómo aprovecharlo |
|-------------------|-------------------|
| Soledad | Ser cálida, hacer preguntas personales, hacerlo sentir escuchado |
| Fantasía | Crear escenarios, ofrecer customs y scripts personalizados |
| Conexión | Recordar detalles de conversaciones anteriores (usar notas) |
| Exclusividad | Ofrecer contenido "que no le mando a cualquiera" |
| Atención | Responder rápido, iniciar conversación proactivamente |

## La regla de oro

> **Entender la motivación del fan = vender mejor sin ser agresivo.**

No estás vendiendo contenido. Estás vendiendo una **experiencia emocional**. Cuando lo entiendas, vender se vuelve natural.

---

📌 **No todos los fans son iguales. Aprende a leer qué busca cada uno y adapta tu approach.**'
);

-- ===================================================================
-- 6. LECCIONES — ETAPA 3 (15 lecciones: 11 video + 4 texto)
-- ===================================================================

-- ─── Módulo 3.1 — Técnicas de Venta (9 lecciones, todas video) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
(
  'b3100000-0000-0000-0000-000000000031',
  '📹 Cómo Vender una Videollamada',
  'video',
  0,
  'https://www.loom.com/embed/placeholder-modulo31-leccion01'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '🎬 Cómo Vender un Custom',
  'video',
  1,
  'https://www.loom.com/embed/placeholder-modulo31-leccion02'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '📝 Cómo Vender un Script',
  'video',
  2,
  'https://www.loom.com/embed/placeholder-modulo31-leccion03'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '🗃️ Cómo Vender un Video de Bóveda como Custom',
  'video',
  3,
  'https://www.loom.com/embed/placeholder-modulo31-leccion04'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '⬆️ Cómo Ofrecer Extras y Upselling',
  'video',
  4,
  'https://www.loom.com/embed/placeholder-modulo31-leccion05'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '💸 Manejo de Tips',
  'video',
  5,
  'https://www.loom.com/embed/placeholder-modulo31-leccion06'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '🛍️ Otras Ventas Especiales',
  'video',
  6,
  'https://www.loom.com/embed/placeholder-modulo31-leccion07'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '💎 Fidelización de un Fan',
  'video',
  7,
  'https://www.loom.com/embed/placeholder-modulo31-leccion08'
),
(
  'b3100000-0000-0000-0000-000000000031',
  '💬 Cómo Iniciar Conversación con un Fan Nuevo',
  'video',
  8,
  'https://www.loom.com/embed/placeholder-modulo31-leccion09'
);

-- ─── Módulo 3.2 — Situaciones Reales y Protocolo (4 lecciones) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
(
  'b3200000-0000-0000-0000-000000000032',
  '😤 Manejo de Fans Difíciles',
  'video',
  0,
  'https://www.loom.com/embed/placeholder-modulo32-leccion01'
),
(
  'b3200000-0000-0000-0000-000000000032',
  '⚠️ Errores Comunes de Chatters Nuevos',
  'video',
  1,
  'https://www.loom.com/embed/placeholder-modulo32-leccion02'
);

INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b3200000-0000-0000-0000-000000000032',
  '🆘 Protocolo "No Sé Qué Hacer"',
  'text',
  2,
  '# 🆘 Protocolo "No Sé Qué Hacer"

Este es el protocolo más importante para un chatter nuevo. **Ante cualquier duda, SIEMPRE sigue estos pasos.**

## La Regla #1

> **Si no sabés qué hacer → preguntarle al supervisor ANTES de responder.**

No importa si tardás 2-3 minutos más en responder. Es **infinitamente mejor** tardar un poco y dar la respuesta correcta que responder al instante con algo incorrecto o inventado.

## 🚫 Lo que NUNCA debes hacer

- **Nunca inventar** una respuesta cuando no estás seguro
- **Nunca prometer** algo al fan sin confirmar que se puede cumplir
- **Nunca adivinar** precios, tiempos de entrega o disponibilidad
- **Nunca asumir** que "probablemente está bien" — si dudas, pregunta

## ¿Qué decirle al fan mientras consultas?

> *"Give me a sec baby, I want to make sure I give you exactly what you want 😘"*

> *"Let me check something quick for you... one moment! 💕"*

El fan no se va a ir por esperar 2 minutos. Pero SÍ se puede ir si le prometés algo que después no podés cumplir.

## 🚨 Si OnlyFans o OnlyMonster se caen

1. **Avisar al supervisor INMEDIATAMENTE** — no esperar, no intentar arreglarlo
2. No cerrar ni reabrir nada por tu cuenta
3. Esperar instrucciones
4. Si podés seguir chateando desde otra herramienta → preguntar antes de hacerlo

## Resumen

| Situación | Acción |
|-----------|--------|
| No sé el precio de algo | Pregunto al supervisor |
| El fan pide algo raro | Pregunto al supervisor |
| No sé si puedo hacer X | Pregunto al supervisor |
| Se cayó la plataforma | Aviso al supervisor YA |
| El fan se puso agresivo | Calma + aviso al supervisor |
| Menor de edad | STOP + aviso al supervisor |

---

📌 **Tu supervisor está para ayudarte. Usarlo no es debilidad, es profesionalismo.**'
);

INSERT INTO lms_lessons (module_id, title, type, order_index, loom_url) VALUES
(
  'b3200000-0000-0000-0000-000000000032',
  '🔄 Flujo Completo de una Conversación de Venta',
  'video',
  3,
  'https://www.loom.com/embed/placeholder-modulo32-leccion04'
);

-- ─── Módulo 3.3 — Métricas y Evaluación (2 lecciones, ambas texto) ───
INSERT INTO lms_lessons (module_id, title, type, order_index, text_content) VALUES
(
  'b3300000-0000-0000-0000-000000000033',
  '📈 Qué se te Va a Medir',
  'text',
  0,
  '# 📈 Qué se te Va a Medir

## Tus Métricas de Evaluación

Como chatter, serás evaluado constantemente en estas áreas:

### 1. 🧠 Predisposición y Compromiso
- ¿Mostrás ganas de aprender y mejorar?
- ¿Cumplís con las tareas sin que te las recuerden?
- ¿Sos proactivo o solo hacés lo mínimo?

### 2. 💡 Proactividad
- ¿Iniciás conversaciones con fans o esperás que te escriban?
- ¿Buscás oportunidades de venta o solo respondés preguntas?
- ¿Reactivás fans inactivos sin que te lo pidan?

### 3. 🔧 Capacidad Resolutiva
- ¿Resolvés problemas o escalás todo al supervisor?
- ¿Sabés manejar objeciones del fan?
- ¿Podés manejar múltiples chats sin perder calidad?

### 4. ⏱️ Tiempo de Respuesta
- **Objetivo inicial:** responder en menos de **4 minutos**
- **Objetivo una vez entrenado:** **2-3 minutos máximo**
- El tiempo de respuesta se mide automáticamente

### 5. 📊 Cantidad de Respuestas
- Número de mensajes enviados por turno
- Número de conversaciones activas manejadas

### 6. 💰 Conversión
- % de fans que terminan comprando después de tu interacción
- Monto total de ventas generadas

### 7. 💎 Fidelización
- % de fans que vuelven a comprar después de la primera venta
- Retención de fans VIP

### 8. ⭐ Calidad de Trato
- ¿El fan se siente bien atendido?
- ¿Las conversaciones son naturales o robóticas?
- ¿Se detectan respuestas genéricas "para sacarte el chat de encima"?

---

⚠️ **Responder rápido con respuestas genéricas NO es suficiente.** Se detecta en las métricas de fidelización y calidad, y tiene consecuencias.'
),
(
  'b3300000-0000-0000-0000-000000000033',
  '🎭 Perfil de Modelo',
  'text',
  1,
  '# 🎭 Perfil de Modelo

## ¿Qué es el Perfil de Modelo?

Cada modelo con la que vas a chatear tiene un **perfil de personalidad** documentado. Este perfil define:
- Su personalidad para el chat (cómo habla, su estilo, su tono)
- El tipo de contenido que ofrece
- Sus límites (qué hace y qué NO hace)
- Datos personales ficticios que podés usar (edad, hobbies, gustos)
- Su estilo de comunicación (formal, casual, coqueta, directa, tierna, etc.)

## ¿Dónde encontrarlo?

> **En Discord.** Cada modelo tiene su canal o documento con su perfil completo.

## ⚠️ Es OBLIGATORIO estudiarlo

Antes de chatear con una modelo por primera vez, **debes leer su perfil completo**. No es opcional.

### ¿Por qué?
- Si un fan habitual nota un cambio drástico de personalidad → sospecha de agencia
- Si usás un tono incorrecto → el fan se desconecta
- Si ofrecés algo que la modelo no hace → problema grave

## Precios

Los precios son **iguales para todas las modelos**. No cambian según la modelo. Usá siempre la tabla oficial de precios (Módulo 1.2).

## Qué estudiar del perfil

| Aspecto | Por qué importa |
|---------|-----------------|
| Personalidad | Para mantener coherencia en el chat |
| Estilo de escritura | ¿Usa emojis? ¿Es formal? ¿Es intensa? |
| Contenido disponible | Para saber qué ofrecer al fan |
| Límites | Para no ofrecer algo que la modelo no hace |
| Datos ficticios | Para responder preguntas personales del fan |

---

📌 **Estudiar el perfil no es un "nice to have". Es parte fundamental de tu trabajo. Un chatter que no conoce a su modelo es un chatter que no vende.**'
);

-- ===================================================================
-- 7. QUIZZES — Configuración (9 quizzes, SIN preguntas)
--    Las preguntas se agregarán manualmente desde el admin panel.
-- ===================================================================
INSERT INTO lms_quizzes (module_id, passing_score, max_attempts, cooldown_minutes) VALUES
('b1100000-0000-0000-0000-000000000011', 80, 3, 1),   -- Módulo 1.1 (1 pregunta en curriculum)
('b1200000-0000-0000-0000-000000000012', 80, 3, 1),   -- Módulo 1.2 (5 preguntas en curriculum)
('b1300000-0000-0000-0000-000000000013', 80, 3, 1),   -- Módulo 1.3 (2 preguntas en curriculum)
('b2100000-0000-0000-0000-000000000021', 80, 3, 1),   -- Módulo 2.1 (6 preguntas en curriculum)
('b2200000-0000-0000-0000-000000000022', 80, 3, 1),   -- Módulo 2.2 (4 preguntas en curriculum)
('b2300000-0000-0000-0000-000000000023', 80, 3, 1),   -- Módulo 2.3 (5 preguntas en curriculum)
('b3100000-0000-0000-0000-000000000031', 80, 3, 1),   -- Módulo 3.1 (10 preguntas en curriculum)
('b3200000-0000-0000-0000-000000000032', 80, 3, 1),   -- Módulo 3.2 (6 preguntas en curriculum)
('b3300000-0000-0000-0000-000000000033', 80, 3, 1);   -- Módulo 3.3 (4 preguntas en curriculum)

COMMIT;

-- ===================================================================
-- RESUMEN DE LA MIGRACIÓN
-- ===================================================================
-- Etapas:   3 (Fundamentos, Herramientas, Ventas y Práctica)
-- Módulos:  9 (3 por etapa, order_index global 0-8)
-- Lecciones: 39 (15 texto + 24 video placeholder)
-- Quizzes:  9 (sin preguntas — agregar manualmente desde admin)
--
-- Lecciones por módulo:
--   1.1 Cultura:           1 texto
--   1.2 Normativa:         6 texto
--   1.3 Glosario:          1 texto
--   2.1 OnlyFans:          5 video + 1 texto = 6
--   2.2 OnlyMonster:       4 video + 1 texto = 5
--   2.3 Clasificación:     4 video + 1 texto = 5
--   3.1 Técnicas Venta:    9 video
--   3.2 Situaciones:       2 video + 1 texto + 1 video = 4
--   3.3 Métricas:          2 texto
--   TOTAL: 39 lecciones
--
-- Placeholders pendientes:
--   - [COMPLETAR] en lecciones de texto (datos específicos de la agencia)
--   - URLs de Loom en lecciones de video (reemplazar con videos reales)
--   - Preguntas de quiz (agregar desde admin panel)
-- ===================================================================
