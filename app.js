const API_URL = 'https://bodega-backend-4md3.onrender.com/api/inventory';
const AUTH_API = 'https://bodega-backend-4md3.onrender.com/api/auth';
const PEDIDOS_API = 'https://bodega-backend-4md3.onrender.com/api/pedidos';

// Estado global de la aplicación
let cart = [];
let products = [];
let currentFilter = 'all';
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let currentUser = null;
let authToken = localStorage.getItem('bodega_token');

// ✅ Inicializar la aplicación CON PANEL ADMIN
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAuth();
    initializeNavigation();
    initializeAdminPanel(); // 🆕 NUEVO: Panel admin
});

function initializeApp() {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
}

// ✅ 🆕 NUEVO: Inicializar sistema de navegación ACTUALIZADO
function initializeNavigation() {
    setupNavigationEventListeners();
}

// ✅ 🆕 NUEVO: Configurar event listeners para navegación ACTUALIZADA
function setupNavigationEventListeners() {
    // Botón Catálogo en el navbar
    const catalogoBtn = document.querySelector('[data-view="catalogo"]');
    if (catalogoBtn) {
        catalogoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllModals();
            updateActiveNavButton(this);
            showNotification('📚 Mostrando catálogo completo');
        });
    }

    // Botón Mi Perfil en el navbar
    const perfilBtn = document.getElementById('perfilBtn');
    if (perfilBtn) {
        perfilBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showPerfilModal();
            updateActiveNavButton(catalogoBtn); // Mantener Catálogo como activo
        });
    }

    // Modal de perfil - event listeners
    const perfilModal = document.getElementById('perfilModal');
    const perfilOverlay = document.getElementById('perfilOverlay');
    const closePerfilModal = document.getElementById('closePerfilModal');

    if (perfilOverlay) {
        perfilOverlay.addEventListener('click', hidePerfilModal);
    }
    if (closePerfilModal) {
        closePerfilModal.addEventListener('click', hidePerfilModal);
    }

    // Pestañas dentro del modal de perfil
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Botón login desde historial
    const loginFromPerfil = document.getElementById('loginFromPerfil');
    if (loginFromPerfil) {
        loginFromPerfil.addEventListener('click', function(e) {
            e.preventDefault();
            hidePerfilModal();
            showLoginModal();
        });
    }
}

// ✅ 🆕 NUEVO: Inicializar Panel de Administración
function initializeAdminPanel() {
    setupAdminEventListeners();
}

// ✅ 🆕 NUEVO: Configurar event listeners para panel admin
function setupAdminEventListeners() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const adminModal = document.getElementById('adminModal');
    const adminOverlay = document.getElementById('adminOverlay');
    const closeAdminModal = document.getElementById('closeAdminModal');
    const productModal = document.getElementById('productModal');
    const productModalOverlay = document.getElementById('productModalOverlay');
    const closeProductModal = document.getElementById('closeProductModal');
    const cancelProductModal = document.getElementById('cancelProductModal');

    // Botón Administrar en navbar
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', showAdminModal);
    }

    // Cerrar modal admin
    if (adminOverlay) {
        adminOverlay.addEventListener('click', hideAdminModal);
    }
    if (closeAdminModal) {
        closeAdminModal.addEventListener('click', hideAdminModal);
    }

    // Cerrar modal de producto
    if (productModalOverlay) {
        productModalOverlay.addEventListener('click', hideProductModal);
    }
    if (closeProductModal) {
        closeProductModal.addEventListener('click', hideProductModal);
    }
    if (cancelProductModal) {
        cancelProductModal.addEventListener('click', hideProductModal);
    }

    // Pestañas admin
    const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
    adminTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });

    // Botón nuevo producto
    const btnNuevoProducto = document.getElementById('btnNuevoProducto');
    if (btnNuevoProducto) {
        btnNuevoProducto.addEventListener('click', showNewProductModal);
    }

    // Formulario de producto
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // Filtros admin
    const filtroEstadoPedidos = document.getElementById('filtroEstadoPedidos');
    if (filtroEstadoPedidos) {
        filtroEstadoPedidos.addEventListener('change', loadPedidosAdmin);
    }

    const rangoReporte = document.getElementById('rangoReporte');
    if (rangoReporte) {
        rangoReporte.addEventListener('change', loadReportes);
    }

    const searchUsuarios = document.getElementById('searchUsuarios');
    if (searchUsuarios) {
        searchUsuarios.addEventListener('input', loadUsuariosAdmin);
    }
}

// ✅ 🆕 NUEVO: Mostrar modal de administración
function showAdminModal() {
    const adminModal = document.getElementById('adminModal');
    const adminOverlay = document.getElementById('adminOverlay');
    
    if (adminModal && adminOverlay) {
        adminOverlay.classList.add('active');
        adminModal.classList.add('active');
        
        // Verificar permisos de admin
        if (!currentUser || currentUser.rol !== 'admin') {
            showNotification('❌ No tienes permisos de administrador', 'error');
            hideAdminModal();
            return;
        }
        
        // Cargar datos iniciales
        switchAdminTab('productos');
    }
}

// ✅ 🆕 NUEVO: Ocultar modal de administración
function hideAdminModal() {
    const adminModal = document.getElementById('adminModal');
    const adminOverlay = document.getElementById('adminOverlay');
    
    if (adminModal && adminOverlay) {
        adminOverlay.classList.remove('active');
        adminModal.classList.remove('active');
    }
}

// ✅ 🆕 NUEVO: Mostrar modal de producto (crear/editar)
function showProductModal(product = null) {
    const productModal = document.getElementById('productModal');
    const productModalOverlay = document.getElementById('productModalOverlay');
    const productModalTitle = document.getElementById('productModalTitle');
    const productForm = document.getElementById('productForm');
    
    if (productModal && productModalOverlay) {
        productModalOverlay.classList.add('active');
        productModal.classList.add('active');
        
        // Configurar para crear o editar
        if (product) {
            productModalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
            fillProductForm(product);
        } else {
            productModalTitle.innerHTML = '<i class="fas fa-plus"></i> Nuevo Producto';
            productForm.reset();
        }
        
        // Guardar ID del producto si estamos editando
        productForm.dataset.editingId = product ? product.id : '';
    }
}

// ✅ 🆕 NUEVO: Ocultar modal de producto
function hideProductModal() {
    const productModal = document.getElementById('productModal');
    const productModalOverlay = document.getElementById('productModalOverlay');
    
    if (productModal && productModalOverlay) {
        productModalOverlay.classList.remove('active');
        productModal.classList.remove('active');
    }
}

// ✅ 🆕 NUEVO: Mostrar modal para nuevo producto
function showNewProductModal() {
    showProductModal();
}

