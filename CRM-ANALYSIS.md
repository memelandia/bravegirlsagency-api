# 📊 CRM VISUAL - ANÁLISIS COMPLETO DE FUNCIONES Y CONEXIONES

**Fecha:** 31/12/2025  
**Estado:** Análisis exhaustivo completado

---

## ✅ ARQUITECTURA ACTUAL

### **Base de Datos (PostgreSQL en Neon)**
| Tabla | Campos Clave | Relaciones | Estado |
|-------|--------------|------------|--------|
| `crm_models` | handle, facturación, prioridad | ← social_accounts, assignments | ✅ OK |
| `crm_chatters` | nombre, estado, nivel, país | → assignments | ✅ OK |
| `crm_assignments` | chatter_id, model_id, horario | ↔ chatters+models | ✅ OK |
| `crm_social_accounts` | model_id, plataforma, handle | → models | ✅ OK |
| `crm_supervisors` | nombre, scope | - | ✅ OK |
| `crm_staff` | nombre, rol, modelos_asignados | - | ✅ OK |

### **API Backend (/api/crm.js)**
| Endpoint | Métodos | Estado |
|----------|---------|--------|
| `/crm?path=models` | GET, POST | ✅ OK |
| `/crm?path=models/{id}` | GET, PUT, DELETE | ✅ OK |
| `/crm?path=chatters` | GET, POST | ✅ OK |
| `/crm?path=chatters/{id}` | GET, PUT, DELETE | ✅ OK |
| `/crm?path=assignments` | GET, POST | ✅ OK |
| `/crm?path=assignments/{id}` | GET, PUT, DELETE | ✅ OK |
| `/crm?path=social-accounts` | GET, POST | ✅ OK |
| `/crm?path=social-accounts/{id}` | GET, PUT, DELETE | ✅ OK |
| `/crm?path=supervisors` | GET, POST | ✅ OK |
| `/crm?path=supervisors/{id}` | GET, PUT, DELETE | ✅ OK |
| `/crm?path=staff` | GET, POST | ✅ OK |
| `/crm?path=staff/{id}` | GET, PUT, DELETE | ✅ OK |

### **Frontend Views (crm-app.jsx)**
| Vista | Componente | Funcionalidad | Estado |
|-------|------------|---------------|--------|
| Estructura | `EstructuraView` | Mapa React Flow | ⚠️ Incompleto |
| Modelo → Redes | `ModeloRedesView` | Lista cuentas por modelo | ⚠️ Solo lectura |
| Marketing | `MarketingView` | Staff por rol | ⚠️ Sin asignaciones |
| Configuración | `ConfiguracionView` | CRUD todas entidades | ❌ Falta Assignments |

---

## 🔴 PROBLEMAS CRÍTICOS ENCONTRADOS

### **1. FALTA TAB "ASSIGNMENTS" EN CONFIGURACIÓN**
**Severidad:** 🔴 CRÍTICA  
**Descripción:**  
- La tabla `crm_assignments` existe en DB y tiene API completa
- NO hay tab en ConfiguracionView para gestionar asignaciones
- **No puedes crear/editar assignments desde la UI**

**Código actual (crm-app.jsx líneas 535-555):**
```jsx
<div className="crm-tabs">
    <div className={`crm-tab ${activeTab === 'models' ? 'active' : ''}`}>💎 Modelos</div>
    <div className={`crm-tab ${activeTab === 'chatters' ? 'active' : ''}`}>👤 Chatters</div>
    <div className={`crm-tab ${activeTab === 'social' ? 'active' : ''}`}>📱 Redes Sociales</div>
    <div className={`crm-tab ${activeTab === 'supervisors' ? 'active' : ''}`}>👔 Supervisores</div>
    <div className={`crm-tab ${activeTab === 'staff' ? 'active' : ''}`}>👥 Staff Marketing</div>
    {/* ❌ FALTA: <div className="crm-tab">🔗 Asignaciones</div> */}
</div>
```

