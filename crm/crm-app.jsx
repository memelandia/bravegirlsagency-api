// crm-app.jsx - CRM Visual Main Application
const { useState, useEffect, useCallback } = React;
const { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, Panel } = window.ReactFlow || {};

// API Configuration
const API_BASE = window.CONFIG?.onlyMonsterApiUrl || 'https://bravegirlsagency-api.vercel.app/api';

// ============================================
// API SERVICE
// ============================================
const CRMService = {
    // Models
    getModels: () => fetch(`${API_BASE}/crm?path=models`).then(r => r.json()),
    createModel: (data) => fetch(`${API_BASE}/crm?path=models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    updateModel: (id, data) => fetch(`${API_BASE}/crm?path=models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteModel: (id) => fetch(`${API_BASE}/crm?path=models/${id}`, { method: 'DELETE' }).then(r => r.json()),
    
    // Chatters
    getChatters: () => fetch(`${API_BASE}/crm?path=chatters`).then(r => r.json()),
    createChatter: (data) => fetch(`${API_BASE}/crm?path=chatters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    updateChatter: (id, data) => fetch(`${API_BASE}/crm?path=chatters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteChatter: (id) => fetch(`${API_BASE}/crm?path=chatters/${id}`, { method: 'DELETE' }).then(r => r.json()),
    
    // Assignments
    getAssignments: () => fetch(`${API_BASE}/crm?path=assignments`).then(r => r.json()),
    createAssignment: (data) => fetch(`${API_BASE}/crm?path=assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    updateAssignment: (id, data) => fetch(`${API_BASE}/crm?path=assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteAssignment: (id) => fetch(`${API_BASE}/crm?path=assignments/${id}`, { method: 'DELETE' }).then(r => r.json()),
    
    // Social Accounts
    getSocialAccounts: () => fetch(`${API_BASE}/crm?path=social-accounts`).then(r => r.json()),
    createSocialAccount: (data) => fetch(`${API_BASE}/crm?path=social-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    updateSocialAccount: (id, data) => fetch(`${API_BASE}/crm?path=social-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteSocialAccount: (id) => fetch(`${API_BASE}/crm?path=social-accounts/${id}`, { method: 'DELETE' }).then(r => r.json()),
    
    // Supervisors
    getSupervisors: () => fetch(`${API_BASE}/crm?path=supervisors`).then(r => r.json()),
    createSupervisor: (data) => fetch(`${API_BASE}/crm?path=supervisors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    updateSupervisor: (id, data) => fetch(`${API_BASE}/crm?path=supervisors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteSupervisor: (id) => fetch(`${API_BASE}/crm?path=supervisors/${id}`, { method: 'DELETE' }).then(r => r.json()),
    
    // Staff
    getStaff: () => fetch(`${API_BASE}/crm?path=staff`).then(r => r.json()),
    createStaff: (data) => fetch(`${API_BASE}/crm?path=staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    updateStaff: (id, data) => fetch(`${API_BASE}/crm?path=staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteStaff: (id) => fetch(`${API_BASE}/crm?path=staff/${id}`, { method: 'DELETE' }).then(r => r.json()),
};

// ============================================
// MAIN APP COMPONENT
// ============================================
function CRMApp() {
    const [currentView, setCurrentView] = useState('estructura');
    const [models, setModels] = useState([]);
    const [chatters, setChatters] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [socialAccounts, setSocialAccounts] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Load all data
    useEffect(() => {
        // Ocultar loading de autenticación y mostrar app
        if (window.CRM_HIDE_LOADING) {
            window.CRM_HIDE_LOADING();
        }
        loadAllData();
    }, []);
    
    const loadAllData = async () => {
        setLoading(true);
        try {
            const [modelsData, chattersData, assignmentsData, socialData, supervisorsData, staffData] = await Promise.all([
                CRMService.getModels().catch(() => ({ data: [] })),
                CRMService.getChatters().catch(() => ({ data: [] })),
                CRMService.getAssignments().catch(() => ({ data: [] })),
                CRMService.getSocialAccounts().catch(() => ({ data: [] })),
                CRMService.getSupervisors().catch(() => ({ data: [] })),
                CRMService.getStaff().catch(() => ({ data: [] })),
            ]);
            
            setModels(modelsData.data || []);
            setChatters(chattersData.data || []);
            setAssignments(assignmentsData.data || []);
            setSocialAccounts(socialData.data || []);
            setSupervisors(supervisorsData.data || []);
            setStaff(staffData.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="crm-container">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
            <main className="crm-main">
                <Topbar currentView={currentView} onRefresh={loadAllData} />
                <div className="crm-content">
                    {loading ? (
                        <LoadingState />
                    ) : (
                        <>
                            {currentView === 'estructura' && (
                                <EstructuraView 
                                    models={models}
                                    chatters={chatters}
                                    assignments={assignments}
                                    supervisors={supervisors}
                                />
                            )}
                            {currentView === 'modelo-redes' && (
                                <ModeloRedesView models={models} socialAccounts={socialAccounts} />
                            )}
                            {currentView === 'marketing' && (
                                <MarketingView staff={staff} />
                            )}
                            {currentView === 'configuracion' && (
                                <ConfiguracionView 
                                    models={models}
                                    chatters={chatters}
                                    assignments={assignments}
                                    socialAccounts={socialAccounts}
                                    supervisors={supervisors}
                                    staff={staff}
                                    onRefresh={loadAllData}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

// ============================================
// SIDEBAR COMPONENT
// ============================================
function Sidebar({ currentView, setCurrentView }) {
    const user = window.CRM_USER;
    
    const menuItems = [
        { id: 'estructura', icon: '🗺️', label: 'Estructura' },
        { id: 'modelo-redes', icon: '📱', label: 'Modelo → Redes' },
        { id: 'marketing', icon: '📊', label: 'Marketing' },
        { id: 'configuracion', icon: '⚙️', label: 'Configuración' },
    ];
    
    return (
        <div className="crm-sidebar">
            <div className="crm-sidebar-header">
                <a href="/">
                    <img src="/assets/logo-bravegirls.png" alt="BraveGirls" className="crm-sidebar-logo" onError={(e) => e.target.style.display = 'none'} />
                </a>
                <div className="crm-sidebar-title">CRM Visual</div>
            </div>
            
            <nav className="crm-sidebar-nav">
                {menuItems.map(item => (
                    <div 
                        key={item.id}
                        className={`crm-nav-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => setCurrentView(item.id)}
                    >
                        <span className="crm-nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </nav>
            
            <div className="crm-sidebar-footer">
                <div className="crm-user-info">
                    <div className="crm-user-avatar">{user.name.charAt(0)}</div>
                    <div className="crm-user-details">
                        <div className="crm-user-name">{user.name}</div>
                        <div className="crm-user-role">{user.type}</div>
                    </div>
                </div>
                <button className="crm-logout-btn" onClick={window.CRM_LOGOUT}>
                    🚪 Cerrar Sesión
                </button>
            </div>
        </div>
    );
}

// ============================================
// TOPBAR COMPONENT
// ============================================
function Topbar({ currentView, onRefresh }) {
    const titles = {
        'estructura': 'Estructura Organizacional',
        'modelo-redes': 'Modelo → Redes Sociales',
        'marketing': 'Equipo de Marketing',
        'configuracion': 'Configuración y Datos'
    };
    
    return (
        <div className="crm-topbar">
            <h1 className="crm-topbar-title">{titles[currentView]}</h1>
            <div className="crm-topbar-actions">
                <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={onRefresh}>
                    🔄 Actualizar
                </button>
            </div>
        </div>
    );
}

// ============================================
// LOADING STATE
// ============================================
function LoadingState() {
    return (
        <div className="crm-empty-state">
            <div className="crm-empty-icon">⏳</div>
            <div className="crm-empty-text">Cargando datos...</div>
        </div>
    );
}

// ============================================
// ESTRUCTURA VIEW (Interactive Map)
// ============================================
function EstructuraView({ models, chatters, assignments, supervisors }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [pendingConnection, setPendingConnection] = useState(null);
    
    const onConnect = useCallback(async (params) => {
        // Validar que sea chatter → modelo
        const [sourceType, sourceId] = params.source.split('-');
        const [targetType, targetId] = params.target.split('-');
        
        if (sourceType !== 'chatter' || targetType !== 'model') {
            alert('⚠️ Solo puedes conectar Chatters a Modelos');
            return;
        }
        
        // Guardar conexión pendiente y mostrar modal
        setPendingConnection({
            chatter_id: parseInt(sourceId),
            model_id: parseInt(targetId),
            params: params
        });
        setShowAssignModal(true);
    }, []);
    
    const handleConfirmConnection = async (assignmentData) => {
        try {
            await CRMService.createAssignment(assignmentData);
            // Agregar edge visual
            setEdges((eds) => addEdge(pendingConnection.params, eds));
            setShowAssignModal(false);
            setPendingConnection(null);
            // Recargar datos
            window.location.reload();
        } catch (error) {
            alert('Error al crear asignación: ' + error.message);
        }
    };
    
    useEffect(() => {
        generateFlowData();
    }, [models, chatters, assignments, supervisors, searchTerm]);
    
    const generateFlowData = () => {
        const newNodes = [];
        const newEdges = [];
        let yOffset = 0;
        
        // Supervisors at top
        supervisors.forEach((sup, idx) => {
            newNodes.push({
                id: `supervisor-${sup.id}`,
                type: 'default',
                data: { label: `👔 ${sup.nombre}` },
                position: { x: 200 + (idx * 250), y: yOffset },
                className: 'react-flow__node-supervisor',
            });
        });
        
        yOffset += 150;
        
        // Group chatters by status
        const chattersByStatus = {
            activo: chatters.filter(c => c.estado === 'activo'),
            prueba: chatters.filter(c => c.estado === 'prueba'),
            pausa: chatters.filter(c => c.estado === 'pausa'),
        };
        
        let xOffset = 50;
        Object.entries(chattersByStatus).forEach(([status, group]) => {
            group.forEach((chatter, idx) => {
                newNodes.push({
                    id: `chatter-${chatter.id}`,
                    type: 'default',
                    data: { 
                        label: (
                            <div>
                                <strong>👤 {chatter.nombre}</strong>
                                <div style={{fontSize: '0.75rem', opacity: 0.7}}>{chatter.nivel}</div>
                            </div>
                        )
                    },
                    position: { x: xOffset, y: yOffset + (idx * 100) },
                    className: 'react-flow__node-chatter',
                });
            });
            xOffset += 250;
        });
        
        yOffset += Math.max(...Object.values(chattersByStatus).map(g => g.length)) * 100 + 100;
        
        // Models
        models.forEach((model, idx) => {
            newNodes.push({
                id: `model-${model.id}`,
                type: 'default',
                data: { 
                    label: (
                        <div>
                            <strong>💎 @{model.handle}</strong>
                            <div style={{fontSize: '0.7rem', opacity: 0.8}}>
                                ${model.estimado_facturacion_mensual?.toLocaleString() || 0}
                            </div>
                            <div style={{fontSize: '0.65rem'}}>
                                Prioridad: {model.prioridad}/5
                            </div>
                        </div>
                    )
                },
                position: { x: 50 + (idx * 200), y: yOffset },
                className: 'react-flow__node-model',
            });
        });
        
        // Create edges from assignments
        assignments.forEach(assignment => {
            newEdges.push({
                id: `edge-${assignment.id}`,
                source: `chatter-${assignment.chatter_id}`,
                target: `model-${assignment.model_id}`,
                label: assignment.estado,
                animated: assignment.estado === 'activa',
            });
        });
        
        // Aplicar búsqueda si existe
        let filteredNodes = newNodes;
        let filteredEdges = newEdges;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredNodes = newNodes.filter(node => {
                const label = typeof node.data.label === 'string' 
                    ? node.data.label 
                    : node.data.label?.props?.children?.[0]?.props?.children || '';
                const labelText = typeof label === 'string' ? label : '';
                return labelText.toLowerCase().includes(term);
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
    
    const onNodeClick = (event, node) => {
        setSelectedNode(node);
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <input 
                    type="text" 
                    placeholder="🔍 Buscar en el mapa..."
                    className="crm-input"
                    style={{maxWidth: '300px'}}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="crm-flex crm-gap-4">
                    <span className="crm-badge crm-badge-info">👔 Supervisores</span>
                    <span className="crm-badge crm-badge-success">👤 Chatters</span>
                    <span className="crm-badge crm-badge-warning">💎 Modelos</span>
                </div>
            </div>
            
            <div className="crm-flow-container">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    fitView
                >
                    <Controls />
                    <Background color="#e5e5e5" gap={16} />
                </ReactFlow>
            </div>
            
            {selectedNode && (
                <NodeDetailSidebar 
                    node={selectedNode} 
                    models={models}
                    chatters={chatters}
                    assignments={assignments}
                    onClose={() => setSelectedNode(null)} 
                />
            )}
            
            {showAssignModal && pendingConnection && (
                <QuickAssignModal 
                    chatter={chatters.find(c => c.id === pendingConnection.chatter_id)}
                    model={models.find(m => m.id === pendingConnection.model_id)}
                    onConfirm={handleConfirmConnection}
                    onCancel={() => { setShowAssignModal(false); setPendingConnection(null); }}
                />
            )}
        </div>
    );
}

// ============================================
// NODE DETAIL SIDEBAR
// ============================================
function NodeDetailSidebar({ node, models, chatters, assignments, onClose }) {
    const [type, id] = node.id.split('-');
    
    let entity, relatedData, relatedLabel;
    
    if (type === 'chatter') {
        entity = chatters.find(c => c.id === parseInt(id));
        relatedData = assignments
            .filter(a => a.chatter_id === parseInt(id))
            .map(a => {
                const model = models.find(m => m.id === a.model_id);
                return { ...a, _model: model };
            });
        relatedLabel = 'Modelos Asignados';
    } else if (type === 'model') {
        entity = models.find(m => m.id === parseInt(id));
        relatedData = assignments
            .filter(a => a.model_id === parseInt(id))
            .map(a => {
                const chatter = chatters.find(c => c.id === a.chatter_id);
                return { ...a, _chatter: chatter };
            });
        relatedLabel = 'Chatters Asignados';
    } else if (type === 'supervisor') {
        entity = { id: parseInt(id), nombre: node.data.label.replace('👔 ', '') };
        relatedData = [];
        relatedLabel = 'Supervisión';
    }
    
    if (!entity) {
        return (
            <div style={{
                position: 'fixed',
                right: 0,
                top: 0,
                width: '350px',
                height: '100vh',
                background: 'rgba(20, 20, 20, 0.98)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                overflowY: 'auto',
                zIndex: 100
            }}>
                <div className="crm-flex-between crm-mb-4">
                    <h3 className="crm-card-title">Entidad no encontrada</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
            </div>
        );
    }
    
    return (
        <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: '400px',
            height: '100vh',
            background: 'rgba(20, 20, 20, 0.98)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            overflowY: 'auto',
            zIndex: 100
        }}>
            <div className="crm-flex-between crm-mb-4">
                <h3 className="crm-card-title">Detalles</h3>
                <button className="crm-modal-close" onClick={onClose}>✕</button>
            </div>
            
            <div className="crm-card" style={{marginBottom: '1rem'}}>
                {type === 'chatter' && (
                    <>
                        <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>👤 {entity.nombre}</h2>
                        <div style={{display: 'grid', gap: '0.75rem'}}>
                            <div>
                                <strong>Estado:</strong>{' '}
                                <span className={`crm-badge crm-badge-${entity.estado === 'activo' ? 'success' : entity.estado === 'prueba' ? 'warning' : 'secondary'}`}>
                                    {entity.estado}
                                </span>
                            </div>
                            <div><strong>Nivel:</strong> {entity.nivel}</div>
                            <div><strong>País:</strong> {entity.pais || 'N/A'}</div>
                        </div>
                    </>
                )}
                {type === 'model' && (
                    <>
                        <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>💎 @{entity.handle}</h2>
                        <div style={{display: 'grid', gap: '0.75rem'}}>
                            <div><strong>Facturación:</strong> ${entity.estimado_facturacion_mensual?.toLocaleString() || 0}/mes</div>
                            <div>
                                <strong>Prioridad:</strong>{' '}
                                <span className="crm-badge crm-badge-info">{entity.prioridad}/5</span>
                            </div>
                        </div>
                    </>
                )}
                {type === 'supervisor' && (
                    <>
                        <h2 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>👔 {entity.nombre}</h2>
                        <p style={{color: 'rgba(255,255,255,0.7)'}}>Supervisor de toda la operación</p>
                    </>
                )}
            </div>
            
            {relatedData.length > 0 && (
                <div className="crm-card">
                    <h4 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>{relatedLabel} ({relatedData.length})</h4>
                    <div style={{display: 'grid', gap: '0.75rem'}}>
                        {relatedData.map(item => (
                            <div key={item.id} style={{
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '0.5rem',
                                borderLeft: '3px solid #8B5CF6'
                            }}>
                                <div style={{fontWeight: 600, marginBottom: '0.25rem'}}>
                                    {type === 'chatter' ? `💎 @${item._model?.handle}` : `👤 ${item._chatter?.nombre}`}
                                </div>
                                <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>
                                    Estado: <span className={`crm-badge crm-badge-${item.estado === 'activa' ? 'success' : 'warning'}`} style={{padding: '0.15rem 0.5rem', fontSize: '0.75rem'}}>
                                        {item.estado}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {relatedData.length === 0 && type !== 'supervisor' && (
                <div className="crm-card">
                    <p style={{color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem'}}>
                        Sin asignaciones activas
                    </p>
                </div>
            )}
        </div>
    );
}

// ============================================
// QUICK ASSIGN MODAL (desde mapa)
// ============================================
function QuickAssignModal({ chatter, model, onConfirm, onCancel }) {
    const [estado, setEstado] = useState('activa');
    
    const handleConfirm = () => {
        onConfirm({
            chatter_id: chatter.id,
            model_id: model.id,
            horario: {},
            estado: estado
        });
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onCancel}>
            <div className="crm-modal" style={{maxWidth: '500px'}} onClick={(e) => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">✨ Confirmar Asignación</h3>
                    <button className="crm-modal-close" onClick={onCancel}>✕</button>
                </div>
                <div className="crm-modal-body">
                    <div style={{textAlign: 'center', padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '0.75rem', marginBottom: '1.5rem'}}>
                        <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>👤 ➜ 💎</div>
                        <div style={{fontSize: '1.1rem', fontWeight: 600}}>
                            {chatter.nombre} → @{model.handle}
                        </div>
                    </div>
                    
                    <div className="crm-form-group">
                        <label className="crm-label">Estado de la asignación</label>
                        <select className="crm-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                            <option value="activa">✅ Activa</option>
                            <option value="prueba">⚠️ Prueba</option>
                            <option value="reemplazo">🔄 Reemplazo</option>
                        </select>
                    </div>
                    
                    <p style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '1rem'}}>
                        💡 Podrás configurar horarios detallados desde la pestaña "Asignaciones" en Configuración.
                    </p>
                </div>
                <div className="crm-modal-footer">
                    <button type="button" className="crm-btn crm-btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button type="button" className="crm-btn crm-btn-primary" onClick={handleConfirm}>✓ Confirmar Asignación</button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MODELO → REDES VIEW
// ============================================
function ModeloRedesView({ models, socialAccounts }) {
    return (
        <div>
            <div className="crm-mb-4">
                <p style={{color: 'rgba(255,255,255,0.7)'}}>
                    Vista de relación entre modelos y sus redes sociales
                </p>
            </div>
            
            <div className="crm-grid crm-grid-2">
                {models.map(model => {
                    const accounts = socialAccounts.filter(sa => sa.model_id === model.id);
                    return (
                        <div key={model.id} className="crm-card">
                            <div className="crm-card-header">
                                <h3 className="crm-card-title">💎 @{model.handle}</h3>
                                <span className="crm-badge crm-badge-info">{accounts.length} cuentas</span>
                            </div>
                            <div>
                                {accounts.length === 0 ? (
                                    <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem'}}>
                                        Sin redes sociales configuradas
                                    </p>
                                ) : (
                                    accounts.map(acc => (
                                        <div key={acc.id} style={{
                                            padding: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '0.5rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div className="crm-flex-between">
                                                <span style={{fontWeight: 600}}>
                                                    {acc.plataforma === 'Instagram' && '📷'}
                                                    {acc.plataforma === 'TikTok' && '🎵'}
                                                    {acc.plataforma === 'Telegram' && '✈️'}
                                                    {' @' + acc.handle}
                                                </span>
                                                <span className={`crm-badge crm-badge-${acc.estado === 'activa' ? 'success' : 'warning'}`}>
                                                    {acc.estado}
                                                </span>
                                            </div>
                                            <div style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem'}}>
                                                {acc.idioma} • {acc.nicho}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// MARKETING VIEW
// ============================================
function MarketingView({ staff }) {
    const staffByRole = {
        'EDITOR_REELS': staff.filter(s => s.rol === 'EDITOR_REELS'),
        'PROGRAMADOR_PPV': staff.filter(s => s.rol === 'PROGRAMADOR_PPV'),
        'AM_UPLOAD': staff.filter(s => s.rol === 'AM_UPLOAD'),
        'CD': staff.filter(s => s.rol === 'CD'),
    };
    
    return (
        <div>
            <div className="crm-grid crm-grid-2">
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">🎬 Editor Reels</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.EDITOR_REELS.length}</span>
                    </div>
                    {staffByRole.EDITOR_REELS.map(s => (
                        <div key={s.id} style={{padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                <strong>{s.nombre}</strong>
                                <span className={`crm-badge crm-badge-${s.estado === 'activo' ? 'success' : 'warning'}`} style={{fontSize: '0.75rem'}}>
                                    {s.estado}
                                </span>
                            </div>
                            <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>
                                {s.modelos_asignados?.length || 0} modelos asignados
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">🎞️ Programador PPV</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.PROGRAMADOR_PPV.length}</span>
                    </div>
                    {staffByRole.PROGRAMADOR_PPV.map(s => (
                        <div key={s.id} style={{padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                <strong>{s.nombre}</strong>
                                <span className={`crm-badge crm-badge-${s.estado === 'activo' ? 'success' : 'warning'}`} style={{fontSize: '0.75rem'}}>
                                    {s.estado}
                                </span>
                            </div>
                            <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>
                                {s.modelos_asignados?.length || 0} modelos asignados
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">📤 AM/Upload</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.AM_UPLOAD.length}</span>
                    </div>
                    {staffByRole.AM_UPLOAD.map(s => (
                        <div key={s.id} style={{padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                <strong>{s.nombre}</strong>
                                <span className={`crm-badge crm-badge-${s.estado === 'activo' ? 'success' : 'warning'}`} style={{fontSize: '0.75rem'}}>
                                    {s.estado}
                                </span>
                            </div>
                            <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>
                                {s.modelos_asignados?.length || 0} modelos asignados
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">🎨 Content Directors</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.CD.length}</span>
                    </div>
                    {staffByRole.CD.map(s => (
                        <div key={s.id} style={{padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                                <strong>{s.nombre}</strong>
                                <span className={`crm-badge crm-badge-${s.estado === 'activo' ? 'success' : 'warning'}`} style={{fontSize: '0.75rem'}}>
                                    {s.estado}
                                </span>
                            </div>
                            <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)'}}>
                                {s.modelos_asignados?.length || 0} modelos asignados
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// CONFIGURACION VIEW (CRUD)
// ============================================
function ConfiguracionView({ models, chatters, assignments, socialAccounts, supervisors, staff, onRefresh }) {
    const [activeTab, setActiveTab] = useState('models');
    
    return (
        <div>
            <div className="crm-tabs">
                <div className={`crm-tab ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>
                    💎 Modelos
                </div>
                <div className={`crm-tab ${activeTab === 'chatters' ? 'active' : ''}`} onClick={() => setActiveTab('chatters')}>
                    👤 Chatters
                </div>
                <div className={`crm-tab ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
                    🔗 Asignaciones
                </div>
                <div className={`crm-tab ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>
                    📱 Redes Sociales
                </div>
                <div className={`crm-tab ${activeTab === 'supervisors' ? 'active' : ''}`} onClick={() => setActiveTab('supervisors')}>
                    👔 Supervisores
                </div>
                <div className={`crm-tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
                    👥 Staff Marketing
                </div>
            </div>
            
            {activeTab === 'models' && <ModelsTable models={models} onRefresh={onRefresh} />}
            {activeTab === 'chatters' && <ChattersTable chatters={chatters} onRefresh={onRefresh} />}
            {activeTab === 'assignments' && <AssignmentsTable assignments={assignments} chatters={chatters} models={models} onRefresh={onRefresh} />}
            {activeTab === 'social' && <SocialAccountsTable socialAccounts={socialAccounts} models={models} onRefresh={onRefresh} />}
            {activeTab === 'supervisors' && <SupervisorsTable supervisors={supervisors} onRefresh={onRefresh} />}
            {activeTab === 'staff' && <StaffTable staff={staff} models={models} onRefresh={onRefresh} />}
        </div>
    );
}

// Models Table
function ModelsTable({ models, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    
    const handleEdit = (model) => {
        setEditingModel(model);
        setShowModal(true);
    };
    
    const handleDelete = async (id) => {
        if (confirm('¿Eliminar este modelo?')) {
            await CRMService.deleteModel(id);
            onRefresh();
        }
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <h2 className="crm-card-title">Modelos ({models.length})</h2>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => { setEditingModel(null); setShowModal(true); }}>
                    ➕ Nuevo Modelo
                </button>
            </div>
            
            <div className="crm-table-container">
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>Handle</th>
                            <th>Facturación Mensual</th>
                            <th>Prioridad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.map(model => (
                            <tr key={model.id}>
                                <td><strong>@{model.handle}</strong></td>
                                <td>${model.estimado_facturacion_mensual?.toLocaleString() || 0}</td>
                                <td>
                                    <span className="crm-badge crm-badge-info">{model.prioridad}/5</span>
                                </td>
                                <td>
                                    <div className="crm-table-actions">
                                        <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => handleEdit(model)}>✏️</button>
                                        <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => handleDelete(model.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showModal && <ModelModal model={editingModel} onClose={() => setShowModal(false)} onSave={onRefresh} />}
        </div>
    );
}

function ModelModal({ model, onClose, onSave }) {
    const [formData, setFormData] = useState(model || {
        handle: '',
        estimado_facturacion_mensual: 0,
        prioridad: 3
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (model) {
                await CRMService.updateModel(model.id, formData);
            } else {
                await CRMService.createModel(formData);
            }
            onSave();
            onClose();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        }
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={e => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">{model ? 'Editar' : 'Nuevo'} Modelo</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="crm-modal-body">
                        <div className="crm-form-group">
                            <label className="crm-label">Handle</label>
                            <input 
                                type="text" 
                                className="crm-input" 
                                value={formData.handle}
                                onChange={e => setFormData({...formData, handle: e.target.value})}
                                required
                            />
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Estimado Facturación Mensual ($)</label>
                            <input 
                                type="number" 
                                className="crm-input" 
                                value={formData.estimado_facturacion_mensual}
                                onChange={e => setFormData({...formData, estimado_facturacion_mensual: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Prioridad (1-5)</label>
                            <select 
                                className="crm-input" 
                                value={formData.prioridad}
                                onChange={e => setFormData({...formData, prioridad: parseInt(e.target.value)})}
                            >
                                <option value={1}>1 - Baja</option>
                                <option value={2}>2</option>
                                <option value={3}>3 - Media</option>
                                <option value={4}>4</option>
                                <option value={5}>5 - Alta</option>
                            </select>
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="crm-btn crm-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Chatters Table (Similar structure)
function ChattersTable({ chatters, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingChatter, setEditingChatter] = useState(null);
    
    const handleEdit = (chatter) => {
        setEditingChatter(chatter);
        setShowModal(true);
    };
    
    const handleDelete = async (id) => {
        if (confirm('¿Eliminar este chatter?')) {
            await CRMService.deleteChatter(id);
            onRefresh();
        }
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <h2 className="crm-card-title">💬 Chatters ({chatters.length})</h2>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => { setEditingChatter(null); setShowModal(true); }}>
                    ➕ Nuevo Chatter
                </button>
            </div>
            
            <div className="crm-table-container">
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Nivel</th>
                            <th>País</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chatters.map(chatter => (
                            <tr key={chatter.id}>
                                <td><strong>{chatter.nombre}</strong></td>
                                <td>
                                    <span className={`crm-badge ${chatter.estado === 'activo' ? 'crm-badge-success' : chatter.estado === 'prueba' ? 'crm-badge-warning' : 'crm-badge-error'}`}>
                                        {chatter.estado}
                                    </span>
                                </td>
                                <td>
                                    {chatter.nivel === 'senior' && <span className="crm-badge crm-badge-info" style={{background: 'rgba(59, 130, 246, 0.2)', color: '#93C5FD', borderColor: 'rgba(59, 130, 246, 0.4)', fontWeight: '700'}}>👑 SENIOR</span>}
                                    {chatter.nivel === 'mid' && <span className="crm-badge crm-badge-warning" style={{background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', borderColor: 'rgba(245, 158, 11, 0.4)', fontWeight: '700'}}>⭐ MID</span>}
                                    {chatter.nivel === 'junior' && <span className="crm-badge crm-badge-secondary" style={{background: 'rgba(148, 163, 184, 0.2)', color: '#CBD5E1', borderColor: 'rgba(148, 163, 184, 0.4)', fontWeight: '600'}}>🌱 JUNIOR</span>}
                                </td>
                                <td>{chatter.pais || '-'}</td>
                                <td>
                                    <div className="crm-table-actions">
                                        <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => handleEdit(chatter)}>✏️</button>
                                        <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => handleDelete(chatter.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showModal && <ChatterModal chatter={editingChatter} onClose={() => setShowModal(false)} onSave={onRefresh} />}
        </div>
    );
}

// Chatter Modal
function ChatterModal({ chatter, onClose, onSave }) {
    const [formData, setFormData] = useState(chatter || { nombre: '', estado: 'activo', nivel: 'junior', pais: '', disponibilidad: {} });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (chatter) {
            await CRMService.updateChatter(chatter.id, formData);
        } else {
            await CRMService.createChatter(formData);
        }
        onSave();
        onClose();
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">{chatter ? 'Editar Chatter' : 'Nuevo Chatter'}</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="crm-modal-body">
                        <div className="crm-form-group">
                            <label className="crm-label">Nombre *</label>
                            <input 
                                type="text" 
                                className="crm-input"
                                value={formData.nombre} 
                                onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Estado</label>
                            <select 
                                className="crm-input"
                                value={formData.estado} 
                                onChange={(e) => setFormData({...formData, estado: e.target.value})}
                            >
                                <option value="activo">Activo</option>
                                <option value="prueba">Prueba</option>
                                <option value="pausa">Pausa</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Nivel</label>
                            <select 
                                className="crm-input"
                                value={formData.nivel} 
                                onChange={(e) => setFormData({...formData, nivel: e.target.value})}
                            >
                                <option value="junior">Junior</option>
                                <option value="mid">Mid</option>
                                <option value="senior">Senior</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">País</label>
                            <input 
                                type="text" 
                                className="crm-input"
                                value={formData.pais} 
                                onChange={(e) => setFormData({...formData, pais: e.target.value})} 
                            />
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="crm-btn crm-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// SCHEDULE SELECTOR - Selector Visual de Horarios
// ============================================
function ScheduleSelector({ schedule, onChange }) {
    const days = [
        { key: 'L', label: 'Lunes' },
        { key: 'M', label: 'Martes' },
        { key: 'X', label: 'Miércoles' },
        { key: 'J', label: 'Jueves' },
        { key: 'V', label: 'Viernes' },
        { key: 'S', label: 'Sábado' },
        { key: 'D', label: 'Domingo' }
    ];
    
    const toggleDay = (dayKey) => {
        const newSchedule = {...schedule};
        if (newSchedule[dayKey]) {
            delete newSchedule[dayKey];
        } else {
            newSchedule[dayKey] = ['09:00-17:00'];
        }
        onChange(newSchedule);
    };
    
    const updateTimeRange = (dayKey, index, newRange) => {
        const newSchedule = {...schedule};
        if (!newSchedule[dayKey]) newSchedule[dayKey] = [];
        newSchedule[dayKey][index] = newRange;
        onChange(newSchedule);
    };
    
    const addTimeSlot = (dayKey) => {
        const newSchedule = {...schedule};
        if (!newSchedule[dayKey]) newSchedule[dayKey] = [];
        newSchedule[dayKey].push('18:00-22:00');
        onChange(newSchedule);
    };
    
    const removeTimeSlot = (dayKey, index) => {
        const newSchedule = {...schedule};
        newSchedule[dayKey].splice(index, 1);
        if (newSchedule[dayKey].length === 0) {
            delete newSchedule[dayKey];
        }
        onChange(newSchedule);
    };
    
    return (
        <div style={{padding: '1rem', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.1)'}}>
            {days.map(day => {
                const isActive = schedule[day.key] !== undefined;
                return (
                    <div key={day.key} style={{marginBottom: '0.75rem', padding: '0.75rem', background: isActive ? 'rgba(255, 107, 179, 0.05)' : 'rgba(255, 255, 255, 0.02)', borderRadius: '0.5rem', border: '1px solid', borderColor: isActive ? 'rgba(255, 107, 179, 0.2)' : 'rgba(148, 163, 184, 0.1)', transition: 'all 0.2s ease'}}>
                        <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: isActive ? '0.75rem' : '0'}}>
                            <input 
                                type="checkbox"
                                checked={isActive}
                                onChange={() => toggleDay(day.key)}
                                style={{width: '20px', height: '20px', cursor: 'pointer', accentColor: '#FF6BB3'}}
                            />
                            <span style={{fontWeight: isActive ? '600' : '500', color: isActive ? 'var(--crm-text-primary)' : 'var(--crm-text-secondary)', fontSize: '0.95rem'}}>{day.label}</span>
                        </label>
                        
                        {isActive && schedule[day.key]?.map((timeRange, idx) => {
                            const [start, end] = timeRange.split('-');
                            return (
                                <div key={idx} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: idx > 0 ? '0.5rem' : '0'}}>
                                    <input 
                                        type="time"
                                        value={start}
                                        onChange={(e) => updateTimeRange(day.key, idx, `${e.target.value}-${end}`)}
                                        className="crm-input"
                                        style={{flex: 1, padding: '0.5rem', fontSize: '0.9rem'}}
                                    />
                                    <span style={{color: 'var(--crm-text-secondary)'}}>→</span>
                                    <input 
                                        type="time"
                                        value={end}
                                        onChange={(e) => updateTimeRange(day.key, idx, `${start}-${e.target.value}`)}
                                        className="crm-input"
                                        style={{flex: 1, padding: '0.5rem', fontSize: '0.9rem'}}
                                    />
                                    {schedule[day.key].length > 1 && (
                                        <button 
                                            type="button"
                                            onClick={() => removeTimeSlot(day.key, idx)}
                                            className="crm-btn crm-btn-danger crm-btn-sm"
                                            style={{padding: '0.4rem 0.6rem', fontSize: '0.8rem'}}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        
                        {isActive && (
                            <button 
                                type="button"
                                onClick={() => addTimeSlot(day.key)}
                                className="crm-btn crm-btn-secondary crm-btn-sm"
                                style={{marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.75rem'}}
                            >
                                ➕ Agregar horario
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// ASSIGNMENTS TABLE
// ============================================
function AssignmentsTable({ assignments, chatters, models, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    
    const handleDelete = async (id) => {
        if (confirm('¿Eliminar esta asignación?')) {
            await CRMService.deleteAssignment(id);
            onRefresh();
        }
    };
    
    const getChatterName = (chatterId) => {
        const chatter = chatters.find(c => c.id === chatterId);
        return chatter ? chatter.nombre : 'N/A';
    };
    
    const getModelHandle = (modelId) => {
        const model = models.find(m => m.id === modelId);
        return model ? `@${model.handle}` : 'N/A';
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <h2 className="crm-card-title">Asignaciones Chatter ↔ Modelo ({assignments.length})</h2>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => { setEditingAssignment(null); setShowModal(true); }}>
                    ➕ Nueva Asignación
                </button>
            </div>
            
            <div className="crm-table-container">
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>Chatter</th>
                            <th>Modelo</th>
                            <th>Estado</th>
                            <th>Horario</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assignments.map(assignment => (
                            <tr key={assignment.id}>
                                <td><strong>{getChatterName(assignment.chatter_id)}</strong></td>
                                <td><strong>{getModelHandle(assignment.model_id)}</strong></td>
                                <td>
                                    <span className={`crm-badge ${assignment.estado === 'activa' ? 'crm-badge-success' : assignment.estado === 'prueba' ? 'crm-badge-warning' : 'crm-badge-info'}`}>
                                        {assignment.estado}
                                    </span>
                                </td>
                                <td style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)'}}>
                                    {assignment.horario && Object.keys(assignment.horario).length > 0 
                                        ? `${Object.keys(assignment.horario).length} días` 
                                        : 'Sin horario'}
                                </td>
                                <td>
                                    <div className="crm-table-actions">
                                        <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => { setEditingAssignment(assignment); setShowModal(true); }}>✏️</button>
                                        <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => handleDelete(assignment.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showModal && <AssignmentModal assignment={editingAssignment} chatters={chatters} models={models} onClose={() => setShowModal(false)} onSave={onRefresh} />}
        </div>
    );
}

function AssignmentModal({ assignment, chatters, models, onClose, onSave }) {
    const [formData, setFormData] = useState(assignment || { 
        chatter_id: chatters[0]?.id || '', 
        model_id: models[0]?.id || '', 
        horario: {}, 
        estado: 'activa' 
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validar duplicados
        if (!assignment) {
            const exists = await CRMService.getAssignments();
            const duplicate = exists.data?.find(a => 
                a.chatter_id === parseInt(formData.chatter_id) && 
                a.model_id === parseInt(formData.model_id)
            );
            if (duplicate) {
                alert('⚠️ Esta asignación ya existe. Un chatter no puede estar asignado dos veces al mismo modelo.');
                return;
            }
        }
        
        if (assignment) {
            await CRMService.updateAssignment(assignment.id, formData);
        } else {
            await CRMService.createAssignment(formData);
        }
        onSave();
        onClose();
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">{assignment ? 'Editar Asignación' : 'Nueva Asignación'}</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="crm-modal-body">
                        <div className="crm-form-group">
                            <label className="crm-label">Chatter *</label>
                            <select className="crm-input" value={formData.chatter_id} onChange={(e) => setFormData({...formData, chatter_id: parseInt(e.target.value)})} required>
                                {chatters.map(chatter => (
                                    <option key={chatter.id} value={chatter.id}>{chatter.nombre} ({chatter.nivel})</option>
                                ))}
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Modelo *</label>
                            <select className="crm-input" value={formData.model_id} onChange={(e) => setFormData({...formData, model_id: parseInt(e.target.value)})} required>
                                {models.map(model => (
                                    <option key={model.id} value={model.id}>@{model.handle} (Prioridad: {model.prioridad})</option>
                                ))}
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Estado</label>
                            <select className="crm-input" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                                <option value="activa">Activa</option>
                                <option value="prueba">Prueba</option>
                                <option value="reemplazo">Reemplazo</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Horario Semanal</label>
                            <ScheduleSelector 
                                schedule={formData.horario || {}} 
                                onChange={(newSchedule) => setFormData({...formData, horario: newSchedule})}
                            />
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="crm-btn crm-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Social Accounts Table
function SocialAccountsTable({ socialAccounts, models, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    
    const handleDelete = async (id) => {
        if (confirm('¿Eliminar esta red social?')) {
            await CRMService.deleteSocialAccount(id);
            onRefresh();
        }
    };
    
    const getModelHandle = (modelId) => {
        const model = models.find(m => m.id === modelId);
        return model ? `@${model.handle}` : 'N/A';
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <h2 className="crm-card-title">Redes Sociales ({socialAccounts.length})</h2>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => { setEditingAccount(null); setShowModal(true); }}>
                    ➕ Nueva Red Social
                </button>
            </div>
            
            <div className="crm-table-container">
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>Modelo</th>
                            <th>Plataforma</th>
                            <th>Handle</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {socialAccounts.map(account => (
                            <tr key={account.id}>
                                <td>{getModelHandle(account.model_id)}</td>
                                <td>
                                    <span className="crm-badge crm-badge-info">
                                        {account.plataforma === 'OnlyFans' && '🔞'}
                                        {account.plataforma === 'Fansly' && '💜'}
                                        {account.plataforma === 'Instagram' && '📸'}
                                        {account.plataforma === 'TikTok' && '🎵'}
                                        {account.plataforma === 'Telegram' && '✈️'}
                                        {' '}{account.plataforma}
                                    </span>
                                </td>
                                <td><strong>{account.handle}</strong></td>
                                <td>
                                    <span className={`crm-badge ${account.estado === 'activa' ? 'crm-badge-success' : 'crm-badge-warning'}`}>
                                        {account.estado}
                                    </span>
                                </td>
                                <td>
                                    <div className="crm-table-actions">
                                        <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => { setEditingAccount(account); setShowModal(true); }}>✏️</button>
                                        <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => handleDelete(account.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showModal && <SocialAccountModal account={editingAccount} models={models} onClose={() => setShowModal(false)} onSave={onRefresh} />}
        </div>
    );
}

function SocialAccountModal({ account, models, onClose, onSave }) {
    const [formData, setFormData] = useState(account || { 
        model_id: models[0]?.id || '', 
        plataforma: 'Instagram', 
        handle: '', 
        idioma: '', 
        nicho: '', 
        verticales: [], 
        estado: 'activa', 
        link_principal: '' 
    });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (account) {
            await CRMService.updateSocialAccount(account.id, formData);
        } else {
            await CRMService.createSocialAccount(formData);
        }
        onSave();
        onClose();
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">{account ? 'Editar Red Social' : 'Nueva Red Social'}</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="crm-modal-body">
                        <div className="crm-form-group">
                            <label className="crm-label">Modelo *</label>
                            <select className="crm-input" value={formData.model_id} onChange={(e) => setFormData({...formData, model_id: parseInt(e.target.value)})} required>
                                {models.map(model => (
                                    <option key={model.id} value={model.id}>@{model.handle}</option>
                                ))}
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Plataforma *</label>
                            <select className="crm-input" value={formData.plataforma} onChange={(e) => setFormData({...formData, plataforma: e.target.value})} required>
                                <option value="OnlyFans">🔞 OnlyFans</option>
                                <option value="Fansly">💜 Fansly</option>
                                <option value="Instagram">📸 Instagram</option>
                                <option value="TikTok">🎵 TikTok</option>
                                <option value="Telegram">✈️ Telegram</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Handle *</label>
                            <input className="crm-input" type="text" value={formData.handle} onChange={(e) => setFormData({...formData, handle: e.target.value})} required placeholder="@username" />
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Estado</label>
                            <select className="crm-input" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                                <option value="activa">Activa</option>
                                <option value="warming">Warming</option>
                                <option value="shadowban">Shadowban</option>
                                <option value="pausada">Pausada</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Link Principal</label>
                            <input className="crm-input" type="url" value={formData.link_principal} onChange={(e) => setFormData({...formData, link_principal: e.target.value})} placeholder="https://..." />
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="crm-btn crm-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Supervisors Table
function SupervisorsTable({ supervisors, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingSupervisor, setEditingSupervisor] = useState(null);
    
    const handleDelete = async (id) => {
        if (confirm('¿Eliminar este supervisor?')) {
            await CRMService.deleteSupervisor(id);
            onRefresh();
        }
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <h2 className="crm-card-title">🔍 Supervisores ({supervisors.length})</h2>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => { setEditingSupervisor(null); setShowModal(true); }}>
                    ➕ Nuevo Supervisor
                </button>
            </div>
            
            <div className="crm-table-container">
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Scope</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {supervisors.map(supervisor => (
                            <tr key={supervisor.id}>
                                <td><strong>{supervisor.nombre}</strong></td>
                                <td>{supervisor.scope?.type || 'todos'}</td>
                                <td>
                                    <div className="crm-table-actions">
                                        <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => { setEditingSupervisor(supervisor); setShowModal(true); }}>✏️</button>
                                        <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => handleDelete(supervisor.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showModal && <SupervisorModal supervisor={editingSupervisor} onClose={() => setShowModal(false)} onSave={onRefresh} />}
        </div>
    );
}

function SupervisorModal({ supervisor, onClose, onSave }) {
    const [formData, setFormData] = useState(supervisor || { nombre: '', scope: {type: 'todos'} });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (supervisor) {
            await CRMService.updateSupervisor(supervisor.id, formData);
        } else {
            await CRMService.createSupervisor(formData);
        }
        onSave();
        onClose();
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">{supervisor ? 'Editar Supervisor' : 'Nuevo Supervisor'}</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="crm-modal-body">
                        <div className="crm-form-group">
                            <label className="crm-label">Nombre *</label>
                            <input className="crm-input" type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="crm-btn crm-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Staff Table
function StaffTable({ staff, models, onRefresh }) {
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    
    const handleDelete = async (id) => {
        if (confirm('¿Eliminar este miembro del staff?')) {
            await CRMService.deleteStaff(id);
            onRefresh();
        }
    };
    
    const getRolLabel = (rol) => {
        const labels = {
            'CD': '🎨 Director Creativo',
            'EDITOR_REELS': '🎬 Editor Reels',
            'PROGRAMADOR_PPV': '🎞️ Programador PPV',
            'AM_UPLOAD': '📤 Account Manager'
        };
        return labels[rol] || rol;
    };
    
    return (
        <div>
            <div className="crm-flex-between crm-mb-4">
                <h2 className="crm-card-title">Staff Marketing ({staff.length})</h2>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => { setEditingStaff(null); setShowModal(true); }}>
                    ➕ Nuevo Staff
                </button>
            </div>
            
            <div className="crm-table-container">
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(member => (
                            <tr key={member.id}>
                                <td><strong>{member.nombre}</strong></td>
                                <td>{getRolLabel(member.rol)}</td>
                                <td>
                                    <span className={`crm-badge ${member.estado === 'activo' ? 'crm-badge-success' : 'crm-badge-warning'}`}>
                                        {member.estado}
                                    </span>
                                </td>
                                <td>
                                    <div className="crm-table-actions">
                                        <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={() => { setEditingStaff(member); setShowModal(true); }}>✏️</button>
                                        <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => handleDelete(member.id)}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {showModal && <StaffModal staff={editingStaff} models={models} onClose={() => setShowModal(false)} onSave={onRefresh} />}
        </div>
    );
}

function StaffModal({ staff, models, onClose, onSave }) {
    const [formData, setFormData] = useState(staff || { nombre: '', rol: 'AM_UPLOAD', estado: 'activo', modelos_asignados: [] });
    
    const toggleModel = (modelId) => {
        const current = formData.modelos_asignados || [];
        setFormData({
            ...formData,
            modelos_asignados: current.includes(modelId)
                ? current.filter(id => id !== modelId)
                : [...current, modelId]
        });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (staff) {
            await CRMService.updateStaff(staff.id, formData);
        } else {
            await CRMService.createStaff(formData);
        }
        onSave();
        onClose();
    };
    
    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="crm-modal-header">
                    <h3 className="crm-modal-title">{staff ? 'Editar Staff' : 'Nuevo Staff'}</h3>
                    <button className="crm-modal-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="crm-modal-body">
                        <div className="crm-form-group">
                            <label className="crm-label">Nombre *</label>
                            <input className="crm-input" type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Rol</label>
                            <select className="crm-input" value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})}>
                                <option value="CD">🎨 Director Creativo</option>
                                <option value="EDITOR_REELS">🎬 Editor Reels</option>
                                <option value="PROGRAMADOR_PPV">🎞️ Programador PPV</option>
                                <option value="AM_UPLOAD">📤 Account Manager</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Estado</label>
                            <select className="crm-input" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                                <option value="activo">Activo</option>
                                <option value="prueba">Prueba</option>
                                <option value="pausado">Pausado</option>
                            </select>
                        </div>
                        <div className="crm-form-group">
                            <label className="crm-label">Modelos Asignados ({(formData.modelos_asignados || []).length}/{models.length})</label>
                            <div style={{display: 'grid', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem'}}>
                                {models.map(model => (
                                    <label key={model.id} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.25rem', background: (formData.modelos_asignados || []).includes(model.id) ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}}>
                                        <input 
                                            type="checkbox"
                                            checked={(formData.modelos_asignados || []).includes(model.id)}
                                            onChange={() => toggleModel(model.id)}
                                            style={{width: '18px', height: '18px'}}
                                        />
                                        <span>💎 @{model.handle}</span>
                                        <span className="crm-badge crm-badge-info" style={{marginLeft: 'auto', fontSize: '0.7rem'}}>P{model.prioridad}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn crm-btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="crm-btn crm-btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// RENDER APP
// ============================================
const root = ReactDOM.createRoot(document.getElementById('crm-app'));
root.render(<CRMApp />);
