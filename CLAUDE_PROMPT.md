# Prompt para Claude (VS Code) — Generar web interna para chatters
Actúa como un desarrollador senior (frontend) y diseñador UI/UX.
Quiero una web interna (estática) para formación de chatters/supervisores basada en el contenido del archivo:
- manual_supervisores_navidad_2025.md

## Requisitos
- SPA estática en HTML/CSS/JS (sin backend) o Next.js si lo prefieres (pero que pueda exportarse estático).
- Diseño moderno, oscuro elegante (estilo BraveGirls), con buena tipografía y mucha legibilidad.
- Sidebar con navegación por secciones (Introducción, Partes, Principios, Checklist, Notas finales).
- Buscador (filtra por palabras dentro del contenido).
- Tarjetas (cards) por sección con: título + contenido + notas destacadas.
- Callouts para: REGLA DE ORO, INSIGHT CLAVE, OBJETIVO, ACCIÓN, IMPORTANTE.
- Incluir iconos/emojis como soporte visual.
- Debe ser responsive (móvil y desktop).

## Estructura sugerida
- /index.html
- /styles.css
- /app.js
- (Opcional) /data/manual.json (parseado desde el markdown)

## Entregables
- Código completo listo para ejecutar localmente.
- Instrucciones: cómo abrirlo (si es estático) o cómo correrlo (si es framework).
- Asegúrate de NO inventar contenido: usa exactamente el texto del markdown, sin omitirlo.