**Impacto:**  
- No puedes asignar chatters a modelos manualmente
- Solo se ven assignments creadas previamente en DB
- La relación chatter ↔ modelo no es gestionable

**Solución:**  
Agregar tab + tabla `AssignmentsTable` + modal `AssignmentModal`

---

### **2. NODE DETAIL SIDEBAR VACÍO**
**Severidad:** 🟡 MEDIA  
**Descripción:**  
Al hacer clic en nodo del mapa (supervisor/chatter/model), sidebar muestra:
```jsx
<p>ID: {node.id}</p>
<p>Tipo: {node.className?.replace('react-flow__node-', '')}</p>
```

**Faltan:**
- Datos completos del chatter/modelo/supervisor
- Lista de asignaciones activas
- Botón para crear nueva asignación
- Métricas o estadísticas

**Impacto:**  
- Vista de estructura es solo visual, no informativa
- No puedes actuar desde el mapa (requiere ir a Configuración)

---

### **3. BÚSQUEDA EN MAPA NO FUNCIONAL**
**Severidad:** 🟡 MEDIA  
**Código actual (línea 396-402):**
```jsx
<input 
    type="text" 
    placeholder="🔍 Buscar en el mapa..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
/>
```

**Problema:**  
- Variable `searchTerm` se actualiza pero NO se usa
- No filtra nodes en `generateFlowData()`
- No resalta nodos coincidentes

**Solución:**  
Filtrar `newNodes` por nombre/handle que contenga `searchTerm`

---

### **4. ONCONNECT NO PERSISTE ASSIGNMENTS**
**Severidad:** 🔴 CRÍTICA  
**Código actual (línea 286):**
```jsx
const onConnect = useCallback((params) => 
    setEdges((eds) => addEdge(params, eds)), 
[setEdges]);
```

**Problema:**  
- Conectar chatter → modelo solo agrega edge visual
- NO llama a `CRMService.createAssignment()`
- Al recargar página, la conexión desaparece

**Comportamiento esperado:**  
1. Usuario arrastra de chatter a modelo
2. Modal aparece para confirmar horario y estado
3. Se crea assignment en DB
4. Edge queda persistido

---

### **5. MARKETING VIEW SIN FUNCIONALIDAD**
**Severidad:** 🟡 MEDIA  
**Código actual (líneas 509-541):**
```jsx
function MarketingView({ staff }) {
    // Solo muestra staff.nombre por rol
    // NO muestra modelos_asignados
    // NO permite editar asignaciones
}
```

**Faltan:**
- Mostrar modelos asignados a cada staff
- Agregar/remover modelos de staff
- Métricas de productividad
- Filtro por estado (activo/prueba/pausado)

---

### **6. MODELO → REDES VIEW SIN ACCIONES**
**Severidad:** 🟢 BAJA  
**Descripción:**  
Vista solo lectura, no permite acciones rápidas:
- Agregar red social desde aquí
- Cambiar estado de cuenta (activa/shadowban)
- Ver qué chatters usan cada cuenta

**Mejora sugerida:**  
Botones de acción rápida en cada tarjeta

---

### **7. SOCIAL ACCOUNTS DESCONECTADAS**
**Severidad:** 🟢 BAJA  
**Descripción:**  
Tabla en Configuración no muestra relación con:
- Assignments (qué chatters usan esa cuenta)
- Staff (quién gestiona el contenido)

**Mejora sugerida:**  
Columna extra con info de uso

---

### **8. STAFF.MODELOS_ASIGNADOS INERTE**
**Severidad:** 🟡 MEDIA  
**Campo DB:** `staff.modelos_asignados JSONB` → `[1, 2, 3, 4, 5, 6, 7]`

**Problema:**  
- Se guarda en DB ✅
- NO se renderiza en tabla ❌
- NO hay UI para editar ❌
- NO valida si IDs existen ❌

**Solución:**  
Agregar columna "Modelos" con chips + modal multi-select

---

## 🎯 FUNCIONES QUE FALTAN IMPLEMENTAR

### **PRIORIDAD ALTA (Bloquean funcionalidad core)**

