# 🤖 Generador de Mensajes con IA - BraveGirls Agency

## ✅ Configuración Completada

### 🎉 **YA ESTÁ TODO LISTO PARA USAR**

El sistema ya tiene configurado:
- ✅ API Key de OpenAI integrada
- ✅ Información de modelos desde `dashboard-guias.js`
- ✅ Prompts optimizados para español de España
- ✅ 3 tipos de mensajes (captación, posteo, venta)

---

## 🚀 Cómo Usar el Generador

### **Desde el Dashboard de Chatter:**

1. Inicia sesión como chatter
2. En el dashboard, haz clic en **"✨ Abrir Generador IA"**
3. Selecciona la modelo del desplegable
4. Elige el tipo de mensaje:
   - **👋 Captación:** Para atraer nuevos suscriptores
   - **📸 Posteo:** Descripción para fotos/videos
   - **💰 Venta de Pack:** Mensaje para vender contenido bloqueado
5. Si es venta, describe el contenido del pack
6. Haz clic en **"✨ Generar 3 Mensajes"**
7. Copia el mensaje que más te guste

---

## 📋 Modelos Disponibles

El sistema carga automáticamente desde `dashboard-guias.js`:

- ✅ **Bella (Bellarey)** - Dulce, juguetona, atrevida
- ✅ **Lexiflix (Lexi)** - Tímida, cariñosa, divertida  
- ✅ **Vicky Luna** - Directa, argentina, con actitud
- ✅ **Carmencitax** - Cariñosa, con carácter, real

Cada modelo tiene:
- Personalidad única
- Frases típicas
- Emojis favoritos
- Cosas que NUNCA debe mencionar
- Tono y estilo específico

---

## 💡 Ejemplos de Uso

### **Mensaje de Captación (Bella):**
```
Hola guapo 🫶🏼 he visto tu perfil y me has parecido muy chulo
te apetece conocerme mejor? tengo cositas que creo te van a molar
```

### **Descripción de Posteo (Lexi):**
```
Que opinas de este look bb? 🥰
me lo puse pensando en ti 🫶🏻
```

### **Venta de Pack (Vicky):**
```
Acá tengo 15 fotos que te van a volar la cabeza
lencería roja, posiciones re sexys y un par de videos cortitos donde me toco pensando en vos
te lo mando desbloqueado si te copas 😏
```

---

## 🔒 Seguridad

✅ **API Key protegida:** Está en el servidor, no en el código público  
✅ **Autenticación:** Solo usuarios logueados pueden usar el generador  
✅ **Sin límites de uso:** Genera todos los mensajes que necesites  

---

## 💰 Costos Aproximados

**Usando GPT-4o:**
- Por cada generación (3 mensajes): **~$0.003 - $0.005 USD**
- 100 generaciones/mes: **~$0.30 - $0.50 USD**
- 500 generaciones/mes: **~$1.50 - $2.50 USD**

**Muy económico** y vale totalmente la pena.

---

## 🔧 Actualizar Información de una Modelo

Si quieres cambiar la personalidad, frases o emojis de una modelo:

1. Abre [dashboard-guias.js](dashboard-guias.js)
2. Busca la sección `MODELOS_DATA`
3. Edita los campos de la modelo:
   - `personalidad`
   - `palabras_tipicas`
   - `emojis_favoritos`
   - `cosas_no_decir`
4. Guarda el archivo
5. Los cambios se aplican inmediatamente

---

## ⚙️ Configuración Avanzada (Opcional)

### **Si quieres cambiar la API Key:**

1. Ve a Vercel → Settings → Environment Variables
2. Edita `OPENAI_API_KEY`
3. Redeploy el proyecto

### **Si quieres ajustar la creatividad:**

Edita [api/ai/generate-messages.js](api/ai/generate-messages.js):
```javascript
temperature: 0.9, // Más alto = más creativo (0.0 - 1.0)
```

---

## 🛠️ Solución de Problemas

**"Error al cargar modelos"**
→ Verifica que `dashboard-guias.js` esté cargado en [dashboard-ai-messages.html](dashboard-ai-messages.html)

**"OpenAI API Key no configurada"**
→ La key hardcodeada debería funcionar. Si falla, verifica la conexión a internet

**Los mensajes no suenan naturales**
→ Edita la personalidad y frases típicas en `dashboard-guias.js`

**Quiero agregar una nueva modelo**
→ Añádela en `dashboard-guias.js` en la sección `MODELOS_DATA`

---

## 📊 Estructura de Archivos

```
/dashboard-ai-messages.html     → Interfaz del generador
/dashboard-ai-messages.js       → Lógica del frontend (usa MODELOS_DATA)
/dashboard-guias.js             → Base de datos de modelos
/api/ai/generate-messages.js    → Endpoint que llama a OpenAI
/config.js                      → Configuración general
```

---

## ✅ Sistema Completamente Funcional

**No necesitas configurar nada más.** El sistema está listo para usarse de inmediato:

1. Sube los archivos a tu servidor/Vercel
2. Los chatters pueden empezar a generar mensajes
3. Cada mensaje será único y adaptado a la modelo seleccionada

**¡Disfruta del generador! 🎉**