// ✅ 🆕 NUEVO: Llenar formulario de producto
function fillProductForm(product) {
    document.getElementById('productNombre').value = product.name || '';
    document.getElementById('productDescripcion').value = product.description || '';
    document.getElementById('productPrecio').value = product.price || '';
    document.getElementById('productStock').value = product.quantity || '';
    document.getElementById('productCategoria').value = product.category || '';
    document.getElementById('productImagen').value = product.image || '';
}

// ✅ 🆕 NUEVO: Manejar envío de formulario de producto
async function handleProductSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const editingId = form.dataset.editingId;
    const isEditing = !!editingId;
    
    const productData = {
        nombre: document.getElementById('productNombre').value,
        descripcion: document.getElementById('productDescripcion').value,
        precio: parseFloat(document.getElementById('productPrecio').value),
        stock: parseInt(document.getElementById('productStock').value),
        categoria: document.getElementById('productCategoria').value,
        imagen_url: document.getElementById('productImagen').value || null
    };
    
    // Validaciones
    if (!productData.nombre || !productData.precio || !productData.stock || !productData.categoria) {
        showNotification('❌ Completa todos los campos obligatorios', 'error');
        return;
    }
    
    if (productData.precio <= 0) {
        showNotification('❌ El precio debe ser mayor a 0', 'error');
        return;
    }
    
    if (productData.stock < 0) {
        showNotification('❌ El stock no puede ser negativo', 'error');
        return;
    }
    
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        let response;
        if (isEditing) {
            // Actualizar producto existente
            response = await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(productData)
            });
        } else {
            // Crear nuevo producto
            response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(productData)
            });
        }
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`✅ Producto ${isEditing ? 'actualizado' : 'creado'} correctamente`);
            hideProductModal();
            
            // Recargar productos en admin y en el catálogo
            loadProductsAdmin();
            loadProducts(); // Recargar catálogo principal
        } else {
            const error = await response.json();
            showNotification(`❌ Error: ${error.message || 'No se pudo guardar el producto'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error guardando producto:', error);
        showNotification('❌ Error de conexión', 'error');
    } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ✅ 🆕 NUEVO: Cambiar pestañas en admin
function switchAdminTab(tabName) {
    // Actualizar botones de pestañas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.admin-tab-btn[data-tab="${tabName}"]`).classList.add('active');
    
    // Actualizar contenido de pestañas
    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Cargar datos específicos de la pestaña
    switch(tabName) {
        case 'productos':
            loadProductsAdmin();
            break;
        case 'pedidos':
            loadPedidosAdmin();
            break;
        case 'usuarios':
            loadUsuariosAdmin();
            break;
        case 'reportes':
            loadReportes();
            break;
    }
}

// ✅ 🆕 NUEVO: Cargar productos en panel admin
async function loadProductsAdmin() {
    const productsAdminList = document.getElementById('productsAdminList');
    if (!productsAdminList) return;
    
    try {
        productsAdminList.innerHTML = '<tr><td colspan="6" class="text-center">Cargando productos...</td></tr>';
        
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const data = await response.json();
        const adminProducts = data.map(product => ({
            id: product.id,
            name: product.nombre,
            description: product.descripcion,
            price: parseFloat(product.precio),
            quantity: product.stock,
            category: product.categoria,
            image: product.imagen_url
        }));
        
        if (adminProducts.length === 0) {
            productsAdminList.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos registrados</td></tr>';
            return;
        }
        
        productsAdminList.innerHTML = adminProducts.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>${escapeHtml(product.name)}</td>
                <td>${product.category}</td>
                <td>S/ ${product.price.toFixed(2)}</td>
                <td class="${product.quantity < 10 ? 'stock-bajo' : 'stock-normal'}">${product.quantity}</td>
                <td class="acciones-cell">
                    <button class="btn-primary btn-sm" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger btn-sm" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando productos admin:', error);
        productsAdminList.innerHTML = '<tr><td colspan="6" class="text-center error">Error al cargar productos</td></tr>';
    }
}

// ✅ 🆕 NUEVO: Editar producto
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        showProductModal(product);
    }
}

// ✅ 🆕 NUEVO: Eliminar producto
async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showNotification('✅ Producto eliminado correctamente');
            loadProductsAdmin();
            loadProducts(); // Actualizar catálogo principal
        } else {
            const error = await response.json();
            showNotification(`❌ Error: ${error.message || 'No se pudo eliminar el producto'}`, 'error');
        }
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showNotification('❌ Error de conexión', 'error');
    }
}