#### 1. **AssignmentsTable + AssignmentModal**
**Ubicación:** `ConfiguracionView` → nuevo tab "🔗 Asignaciones"  
**Campos necesarios:**
```jsx
{
  chatter_id: number,  // Select de chatters
  model_id: number,     // Select de modelos
  horario: {            // JSON con días y horarios
    "L": ["09:00-17:00"],
    "M": ["09:00-17:00"]
  },
  estado: 'activa' | 'prueba' | 'reemplazo'
}
```

**Funciones:**
- `AssignmentsTable()` → Lista todas las assignments
- `AssignmentModal()` → Crear/editar assignment
- Validar que no haya duplicados (chatter+modelo)
- Mostrar warnings si chatter tiene >3 modelos

---

#### 2. **onConnect persistente**
**Ubicación:** `EstructuraView` línea 286  
**Lógica:**
```jsx
const onConnect = useCallback(async (params) => {
    // 1. Extraer chatter_id y model_id de params
    const [type1, id1] = params.source.split('-');
    const [type2, id2] = params.target.split('-');
    
    // 2. Validar que sea chatter → modelo
    if (type1 !== 'chatter' || type2 !== 'model') {
        alert('Solo puedes conectar Chatters a Modelos');
        return;
    }
    
    // 3. Mostrar modal para confirmar
    const confirmed = await showAssignmentConfirmModal(id1, id2);
    if (!confirmed) return;
    
    // 4. Crear assignment en DB
    await CRMService.createAssignment({
        chatter_id: parseInt(id1),
        model_id: parseInt(id2),
        horario: {},
        estado: 'activa'
    });
    
    // 5. Agregar edge visual
    setEdges((eds) => addEdge(params, eds));
    
    // 6. Recargar datos
    onRefresh();
}, [setEdges, onRefresh]);
```

---

#### 3. **Búsqueda funcional en mapa**
**Ubicación:** `EstructuraView` línea 283-284  
**Lógica:**
```jsx
const generateFlowData = () => {
    // ... código existente ...
    
    // AGREGAR AL FINAL:
    let filteredNodes = newNodes;
    let filteredEdges = newEdges;
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredNodes = newNodes.filter(node => {
            const label = typeof node.data.label === 'string' 
                ? node.data.label 
                : node.data.label.props.children[0].props.children || '';
            return label.toLowerCase().includes(term);
        });
        
        // Filtrar edges que conecten nodos visibles
        const visibleIds = filteredNodes.map(n => n.id);
        filteredEdges = newEdges.filter(e => 
            visibleIds.includes(e.source) && visibleIds.includes(e.target)
        );
    }
    
    setNodes(filteredNodes);
    setEdges(filteredEdges);
};
```

---

### **PRIORIDAD MEDIA (Mejoran UX)**

#### 4. **NodeDetailSidebar con datos reales**
```jsx
function NodeDetailSidebar({ node, onClose, models, chatters, supervisors, assignments }) {
    const [type, id] = node.id.split('-');
    
    let entity, relatedData;
    
    if (type === 'chatter') {
        entity = chatters.find(c => c.id === parseInt(id));
        relatedData = assignments
            .filter(a => a.chatter_id === parseInt(id))
            .map(a => models.find(m => m.id === a.model_id));
    } else if (type === 'model') {
        entity = models.find(m => m.id === parseInt(id));
        relatedData = assignments
            .filter(a => a.model_id === parseInt(id))
            .map(a => chatters.find(c => c.id === a.chatter_id));
    }
    
    return (
        <div className="node-detail-sidebar">
            <h3>{entity.nombre || entity.handle}</h3>
            {type === 'chatter' && (
                <>
                    <p>Estado: {entity.estado}</p>
                    <p>Nivel: {entity.nivel}</p>
                    <p>País: {entity.pais}</p>
                    <h4>Modelos asignados ({relatedData.length}):</h4>
                    {relatedData.map(m => <div key={m.id}>@{m.handle}</div>)}
                </>
            )}
            {type === 'model' && (
                <>
                    <p>Facturación: ${entity.estimado_facturacion_mensual}</p>
                    <p>Prioridad: {entity.prioridad}/5</p>
                    <h4>Chatters asignados ({relatedData.length}):</h4>
                    {relatedData.map(c => <div key={c.id}>{c.nombre}</div>)}
                </>
            )}
            <button onClick={() => handleNewAssignment(entity)}>
                ➕ Nueva Asignación
            </button>
        </div>
    );
}
```

