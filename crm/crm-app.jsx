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
    
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
    
    useEffect(() => {
        generateFlowData();
    }, [models, chatters, assignments, supervisors]);
    
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
        
        setNodes(newNodes);
        setEdges(newEdges);
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
                    <Background color="#333" gap={16} />
                </ReactFlow>
            </div>
            
            {selectedNode && (
                <NodeDetailSidebar node={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
        </div>
    );
}

// ============================================
// NODE DETAIL SIDEBAR
// ============================================
function NodeDetailSidebar({ node, onClose }) {
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
                <h3 className="crm-card-title">Detalles</h3>
                <button className="crm-modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="crm-card">
                <p style={{color: 'rgba(255,255,255,0.7)'}}>
                    ID: {node.id}
                </p>
                <p style={{marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)'}}>
                    Tipo: {node.className?.replace('react-flow__node-', '') || 'N/A'}
                </p>
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
        'VA_EDITOR': staff.filter(s => s.rol === 'VA_EDITOR'),
        'AM_UPLOAD': staff.filter(s => s.rol === 'AM_UPLOAD'),
        'CD': staff.filter(s => s.rol === 'CD'),
    };
    
    return (
        <div>
            <div className="crm-grid crm-grid-2">
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">🎬 VA/Editores</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.VA_EDITOR.length}</span>
                    </div>
                    {staffByRole.VA_EDITOR.map(s => (
                        <div key={s.id} style={{padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            {s.nombre}
                        </div>
                    ))}
                </div>
                
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">📤 AM/Upload</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.AM_UPLOAD.length}</span>
                    </div>
                    {staffByRole.AM_UPLOAD.map(s => (
                        <div key={s.id} style={{padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            {s.nombre}
                        </div>
                    ))}
                </div>
                
                <div className="crm-card">
                    <div className="crm-card-header">
                        <h3 className="crm-card-title">🎨 Content Directors</h3>
                        <span className="crm-badge crm-badge-info">{staffByRole.CD.length}</span>
                    </div>
                    {staffByRole.CD.map(s => (
                        <div key={s.id} style={{padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                            {s.nombre}
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
function ConfiguracionView({ models, chatters, socialAccounts, supervisors, staff, onRefresh }) {
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
            {activeTab === 'social' && <SocialAccountsTable socialAccounts={socialAccounts} models={models} onRefresh={onRefresh} />}
            {activeTab === 'supervisors' && <SupervisorsTable supervisors={supervisors} onRefresh={onRefresh} />}
            {activeTab === 'staff' && <StaffTable staff={staff} onRefresh={onRefresh} />}
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
                                className="crm-select" 
                                value={formData.prioridad}
                                onChange={e => setFormData({...formData, prioridad: parseInt(e.target.value)})}
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                                <option value={5}>5</option>
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
    return (
        <div className="crm-empty-state">
            <div className="crm-empty-icon">👤</div>
            <div className="crm-empty-text">Tabla de Chatters - Similar a Modelos</div>
            <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem'}}>
                Implementar CRUD completo con campos: nombre, estado, nivel, país, disponibilidad
            </p>
        </div>
    );
}

// Social Accounts Table
function SocialAccountsTable({ socialAccounts, models, onRefresh }) {
    return (
        <div className="crm-empty-state">
            <div className="crm-empty-icon">📱</div>
            <div className="crm-empty-text">Tabla de Redes Sociales - Similar a Modelos</div>
            <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem'}}>
                Implementar CRUD con: model_id, plataforma, handle, idioma, nicho, verticales, estado, link_principal
            </p>
        </div>
    );
}

// Supervisors Table
function SupervisorsTable({ supervisors, onRefresh }) {
    return (
        <div className="crm-empty-state">
            <div className="crm-empty-icon">👔</div>
            <div className="crm-empty-text">Tabla de Supervisores</div>
        </div>
    );
}

// Staff Table
function StaffTable({ staff, onRefresh }) {
    return (
        <div className="crm-empty-state">
            <div className="crm-empty-icon">👥</div>
            <div className="crm-empty-text">Tabla de Staff Marketing</div>
        </div>
    );
}

// ============================================
// RENDER APP
// ============================================
const root = ReactDOM.createRoot(document.getElementById('crm-app'));
root.render(<CRMApp />);