// ✅ 🆕 NUEVO: Cargar pedidos en panel admin
async function loadPedidosAdmin() {
    const pedidosAdminList = document.getElementById('pedidosAdminList');
    const filtroEstado = document.getElementById('filtroEstadoPedidos');
    
    if (!pedidosAdminList) return;
    
    try {
        pedidosAdminList.innerHTML = '<div class="loading-text">Cargando pedidos...</div>';
        
        const response = await fetch(`${PEDIDOS_API}/admin`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error al cargar pedidos');
        
        const data = await response.json();
        
        if (!data.success || !data.pedidos) {
            pedidosAdminList.innerHTML = '<div class="empty-state">No hay pedidos registrados</div>';
            return;
        }
        
        let pedidosFiltrados = data.pedidos;
        const estadoFiltro = filtroEstado ? filtroEstado.value : 'todos';
        
        if (estadoFiltro !== 'todos') {
            pedidosFiltrados = pedidosFiltrados.filter(pedido => pedido.estado === estadoFiltro);
        }
        
        if (pedidosFiltrados.length === 0) {
            pedidosAdminList.innerHTML = '<div class="empty-state">No hay pedidos con el estado seleccionado</div>';
            return;
        }
        
        pedidosAdminList.innerHTML = pedidosFiltrados.map(pedido => `
            <div class="pedido-card admin-pedido">
                <div class="pedido-header">
                    <div class="pedido-info">
                        <h4>Pedido #${pedido.id}</h4>
                        <div class="pedido-fecha">
                            ${formatFecha(pedido.fecha_creacion)}
                        </div>
                        <div class="pedido-cliente">
                            <strong>Cliente:</strong> ${pedido.usuario_nombre || 'N/A'} (${pedido.usuario_email || 'N/A'})
                        </div>
                    </div>
                    <div class="pedido-actions">
                        <div class="pedido-total">
                            S/ ${parseFloat(pedido.total).toFixed(2)}
                        </div>
                        <select class="estado-select" data-pedido-id="${pedido.id}" onchange="updatePedidoEstado(${pedido.id}, this.value)">
                            <option value="pendiente" ${pedido.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="completado" ${pedido.estado === 'completado' ? 'selected' : ''}>Completado</option>
                            <option value="cancelado" ${pedido.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                </div>
                
                <div class="pedido-items">
                    ${renderPedidoItems(pedido.detalles || pedido.items)}
                </div>
                
                ${pedido.direccion ? `
                    <div class="pedido-direccion">
                        <strong>Dirección:</strong> ${pedido.direccion}
                    </div>
                ` : ''}
                
                ${pedido.metodo_pago ? `
                    <div class="pedido-metodo-pago">
                        <strong>Método de pago:</strong> ${getMetodoPagoDisplay(pedido.metodo_pago)}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando pedidos admin:', error);
        pedidosAdminList.innerHTML = '<div class="error-state">Error al cargar pedidos</div>';
    }
}

// ✅ 🆕 NUEVO: Actualizar estado de pedido
async function updatePedidoEstado(pedidoId, nuevoEstado) {
    try {
        const response = await fetch(`${PEDIDOS_API}/${pedidoId}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (response.ok) {
            showNotification(`✅ Estado del pedido actualizado a ${getEstadoDisplay(nuevoEstado)}`);
            // Recargar la lista de pedidos
            loadPedidosAdmin();
        } else {
            const error = await response.json();
            showNotification(`❌ Error: ${error.message || 'No se pudo actualizar el estado'}`, 'error');
        }
    } catch (error) {
        console.error('Error actualizando estado:', error);
        showNotification('❌ Error de conexión', 'error');
    }
}

// ✅ 🆕 NUEVO: Cargar usuarios en panel admin
async function loadUsuariosAdmin() {
    const usuariosAdminList = document.getElementById('usuariosAdminList');
    const searchTerm = document.getElementById('searchUsuarios') ? document.getElementById('searchUsuarios').value.toLowerCase() : '';
    
    if (!usuariosAdminList) return;
    
    try {
        usuariosAdminList.innerHTML = '<tr><td colspan="6" class="text-center">Cargando usuarios...</td></tr>';
        
        // Nota: Necesitarás crear este endpoint en tu backend
        const response = await fetch(`${AUTH_API}/admin/usuarios`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Si el endpoint no existe, mostrar mensaje
            usuariosAdminList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-tools"></i>
                            <p>Función en desarrollo</p>
                            <small>El endpoint de usuarios estará disponible próximamente</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const data = await response.json();
        
        if (!data.success || !data.usuarios) {
            usuariosAdminList.innerHTML = '<tr><td colspan="6" class="text-center">No hay usuarios registrados</td></tr>';
            return;
        }
        
        let usuariosFiltrados = data.usuarios;
        
        if (searchTerm) {
            usuariosFiltrados = usuariosFiltrados.filter(usuario => 
                usuario.nombre.toLowerCase().includes(searchTerm) ||
                usuario.email.toLowerCase().includes(searchTerm)
            );
        }
        
        if (usuariosFiltrados.length === 0) {
            usuariosAdminList.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron usuarios</td></tr>';
            return;
        }
        
        usuariosAdminList.innerHTML = usuariosFiltrados.map(usuario => `
            <tr>
                <td>${usuario.id}</td>
                <td>${escapeHtml(usuario.nombre)}</td>
                <td>${usuario.email}</td>
                <td>
                    <span class="badge ${usuario.rol === 'admin' ? 'badge-admin' : 'badge-user'}">
                        ${usuario.rol === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                </td>
                <td>${formatFecha(usuario.fecha_creacion)}</td>
                <td class="acciones-cell">
                    <button class="btn-secondary btn-sm" onclick="viewUserDetails(${usuario.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando usuarios admin:', error);
        usuariosAdminList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error al cargar usuarios</p>
                        <small>Verifica que el endpoint esté disponible</small>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ✅ 🆕 NUEVO: Ver detalles de usuario (placeholder)
function viewUserDetails(userId) {
    showNotification('👤 Función de detalles de usuario en desarrollo', 'info');
}

// ✅ 🆕 NUEVO: Cargar reportes
async function loadReportes() {
    const totalVentasReporte = document.getElementById('totalVentasReporte');
    const ingresosTotales = document.getElementById('ingresosTotales');
    const totalUsuarios = document.getElementById('totalUsuarios');
    const productosVendidos = document.getElementById('productosVendidos');
    const topProductosList = document.getElementById('topProductosList');
    const ventasCategorias = document.getElementById('ventasCategorias');
    
    if (!totalVentasReporte) return;
    
    try {
        // Mostrar estado de carga
        totalVentasReporte.textContent = '...';
        ingresosTotales.textContent = 'S/ ...';
        totalUsuarios.textContent = '...';
        productosVendidos.textContent = '...';
        
        if (topProductosList) {
            topProductosList.innerHTML = '<div class="loading-text">Cargando...</div>';
        }
        if (ventasCategorias) {
            ventasCategorias.innerHTML = '<div class="loading-text">Cargando...</div>';
        }
        
        // Nota: Necesitarás crear estos endpoints en tu backend
        const response = await fetch(`${PEDIDOS_API}/admin/reportes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Si los endpoints no existen, mostrar datos de ejemplo
            showExampleReportData();
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Actualizar con datos reales
            totalVentasReporte.textContent = data.totalVentas || '0';
            ingresosTotales.textContent = `S/ ${(data.ingresosTotales || 0).toFixed(2)}`;
            totalUsuarios.textContent = data.totalUsuarios || '0';
            productosVendidos.textContent = data.productosVendidos || '0';
            
            // Top productos
            if (topProductosList && data.topProductos) {
                topProductosList.innerHTML = data.topProductos.map((producto, index) => `
                    <div class="top-producto-item">
                        <div class="top-producto-info">
                            <div class="top-producto-posicion">${index + 1}</div>
                            <div class="top-producto-nombre">${producto.nombre}</div>
                        </div>
                        <div class="top-producto-ventas">${producto.cantidad} vendidos</div>
                    </div>
                `).join('');
            }
            
            // Ventas por categoría
            if (ventasCategorias && data.ventasCategorias) {
                ventasCategorias.innerHTML = data.ventasCategorias.map(categoria => `
                    <div class="categoria-venta-item">
                        <div class="categoria-nombre">${categoria.categoria}</div>
                        <div class="categoria-monto">S/ ${categoria.total.toFixed(2)}</div>
                    </div>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error cargando reportes:', error);
        showExampleReportData();
    }
}

// ✅ 🆕 NUEVO: Mostrar datos de ejemplo para reportes
function showExampleReportData() {
    const totalVentasReporte = document.getElementById('totalVentasReporte');
    const ingresosTotales = document.getElementById('ingresosTotales');
    const totalUsuarios = document.getElementById('totalUsuarios');
    const productosVendidos = document.getElementById('productosVendidos');
    const topProductosList = document.getElementById('topProductosList');
    const ventasCategorias = document.getElementById('ventasCategorias');
    
    if (totalVentasReporte) totalVentasReporte.textContent = '24';
    if (ingresosTotales) ingresosTotales.textContent = 'S/ 1,245.50';
    if (totalUsuarios) totalUsuarios.textContent = '15';
    if (productosVendidos) productosVendidos.textContent = '89';
    
    if (topProductosList) {
        topProductosList.innerHTML = `
            <div class="top-producto-item">
                <div class="top-producto-info">
                    <div class="top-producto-posicion">1</div>
                    <div class="top-producto-nombre">Arroz Costeño</div>
                </div>
                <div class="top-producto-ventas">15 vendidos</div>
            </div>
            <div class="top-producto-item">
                <div class="top-producto-info">
                    <div class="top-producto-posicion">2</div>
                    <div class="top-producto-nombre">Aceite Primor</div>
                </div>
                <div class="top-producto-ventas">12 vendidos</div>
            </div>
            <div class="top-producto-item">
                <div class="top-producto-info">
                    <div class="top-producto-posicion">3</div>
                    <div class="top-producto-nombre">Leche Gloria</div>
                </div>
                <div class="top-producto-ventas">10 vendidos</div>
            </div>
        `;
    }
    
    if (ventasCategorias) {
        ventasCategorias.innerHTML = `
            <div class="categoria-venta-item">
                <div class="categoria-nombre">Abarrotes</div>
                <div class="categoria-monto">S/ 645.50</div>
            </div>
            <div class="categoria-venta-item">
                <div class="categoria-nombre">Lácteos</div>
                <div class="categoria-monto">S/ 320.00</div>
            </div>
            <div class="categoria-venta-item">
                <div class="categoria-nombre">Bebidas</div>
                <div class="categoria-monto">S/ 180.00</div>
            </div>
            <div class="categoria-venta-item">
                <div class="categoria-nombre">Limpieza</div>
                <div class="categoria-monto">S/ 100.00</div>
            </div>
        `;
    }
}

// ===== SISTEMA DE AUTENTICACIÓN (MANTENIDO) =====

function initializeAuth() {
    setupAuthEventListeners();
    checkExistingAuth();
}

function setupAuthEventListeners() {
    // Botones de login/registro
    const loginBtn = document.getElementById('loginBtn');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    
    if (loginBtn) loginBtn.addEventListener('click', showLoginModal);
    if (showRegister) showRegister.addEventListener('click', showRegisterModal);
    if (showLogin) showLogin.addEventListener('click', showLoginModal);
    
    // Cerrar modales
    const closeLoginModal = document.getElementById('closeLoginModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const authOverlay = document.getElementById('authOverlay');
    
    if (closeLoginModal) closeLoginModal.addEventListener('click', hideAuthModals);
    if (closeRegisterModal) closeRegisterModal.addEventListener('click', hideAuthModals);
    if (authOverlay) authOverlay.addEventListener('click', hideAuthModals);
    
    // Formularios
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    // Menú de usuario
    const userBtn = document.getElementById('userBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userBtn) userBtn.addEventListener('click', toggleUserDropdown);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        const userMenu = document.getElementById('userMenu');
        const userBtn = document.getElementById('userBtn');
        
        if (userMenu && userBtn && !userMenu.contains(e.target) && !userBtn.contains(e.target)) {
            hideUserDropdown();
        }
    });
}

async function checkExistingAuth() {
    if (authToken) {
        try {
            const response = await fetch(`${AUTH_API}/verify`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateAuthUI();
                
                // 🆕 ACTUALIZADO: Mostrar botón admin si es administrador
                updateAdminButtonVisibility();
            } else {
                localStorage.removeItem('bodega_token');
                authToken = null;
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            localStorage.removeItem('bodega_token');
            authToken = null;
        }
    }
}

// ✅ 🆕 NUEVO: Actualizar visibilidad del botón admin
function updateAdminButtonVisibility() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (adminPanelBtn) {
        if (currentUser && currentUser.rol === 'admin') {
            adminPanelBtn.style.display = 'flex';
        } else {
            adminPanelBtn.style.display = 'none';
        }
    }
}

function showLoginModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideUserDropdown();
    
    const authOverlay = document.getElementById('authOverlay');
    const loginModal = document.getElementById('loginModal');
    
    if (authOverlay) authOverlay.classList.add('active');
    if (loginModal) {
        loginModal.classList.add('active');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
    }
}

function showRegisterModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const authOverlay = document.getElementById('authOverlay');
    const registerModal = document.getElementById('registerModal');
    const loginModal = document.getElementById('loginModal');
    
    if (authOverlay) authOverlay.classList.add('active');
    if (registerModal) {
        registerModal.classList.add('active');
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.reset();
    }
    if (loginModal) loginModal.classList.remove('active');
}

function hideAuthModals() {
    const authOverlay = document.getElementById('authOverlay');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (authOverlay) authOverlay.classList.remove('active');
    if (loginModal) loginModal.classList.remove('active');
    if (registerModal) registerModal.classList.remove('active');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        showNotification('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
        
        const response = await fetch(`${AUTH_API}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('bodega_token', authToken);
            updateAuthUI();
            updateAdminButtonVisibility(); // 🆕 ACTUALIZADO
            hideAuthModals();
            showNotification(`✅ Bienvenido, ${currentUser.nombre}!`);
            
            // 🆕 ACTUALIZADO: Recargar perfil si está abierto
            if (document.getElementById('perfilModal')?.classList.contains('active')) {
                loadUserProfile();
                loadHistorialPedidos();
            }
            
        } else {
            showNotification(`❌ ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('❌ Error de conexión', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('registerNombre').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!nombre || !email || !password) {
        showNotification('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('❌ La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
        
        const response = await fetch(`${AUTH_API}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('bodega_token', authToken);
            updateAuthUI();
            updateAdminButtonVisibility(); // 🆕 ACTUALIZADO
            hideAuthModals();
            showNotification(`✅ Cuenta creada exitosamente! Bienvenido, ${currentUser.nombre}`);
        } else {
            showNotification(`❌ ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification('❌ Error de conexión', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Cuenta';
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('bodega_token');
    updateAuthUI();
    updateAdminButtonVisibility(); // 🆕 ACTUALIZADO
    hideUserDropdown();
    showNotification('👋 Sesión cerrada correctamente');
    
    // 🆕 ACTUALIZADO: Actualizar perfil si está abierto
    if (document.getElementById('perfilModal')?.classList.contains('active')) {
        showHistorialNotLogged();
    }
    
    // 🆕 ACTUALIZADO: Cerrar panel admin si está abierto
    hideAdminModal();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userName) userName.textContent = currentUser.nombre.split(' ')[0];
        if (dropdownUserName) dropdownUserName.textContent = currentUser.nombre;
        if (dropdownUserEmail) dropdownUserEmail.textContent = currentUser.email;
    } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function hideUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

// ===== SISTEMA DE PRODUCTOS Y CARRITO (MANTENIDO) =====

function setupEventListeners() {
    // Carrito moderno
    const cartToggle = document.getElementById('cartToggle');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const btnPedir = document.getElementById('btnPedir');
    
    if (cartToggle) cartToggle.addEventListener('click', toggleCart);
    if (closeCart) closeCart.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
    if (btnPedir) btnPedir.addEventListener('click', realizarPedido);
    
    // Filtros
    document.querySelectorAll('.filter-option input').forEach(radio => {
        radio.addEventListener('change', handleFilterChange);
    });

    // Búsqueda con autocompletado
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', handleSearchKeydown);
        searchInput.addEventListener('focus', handleSearchFocus);
        searchInput.addEventListener('blur', handleSearchBlur);
    }

    document.addEventListener('click', function(e) {
        const searchBar = document.querySelector('.search-bar');
        if (searchBar && !searchBar.contains(e.target)) {
            hideSuggestions();
        }
    });
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (searchTerm.length === 0) {
        hideSuggestions();
        renderProductsByCategory();
        return;
    }

    if (searchTerm.length < 2) {
        hideSuggestions();
        return;
    }

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );

    currentSuggestions = filteredProducts.slice(0, 8);
    selectedSuggestionIndex = -1;

    if (currentSuggestions.length > 0) {
        showSuggestions(currentSuggestions, searchTerm);
    } else {
        showNoSuggestions();
    }
}

function showSuggestions(suggestions, searchTerm) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    const suggestionsHTML = suggestions.map((product, index) => `
        <div class="suggestion-item" data-index="${index}" data-product-id="${product.id}">
            <div class="suggestion-icon">
                <i class="fas fa-${getProductIcon(product.category)}"></i>
            </div>
            <div class="suggestion-content">
                <div class="suggestion-name">${highlightText(product.name, searchTerm)}</div>
                <div class="suggestion-category">${product.category}</div>
            </div>
            <div class="suggestion-price">S/ ${product.price.toFixed(2)}</div>
        </div>
    `).join('');

    suggestionsContainer.innerHTML = suggestionsHTML;
    suggestionsContainer.classList.add('active');

    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            selectSuggestion(productId);
        });

        item.addEventListener('mouseenter', function() {
            selectedSuggestionIndex = parseInt(this.getAttribute('data-index'));
            updateSelectedSuggestion();
        });
    });
}

function showNoSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.innerHTML = `
        <div class="no-suggestions">
            <i class="fas fa-search"></i>
            <p>No se encontraron productos</p>
        </div>
    `;
    suggestionsContainer.classList.add('active');
}

function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.classList.remove('active');
    selectedSuggestionIndex = -1;
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function handleSearchKeydown(e) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!suggestionsContainer || !suggestionsContainer.classList.contains('active')) return;

    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
            updateSelectedSuggestion();
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
            updateSelectedSuggestion();
            break;
            
        case 'Enter':
            e.preventDefault();
            if (selectedSuggestionIndex >= 0) {
                const productId = currentSuggestions[selectedSuggestionIndex].id;
                selectSuggestion(productId);
            } else {
                performSearch();
            }
            break;
            
        case 'Escape':
            hideSuggestions();
            break;
    }
}