---

#### 5. **MarketingView con asignaciones**
```jsx
function MarketingView({ staff, models }) {
    return (
        <div className="crm-grid">
            {staff.map(member => {
                const assignedModels = (member.modelos_asignados || [])
                    .map(id => models.find(m => m.id === id))
                    .filter(Boolean);
                
                return (
                    <div key={member.id} className="crm-card">
                        <h3>{member.nombre}</h3>
                        <span className="crm-badge">{getRolLabel(member.rol)}</span>
                        
                        <h4>Modelos ({assignedModels.length}):</h4>
                        {assignedModels.map(m => (
                            <div key={m.id}>
                                @{m.handle}
                                <span>${m.estimado_facturacion_mensual}</span>
                            </div>
                        ))}
                        
                        <button onClick={() => handleEditAssignments(member)}>
                            ✏️ Editar Modelos
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
```

---

#### 6. **Staff multi-select de modelos**
```jsx
function StaffModal({ staff, models, onClose, onSave }) {
    const [formData, setFormData] = useState({
        ...staff,
        modelos_asignados: staff?.modelos_asignados || []
    });
    
    const toggleModel = (modelId) => {
        setFormData(prev => ({
            ...prev,
            modelos_asignados: prev.modelos_asignados.includes(modelId)
                ? prev.modelos_asignados.filter(id => id !== modelId)
                : [...prev.modelos_asignados, modelId]
        }));
    };
    
    return (
        <div className="crm-modal">
            {/* ... campos existentes ... */}
            
            <div className="crm-form-group">
                <label className="crm-label">Modelos Asignados</label>
                <div className="model-selector">
                    {models.map(model => (
                        <label key={model.id}>
                            <input 
                                type="checkbox"
                                checked={formData.modelos_asignados.includes(model.id)}
                                onChange={() => toggleModel(model.id)}
                            />
                            @{model.handle}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

---

### **PRIORIDAD BAJA (Nice to have)**

- Drag & drop en mapa para reorganizar
- Métricas en dashboard (facturación total, chatters activos, etc.)
- Filtros avanzados en tablas
- Exportar datos a CSV
- Historial de cambios (audit log)

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **Fase 1: Assignments Core (CRÍTICO)**
- [ ] Crear `AssignmentsTable` component
- [ ] Crear `AssignmentModal` component
- [ ] Agregar tab en ConfiguracionView
- [ ] Validar duplicados chatter+modelo
- [ ] Mostrar warnings por sobrecarga

### **Fase 2: Mapa Interactivo**
- [ ] Implementar `onConnect` persistente
- [ ] Agregar modal de confirmación
- [ ] Implementar búsqueda funcional
- [ ] Mejorar `NodeDetailSidebar`

### **Fase 3: Marketing Enhanced**
- [ ] Mostrar modelos en MarketingView
- [ ] Multi-select en StaffModal
- [ ] Validar IDs de modelos
- [ ] Agregar botones de acción rápida

### **Fase 4: Polish**
- [ ] Agregar loading states
- [ ] Mejorar error handling
- [ ] Agregar tooltips informativos
- [ ] Optimizar renders (useMemo/useCallback)

---

## 🚀 PRÓXIMOS PASOS

1. ¿Quieres que implemente **Assignments completo** (Tabla + Modal + onConnect)?
2. ¿Prefieres primero mejorar **NodeDetailSidebar** para que sea útil?
3. ¿O empezamos con **búsqueda funcional** que es más rápido?

Dime por dónde empezamos y lo implemento ahora.