function updateSelectedSuggestion() {
    const suggestions = document.querySelectorAll('.suggestion-item');
    
    suggestions.forEach((suggestion, index) => {
        if (index === selectedSuggestionIndex) {
            suggestion.classList.add('selected');
            suggestion.scrollIntoView({ block: 'nearest' });
        } else {
            suggestion.classList.remove('selected');
        }
    });

    const searchInput = document.getElementById('searchInput');
    if (selectedSuggestionIndex >= 0) {
        const selectedProduct = currentSuggestions[selectedSuggestionIndex];
        searchInput.value = selectedProduct.name;
    }
}

function selectSuggestion(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        addToCart(productId);
        document.getElementById('searchInput').value = '';
        hideSuggestions();
        showNotification(`✅ ${product.name} agregado al carrito`);
    }
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm.length > 2) {
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
        
        renderSearchResults(filteredProducts);
        hideSuggestions();
    }
}

function handleSearchFocus() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm.length >= 2 && currentSuggestions.length > 0) {
        showSuggestions(currentSuggestions, searchTerm);
    }
}

function handleSearchBlur() {
    setTimeout(() => {
        hideSuggestions();
    }, 200);
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('bodega_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (error) {
            console.error('Error cargando carrito:', error);
            cart = [];
        }
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('bodega_cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error guardando carrito:', error);
    }
}

function handleFilterChange(e) {
    const filterText = e.target.nextElementSibling.textContent.toLowerCase();
    
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });
    e.target.closest('.filter-option').classList.add('active');
    
    const filterMap = {
        'todos los productos': 'all',
        'abarrotes': 'abarrotes',
        'lácteos y carnes': 'lacteos',
        'bebidas': 'bebidas',
        'limpieza': 'limpieza'
    };
    
    currentFilter = filterMap[filterText] || 'all';
    renderProductsByCategory();
}

function renderSearchResults(filteredProducts) {
    const catalogMain = document.querySelector('.catalog-main');
    
    if (filteredProducts.length === 0) {
        catalogMain.innerHTML = `
            <div class="category-section">
                <div class="category-header">
                    <h2 class="category-title">Resultados de búsqueda</h2>
                    <p class="category-description">No se encontraron productos que coincidan con tu búsqueda</p>
                </div>
            </div>
        `;
        return;
    }

    const groupedProducts = groupProductsByCategory(filteredProducts);
    
    let catalogHTML = '';
    
    Object.keys(groupedProducts).forEach(category => {
        if (groupedProducts[category].length > 0) {
            catalogHTML += `
                <div class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">${getCategoryDisplayName(category)}</h2>
                        <p class="category-description">${groupedProducts[category].length} producto(s) encontrado(s)</p>
                    </div>
                    <div class="products-grid" id="${category}Grid">
                        ${groupedProducts[category].map(product => createProductCardHTML(product)).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    catalogMain.innerHTML = catalogHTML;
    attachEventListenersToProducts();
}

async function loadProducts() {
    try {
        showLoadingState(true);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const data = await response.json();
        
        products = data.map(product => ({
            id: product.id,
            name: product.nombre,
            description: product.descripcion,
            price: parseFloat(product.precio),
            quantity: product.stock,
            category: product.categoria,
            image: product.imagen_url
        }));
        
        renderProductsByCategory();
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        showNotification('❌ Error al cargar productos', 'error');
    } finally {
        showLoadingState(false);
    }
}

function showLoadingState(show) {
    const catalogMain = document.querySelector('.catalog-main');
    if (show) {
        catalogMain.innerHTML = `
            <div class="category-section">
                <div class="category-header">
                    <h2 class="category-title">Cargando productos...</h2>
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    }
}

function renderProductsByCategory() {
    const catalogMain = document.querySelector('.catalog-main');
    
    let filteredProducts = products;
    if (currentFilter !== 'all') {
        filteredProducts = filterProductsByCategory(products, currentFilter);
    }
    
    const groupedProducts = groupProductsByCategory(filteredProducts);
    
    let catalogHTML = '';
    
    Object.keys(groupedProducts).forEach(category => {
        if (groupedProducts[category].length > 0) {
            catalogHTML += `
                <div class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">${getCategoryDisplayName(category)}</h2>
                        <p class="category-description">${getCategoryDescription(category)}</p>
                    </div>
                    <div class="products-grid" id="${category}Grid">
                        ${groupedProducts[category].slice(0, 8).map(product => createProductCardHTML(product)).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    catalogMain.innerHTML = catalogHTML;
    attachEventListenersToProducts();
}

function filterProductsByCategory(products, filter) {
    const filterMap = {
        'abarrotes': ['Granos', 'Pastas', 'Aceites'],
        'lacteos': ['Lácteos', 'Carnes'],
        'bebidas': ['Bebidas'],
        'limpieza': ['Limpieza', 'Conservas']
    };
    
    const categories = filterMap[filter] || [];
    return products.filter(product => categories.includes(product.category));
}

function groupProductsByCategory(products) {
    const grouped = {
        'abarrotes': [],
        'lacteos': [],
        'bebidas': [],
        'limpieza': []
    };
    
    products.forEach(product => {
        if (['Granos', 'Pastas', 'Aceites'].includes(product.category)) {
            grouped.abarrotes.push(product);
        } else if (['Lácteos', 'Carnes'].includes(product.category)) {
            grouped.lacteos.push(product);
        } else if (product.category === 'Bebidas') {
            grouped.bebidas.push(product);
        } else if (['Limpieza', 'Conservas'].includes(product.category)) {
            grouped.limpieza.push(product);
        }
    });
    
    return grouped;
}

function getCategoryDisplayName(categoryKey) {
    const names = {
        'abarrotes': 'Abarrotes Esenciales',
        'lacteos': 'Lácteos y Carnes Frescas',
        'bebidas': 'Bebidas y Refrescos',
        'limpieza': 'Limpieza y Hogar'
    };
    return names[categoryKey] || categoryKey;
}

function getCategoryDescription(categoryKey) {
    const descriptions = {
        'abarrotes': 'Productos básicos de la más alta calidad',
        'lacteos': 'Frescura y calidad garantizada',
        'bebidas': 'Para todos los momentos',
        'limpieza': 'Cuidado y limpieza para tu familia'
    };
    return descriptions[categoryKey] || '';
}

function createProductCardHTML(product) {
    const stockStatus = product.quantity === 0 ? 'out' : product.quantity < 10 ? 'low' : '';
    const stockText = product.quantity === 0 ? 'Sin stock' : `Stock: ${product.quantity}`;
    
    return `
        <div class="product-card-modern" data-id="${product.id}">
            <div class="product-image">
                <i class="fas fa-${getProductIcon(product.category)}"></i>
            </div>
            <div class="product-info">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-category">${product.category}</div>
                <div class="product-footer-modern">
                    <div class="product-price">S/ ${product.price.toFixed(2)}</div>
                    <div class="product-stock ${stockStatus}">${stockText}</div>
                </div>
                <button class="btn-add-cart ${product.quantity === 0 ? 'disabled' : ''}" 
                        ${product.quantity === 0 ? 'disabled' : ''}
                        data-id="${product.id}">
                    <i class="fas fa-cart-plus"></i>
                    Agregar
                </button>
            </div>
        </div>
    `;
}

function getProductIcon(category) {
    const icons = {
        'Granos': 'wheat',
        'Pastas': 'utensils',
        'Aceites': 'flask',
        'Lácteos': 'cheese',
        'Carnes': 'drumstick-bite',
        'Bebidas': 'wine-bottle',
        'Limpieza': 'spray-can',
        'Conservas': 'can'
    };
    return icons[category] || 'box';
}

function attachEventListenersToProducts() {
    document.querySelectorAll('.btn-add-cart:not(.disabled)').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) {
        showNotification('❌ Producto no encontrado', 'error');
        return;
    }

    if (product.quantity <= 0) {
        showNotification('❌ Producto sin stock', 'error');
        return;
    }

    const existingItem = cart.find(item => item.id == productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
            showNotification('❌ No hay más stock disponible', 'error');
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            category: product.category
        });
    }

    saveCartToStorage();
    updateCartUI();
    showNotification(`✅ ${product.name} agregado al carrito`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    saveCartToStorage();
    updateCartUI();
    showNotification('🗑️ Producto removido del carrito');
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id == productId);
    if (!item) return;

    const originalProduct = products.find(p => p.id == productId);
    
    if (change > 0) {
        if (item.quantity >= originalProduct.quantity) {
            showNotification('❌ No hay más stock disponible', 'error');
            return;
        }
    }

    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCartToStorage();
        updateCartUI();
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const emptyCart = document.getElementById('emptyCart');
    const btnPedir = document.getElementById('btnPedir');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    if (cart.length === 0) {
        if (cartItems) {
            cartItems.innerHTML = `
                <div id="emptyCart" class="empty-cart-modern">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Tu carrito está vacío</p>
                    <small>Agrega algunos productos</small>
                </div>
            `;
        }
        if (btnPedir) {
            btnPedir.disabled = true;
            btnPedir.classList.add('disabled');
        }
    } else {
        let cartHTML = '';
        
        cart.forEach(item => {
            cartHTML += `
                <div class="cart-item-modern">
                    <div class="cart-item-image">
                        <i class="fas fa-${getProductIcon(item.category)}"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${escapeHtml(item.name)}</div>
                        <div class="cart-item-price">S/ ${item.price.toFixed(2)} c/u</div>
                    </div>
                    <div class="cart-item-controls-modern">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (cartItems) cartItems.innerHTML = cartHTML;
        if (btnPedir) {
            btnPedir.disabled = false;
            btnPedir.classList.remove('disabled');
        }
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (totalAmount) totalAmount.textContent = `S/ ${total.toFixed(2)}`;
}

function toggleCart() {
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    if (cartPanel && overlay) {
        cartPanel.classList.toggle('active');
        overlay.classList.toggle('active');
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) mainContainer.classList.toggle('blurred');
        
        if (cartPanel.classList.contains('active')) {
            updateCartUI();
        }
    }
}

function closeCart() {
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    if (cartPanel && overlay) {
        cartPanel.classList.remove('active');
        overlay.classList.remove('active');
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) mainContainer.classList.remove('blurred');
    }
}

async function realizarPedido() {
    if (!currentUser) {
        showNotification('🔐 Por favor inicia sesión para realizar tu pedido', 'info');
        showLoginModal({ preventDefault: () => {} });
        return;
    }
    
    if (cart.length === 0) return;

    try {
        showNotification('⏳ Procesando pedido...', 'info');
        
        const btnPedir = document.getElementById('btnPedir');
        if (btnPedir) {
            btnPedir.disabled = true;
            btnPedir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const pedidoData = {
            items: cart.map(item => ({
                id: item.id,
                nombre: item.name,
                cantidad: item.quantity,
                precio: item.price
            })),
            total: total,
            direccion: "Entrega en tienda",
            metodoPago: "efectivo"
        };
        
        console.log('Enviando pedido a la API:', pedidoData);
        
        const response = await fetch(PEDIDOS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(pedidoData)
        });
        
        if (!response.ok) {
            throw new Error('Error al crear pedido en la base de datos');
        }
        
        const pedidoResult = await response.json();
        
        if (pedidoResult.success) {
            const updatePromises = cart.map(async (item) => {
                const product = products.find(p => p.id == item.id);
                const newQuantity = product.quantity - item.quantity;
                
                const updateResponse = await fetch(`${API_URL}/${item.id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        name: product.name,
                        category: product.category,
                        quantity: newQuantity,
                        price: product.price
                    })
                });
                
                if (!updateResponse.ok) throw new Error('Error actualizando producto');
                return updateResponse.json();
            });

            await Promise.all(updatePromises);
            
            const productosResumen = cart.map(item => 
                `• ${item.name} x${item.quantity} - S/ ${(item.price * item.quantity).toFixed(2)}`
            ).join('\n');
            
            setTimeout(() => {
                alert(`¡Pedido realizado con éxito!\n\nPedido #${pedidoResult.pedido.id}\nCliente: ${currentUser.nombre}\nEmail: ${currentUser.email}\n\nProductos:\n${productosResumen}\n\nTotal: S/ ${total.toFixed(2)}\n\n¡Gracias por tu compra!`);
                
                cart = [];
                localStorage.removeItem('bodega_cart');
                updateCartUI();
                closeCart();
                
                if (btnPedir) {
                    btnPedir.disabled = false;
                    btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
                }
                
                loadProducts();
                
            }, 1000);
            
        } else {
            throw new Error(pedidoResult.message || 'Error al crear pedido');
        }
        
    } catch (error) {
        console.error('Error al realizar pedido:', error);
        
        const btnPedir = document.getElementById('btnPedir');
        if (btnPedir) {
            btnPedir.disabled = false;
            btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
        }
        
        showNotification('❌ Error al procesar el pedido. Intenta nuevamente.', 'error');
    }
}

// ✅ 🆕 NUEVO: Mostrar modal de perfil
function showPerfilModal() {
    const perfilModal = document.getElementById('perfilModal');
    const perfilOverlay = document.getElementById('perfilOverlay');
    
    if (perfilModal && perfilOverlay) {
        perfilOverlay.classList.add('active');
        perfilModal.classList.add('active');
        
        // Cargar información del usuario si está autenticado
        if (currentUser) {
            loadUserProfile();
            loadHistorialPedidos();
        } else {
            showHistorialNotLogged();
        }
        
        // Activar pestaña de historial por defecto
        switchTab('historial');
    }
}

// ✅ 🆕 NUEVO: Ocultar modal de perfil
function hidePerfilModal() {
    const perfilModal = document.getElementById('perfilModal');
    const perfilOverlay = document.getElementById('perfilOverlay');
    
    if (perfilModal && perfilOverlay) {
        perfilOverlay.classList.remove('active');
        perfilModal.classList.remove('active');
    }
}

// ✅ 🆕 NUEVO: Ocultar todos los modales
function hideAllModals() {
    hideAuthModals();
    hidePerfilModal();
    hideAdminModal(); // 🆕 ACTUALIZADO
    hideProductModal(); // 🆕 ACTUALIZADO
    closeCart();
}

// ✅ 🆕 NUEVO: Cambiar pestañas en el modal de perfil
function switchTab(tabName) {
    // Actualizar botones de pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Actualizar contenido de pestañas
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    const activePane = document.getElementById(`${tabName}Tab`);
    if (activePane) activePane.classList.add('active');
    
    // Cargar datos específicos de la pestaña
    if (tabName === 'historial' && currentUser) {
        loadHistorialPedidos();
    }
}

// ✅ 🆕 NUEVO: Cargar perfil de usuario
function loadUserProfile() {
    if (!currentUser) return;
    
    const profileUserName = document.getElementById('profileUserName');
    const profileUserEmail = document.getElementById('profileUserEmail');
    
    if (profileUserName) profileUserName.textContent = currentUser.nombre;
    if (profileUserEmail) profileUserEmail.textContent = currentUser.email;
    
    // Cargar estadísticas del usuario
    loadUserStats();
}

// ✅ 🆕 NUEVO: Cargar estadísticas del usuario
async function loadUserStats() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${PEDIDOS_API}/usuario`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.pedidos) {
                const totalPedidos = data.pedidos.length;
                const totalGastado = data.pedidos.reduce((sum, pedido) => sum + parseFloat(pedido.total), 0);
                
                const totalPedidosElem = document.getElementById('totalPedidos');
                const totalGastadoElem = document.getElementById('totalGastado');
                
                if (totalPedidosElem) totalPedidosElem.textContent = totalPedidos;
                if (totalGastadoElem) totalGastadoElem.textContent = `S/ ${totalGastado.toFixed(2)}`;
            }
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// ✅ 🆕 NUEVO: Cargar historial de pedidos
async function loadHistorialPedidos() {
    const historialContent = document.getElementById('historialContent');
    const loadingElement = document.getElementById('historialLoading');
    const notLoggedElement = document.getElementById('historialNotLogged');
    const emptyElement = document.getElementById('historialEmpty');
    const pedidosList = document.getElementById('pedidosList');
    
    if (!loadingElement || !notLoggedElement || !emptyElement || !pedidosList) return;
    
    // Mostrar estado de carga
    loadingElement.style.display = 'block';
    notLoggedElement.style.display = 'none';
    emptyElement.style.display = 'none';
    pedidosList.style.display = 'none';
    
    // Verificar autenticación
    if (!currentUser) {
        loadingElement.style.display = 'none';
        notLoggedElement.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch(`${PEDIDOS_API}/usuario`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar historial');
        }
        
        const data = await response.json();
        
        // Ocultar loading
        loadingElement.style.display = 'none';
        
        if (data.success && data.pedidos && data.pedidos.length > 0) {
            // Mostrar lista de pedidos
            renderPedidosList(data.pedidos);
            pedidosList.style.display = 'block';
        } else {
            // No hay pedidos
            emptyElement.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        loadingElement.style.display = 'none';
        
        // Mostrar mensaje de error
        if (historialContent) {
            historialContent.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar el historial</h3>
                    <p>Intenta recargar la página</p>
                </div>
            `;
        }
    }
}

// ✅ 🆕 NUEVO: Mostrar estado "no logueado" en historial
function showHistorialNotLogged() {
    const loadingElement = document.getElementById('historialLoading');
    const notLoggedElement = document.getElementById('historialNotLogged');
    const emptyElement = document.getElementById('historialEmpty');
    const pedidosList = document.getElementById('pedidosList');
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (notLoggedElement) notLoggedElement.style.display = 'block';
    if (emptyElement) emptyElement.style.display = 'none';
    if (pedidosList) pedidosList.style.display = 'none';
}

// ✅ 🆕 NUEVO: Renderizar lista de pedidos
function renderPedidosList(pedidos) {
    const pedidosList = document.getElementById('pedidosList');
    if (!pedidosList) return;
    
    const pedidosHTML = pedidos.map(pedido => `
        <div class="pedido-card">
            <div class="pedido-header">
                <div class="pedido-info">
                    <h4>Pedido #${pedido.id}</h4>
                    <div class="pedido-fecha">
                        ${formatFecha(pedido.fecha_creacion)}
                    </div>
                    <div class="pedido-estado estado-${pedido.estado}">
                        ${getEstadoDisplay(pedido.estado)}
                    </div>
                </div>
                <div class="pedido-total">
                    S/ ${parseFloat(pedido.total).toFixed(2)}
                </div>
            </div>
            
            <div class="pedido-items">
                ${renderPedidoItems(pedido.detalles || pedido.items)}
            </div>
            
            ${pedido.direccion ? `
                <div class="pedido-direccion">
                    <strong>Dirección:</strong> ${pedido.direccion}
                </div>
            ` : ''}
            
            ${pedido.metodo_pago ? `
                <div class="pedido-metodo-pago">
                    <strong>Método de pago:</strong> ${getMetodoPagoDisplay(pedido.metodo_pago)}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    pedidosList.innerHTML = pedidosHTML;
}

// ✅ 🆕 NUEVO: Renderizar items de un pedido
function renderPedidoItems(items) {
    if (!items || items.length === 0) return '<p>No hay items en este pedido</p>';
    
    return items.map(item => `
        <div class="pedido-item">
            <div class="item-info">
                <div class="item-cantidad">${item.cantidad}</div>
                <div class="item-nombre">${item.producto_nombre || item.nombre}</div>
                <div class="item-precio">S/ ${parseFloat(item.precio_unitario || item.precio).toFixed(2)} c/u</div>
            </div>
            <div class="item-subtotal">
                S/ ${parseFloat(item.subtotal || (item.cantidad * (item.precio_unitario || item.precio))).toFixed(2)}
            </div>
        </div>
    `).join('');
}

// ✅ 🆕 NUEVO: Formatear fecha
function formatFecha(fechaString) {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ✅ 🆕 NUEVO: Obtener display del estado
function getEstadoDisplay(estado) {
    const estados = {
        'completado': 'Completado',
        'pendiente': 'Pendiente',
        'cancelado': 'Cancelado',
        'en_camino': 'En camino'
    };
    return estados[estado] || estado;
}

// ✅ 🆕 NUEVO: Obtener display del método de pago
function getMetodoPagoDisplay(metodo) {
    const metodos = {
        'efectivo': 'Efectivo',
        'tarjeta': 'Tarjeta',
        'transferencia': 'Transferencia'
    };
    return metodos[metodo] || metodo;
}

// ✅ 🆕 NUEVO: Actualizar botón de navegación activo
function updateActiveNavButton(activeButton) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : type === 'info' ? '#3498db' : '#27ae60'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ✅ Agregar animaciones CSS dinámicas
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .blurred {
        filter: blur(2px);
        transition: filter 0.3s ease;
    }
    
    .product-card-modern {
        animation: fadeInUp 0.5s ease forwards;
        opacity: 0;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .notification {
        animation: slideInRight 0.3s ease;
    }
    
    .estado-completado {
        background: #D1FAE5;
        color: #065F46;
    }
    
    .estado-pendiente {
        background: #FEF3C7;
        color: #92400E;
    }
    
    .estado-cancelado {
        background: #FEE2E2;
        color: #991B1B;
    }
    
    .estado-en_camino {
        background: #DBEAFE;
        color: #1E40AF;
    }
    
    .error-state {
        text-align: center;
        padding: var(--space-xl);
        color: var(--text-light);
    }
    
    .error-state i {
        font-size: 4rem;
        color: #e74c3c;
        margin-bottom: var(--space-md);
    }
    
    .error-state h3 {
        margin-bottom: var(--space-sm);
        color: var(--text-dark);
    }
    
    .pedido-direccion,
    .pedido-metodo-pago {
        margin-top: var(--space-sm);
        padding-top: var(--space-sm);
        border-top: 1px solid var(--border-light);
        font-size: 0.9rem;
        color: var(--text-light);
    }
    
    .pedido-direccion strong,
    .pedido-metodo-pago strong {
        color: var(--text-dark);
    }
    
    mark {
        background: #fef3c7;
        color: #d97706;
        padding: 0.1rem 0.2rem;
        border-radius: 2px;
        font-weight: 600;
    }
    
    /* 🆕 Estilos adicionales para admin */
    .text-center {
        text-align: center;
    }
    
    .loading-text {
        text-align: center;
        padding: 2rem;
        color: var(--text-light);
    }
    
    .badge {
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .badge-admin {
        background: #D1FAE5;
        color: #065F46;
    }
    
    .badge-user {
        background: #DBEAFE;
        color: #1E40AF;
    }
    
    .admin-pedido {
        border-left: 4px solid var(--primary);
    }
    
    .pedido-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-end;
    }
    
    .estado-select {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        background: var(--bg-white);
    }
    
    .pedido-cliente {
        font-size: 0.8rem;
        color: var(--text-light);
        margin-top: 0.25rem;
    }
    
    .stock-bajo {
        color: #DC3545;
        font-weight: 600;
    }
    
    .stock-normal {
        color: #28A745;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

function initializeProductAnimations() {
    const productCards = document.querySelectorAll('.product-card-modern');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

setTimeout(initializeProductAnimations, 100);
