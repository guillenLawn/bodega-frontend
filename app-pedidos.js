// ===== SISTEMA DE NAVEGACIÓN =====
function initializeNavigation() {
    setupNavigationEventListeners();
    
    // 🔧 RECUPERAR VISTA GUARDADA AL INICIAR
    const savedView = localStorage.getItem('bodega_current_view') || 'catalogo';
    showView(savedView);
}

function setupNavigationEventListeners() {
    // Navegación desde el menú desplegable "Cuenta"
    document.querySelectorAll('.dropdown-item[data-view]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            showView(view);
            hideUserDropdown();
        });
    });

    // Botones "Volver al Catálogo"
    document.querySelectorAll('.btn-back-catalog').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view') || 'catalogo';
            showView(view);
        });
    });

    // Botón login desde historial
    document.getElementById('loginFromHistorial')?.addEventListener('click', function(e) {
        e.preventDefault();
        showLoginModal();
    });

    // 🔧 Navegación específica para admin
    document.querySelectorAll('.admin-option[data-view]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            showView(view);
            hideUserDropdown();
        });
    });
}

function showView(viewName) {
    console.log('Cambiando a vista:', viewName);
    
    // 🔧 GUARDAR VISTA ACTUAL EN LOCALSTORAGE
    localStorage.setItem('bodega_current_view', viewName);
    
    // Ocultar todas las vistas
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.remove('active');
    });
    
    // Mostrar vista seleccionada
    const targetView = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (targetView) {
        targetView.classList.add('active');
        currentView = viewName;
        
        // Acciones específicas por vista
        switch(viewName) {
            case 'historial':
                loadHistorialPedidos();
                break;
            case 'catalogo':
                document.getElementById('filtersSidebar').style.display = 'block';
                break;
            case 'admin':
                initializeAdminView();
                break;
        }
        
        // Ajustar layout según la vista
        adjustLayoutForView(viewName);
    }
}

function adjustLayoutForView(viewName) {
    const mainContainer = document.querySelector('.main-container');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (viewName === 'catalogo') {
        mainContainer.style.gridTemplateColumns = '280px 1fr';
        filtersSidebar.style.display = 'block';
        
        // 🔧 Mostrar elementos de usuario normal
        document.getElementById('searchBar').style.display = 'flex';
        document.getElementById('cartToggle').style.display = 'flex';
        
    } else if (viewName === 'admin') {
        mainContainer.style.gridTemplateColumns = '1fr';
        filtersSidebar.style.display = 'none';
        
        // 🔧 Ocultar elementos de usuario normal en modo admin
        document.getElementById('searchBar').style.display = 'none';
        document.getElementById('cartToggle').style.display = 'none';
        
    } else {
        mainContainer.style.gridTemplateColumns = '1fr';
        filtersSidebar.style.display = 'none';
        
        // Mostrar elementos de usuario normal
        document.getElementById('searchBar').style.display = 'flex';
        document.getElementById('cartToggle').style.display = 'flex';
    }
}

// ===== 🔧 VISTA DE ADMINISTRADOR MEJORADA =====
function initializeAdminView() {
    console.log('🔧 Inicializando vista admin...', { currentUser, isAdminMode });
    
    // 🔧 CORREGIDO: Solo verificar permisos, NO redirigir automáticamente
    if (!currentUser || currentUser.role !== 'admin') {
        console.warn('❌ Usuario no autorizado para panel admin:', currentUser);
        showNotification('🔐 No tienes permisos de administrador', 'error');
        return;
    }
    
    console.log('✅ Usuario autorizado, cargando panel admin...');
    
    // 🔧 CAMBIO: MOSTRAR DIRECTAMENTE EL PANEL COMPLETO
    showAdminPanelDirectly();
    
    // 🔧 FINALMENTE cargar datos
    loadAdminWelcomeStats();
    initializeAdminTabs();
}

// 🔧 FUNCIÓN NUEVA: Mostrar panel completo directamente
function showAdminPanelDirectly() {
    console.log('🚀 Mostrando panel completo directamente...');
    
    const adminWelcome = document.getElementById('adminWelcome');
    const adminPanelFull = document.getElementById('adminPanelFull');
    
    if (adminWelcome && adminPanelFull) {
        // 🔧 FORZAR OCULTAR pantalla de bienvenida
        adminWelcome.style.display = 'none';
        adminWelcome.style.opacity = '0';
        
        // 🔧 FORZAR MOSTRAR panel completo
        adminPanelFull.style.display = 'block';
        adminPanelFull.style.opacity = '1';
        adminPanelFull.style.transform = 'translateY(0)';
        adminPanelFull.style.visibility = 'visible';
        
        // Cargar datos del panel completo
        loadAdminProducts();
        loadAdminOrders();
        updateAdminStats();
        
        console.log('✅ Panel completo mostrado directamente');
        
        // 🔧 EJECUTAR TAMBIÉN LA FUNCIÓN DE EMERGENCIA
        setTimeout(forceAdminPanelOnLoad, 100);
    } else {
        console.error('❌ No se encontraron elementos del panel admin');
    }
}

// 🔧 FUNCIÓN NUEVA: Cargar estadísticas en la pantalla de bienvenida
function loadAdminWelcomeStats() {
    console.log('📊 Cargando estadísticas de bienvenida...');
    
    // Actualizar estadísticas en la pantalla de bienvenida
    const totalProducts = products.length;
    const totalRevenue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Actualizar elementos de la pantalla de bienvenida
    const welcomeTotalProducts = document.getElementById('welcomeTotalProducts');
    const welcomeTotalOrders = document.getElementById('welcomeTotalOrders');
    const welcomeTotalUsers = document.getElementById('welcomeTotalUsers');
    
    if (welcomeTotalProducts) welcomeTotalProducts.textContent = totalProducts;
    if (welcomeTotalOrders) welcomeTotalOrders.textContent = '0'; // Se actualizará con datos reales
    if (welcomeTotalUsers) welcomeTotalUsers.textContent = '0'; // Se actualizará con datos reales
    
    console.log('✅ Estadísticas de bienvenida cargadas');
}

// 🔧 FUNCIÓN MEJORADA: Aplicar estilos forzados CON CENTRADO
function applyAdminStyles() {
    console.log('🎨 Aplicando estilos CSS forzados CON CENTRADO...');
    
    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
        // 🔧 FORZAR CENTRADO EN PANTALLA DE BIENVENIDA
        const adminWelcome = document.getElementById('adminWelcome');
        if (adminWelcome) {
            adminWelcome.style.cssText = `
                text-align: center !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important;
                margin: 0 auto !important;
            `;
        }
        
        // 🔧 FORZAR CENTRADO DEL BOTÓN
        const enterAdminBtn = document.getElementById('enterAdminPanel');
        if (enterAdminBtn) {
            enterAdminBtn.style.cssText = `
                text-align: center !important;
                margin: 20px auto !important;
                display: inline-flex !important;
                justify-content: center !important;
                align-items: center !important;
                width: auto !important;
                min-width: 200px !important;
            `;
        }
        
        // 🔧 FORZAR CENTRADO DE ESTADÍSTICAS
        const welcomeStats = document.querySelector('.welcome-stats');
        if (welcomeStats) {
            welcomeStats.style.cssText = `
                text-align: center !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                flex-wrap: wrap !important;
                gap: 15px !important;
                margin: 0 auto !important;
            `;
        }
        
        // 🔧 FORZAR CENTRADO DE CADA ESTADÍSTICA
        const welcomeStatsItems = document.querySelectorAll('.welcome-stat');
        welcomeStatsItems.forEach(stat => {
            stat.style.cssText = `
                text-align: center !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 0 !important;
            `;
        });
        
        // Forzar estructura grid en estadísticas del panel completo
        const adminStats = document.querySelector('.admin-stats');
        if (adminStats) {
            adminStats.style.cssText = `
                display: grid !important;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
                gap: 20px !important;
                margin-bottom: 30px !important;
                width: 100% !important;
                text-align: center !important;
            `;
            
            // Aplicar estilos a cada tarjeta de estadística
            const statCards = adminStats.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                card.style.cssText = `
                    background: white !important;
                    padding: 25px !important;
                    border-radius: 12px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                    border-left: 4px solid var(--primary) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 15px !important;
                    text-align: center !important;
                `;
            });
        }
        
        // Forzar layout horizontal en pestañas
        const adminTabs = document.querySelector('.admin-tabs');
        if (adminTabs) {
            adminTabs.style.cssText = `
                display: flex !important;
                background: white !important;
                border-radius: 12px !important;
                padding: 8px !important;
                margin-bottom: 20px !important;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                gap: 10px !important;
                justify-content: center !important;
            `;
        }
        
        console.log('✅ Estilos forzados CON CENTRADO aplicados correctamente');
    }, 100);
}

// 🔧 FUNCIÓN NUEVA: Inicializar estructura del panel admin
function initializeAdminStructure() {
    console.log('🎨 Inicializando estructura del panel admin...');
    
    // Asegurar que el contenedor principal tenga las clases correctas
    const adminContainer = document.querySelector('.admin-container');
    if (adminContainer) {
        adminContainer.classList.add('admin-container');
    }
    
    // Asegurar que las estadísticas tengan la estructura grid
    const adminStats = document.querySelector('.admin-stats');
    if (adminStats) {
        adminStats.style.cssText = `
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
            gap: 20px !important;
            margin-bottom: 30px !important;
            width: 100% !important;
        `;
    }
    
    // Asegurar que las pestañas tengan el layout horizontal
    const adminTabs = document.querySelector('.admin-tabs');
    if (adminTabs) {
        adminTabs.style.cssText = `
            display: flex !important;
            background: white !important;
            border-radius: 12px !important;
            padding: 8px !important;
            margin-bottom: 20px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            gap: 10px !important;
        `;
    }
    
    console.log('✅ Estructura admin inicializada');
}

// 🔧 FUNCIÓN NUEVA: Inicializar sistema de pestañas del admin
function initializeAdminTabs() {
    const adminTabs = document.querySelectorAll('.admin-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clase active de todas las pestañas
            adminTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Agregar clase active a la pestaña y contenido seleccionado
            this.classList.add('active');
            const targetPane = document.getElementById(targetTab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
    
    console.log('✅ Sistema de pestañas del admin inicializado');
}

// ===== 🔧 FUNCIONES DE GESTIÓN DE PRODUCTOS (ADMIN) =====
async function loadAdminProducts() {
    const tableBody = document.getElementById('adminProductsTable');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = `
            <tr class="table-loading">
                <td colspan="6">
                    <i class="fas fa-spinner fa-spin"></i>
                    Cargando productos...
                </td>
            </tr>
        `;
        
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productsData = await response.json();
        
        if (productsData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <i class="fas fa-box-open"></i>
                        <p>No hay productos registrados</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        productsData.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="product-info-cell">
                        <div class="product-avatar">
                            <i class="fas fa-${getProductIcon(product.categoria)}"></i>
                        </div>
                        <div class="product-details">
                            <strong>${escapeHtml(product.nombre)}</strong>
                            ${product.descripcion ? `<small>${escapeHtml(product.descripcion)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge">${escapeHtml(product.categoria)}</span>
                </td>
                <td>
                    <strong class="price">S/ ${parseFloat(product.precio).toFixed(2)}</strong>
                </td>
                <td>
                    <span class="stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${product.stock}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${product.stock > 0 ? 'active' : 'inactive'}">
                        ${product.stock > 0 ? 'Activo' : 'Sin Stock'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditProductModal(${product.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="openDeleteProductModal(${product.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando productos admin:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar productos</p>
                    <button class="btn-retry" onclick="loadAdminProducts()">
                        Reintentar
                    </button>
                </td>
            </tr>
        `;
    }
}

async function loadAdminOrders() {
    const tableBody = document.getElementById('adminOrdersTable');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = `
            <tr class="table-loading">
                <td colspan="7">
                    <i class="fas fa-spinner fa-spin"></i>
                    Cargando pedidos...
                </td>
            </tr>
        `;
        
        const response = await fetch(`${PEDIDOS_API}/all`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showNotification('🔐 No autorizado para ver pedidos del sistema', 'error');
                return;
            }
            throw new Error('Error al cargar pedidos');
        }
        
        const ordersData = await response.json();
        
        if (!ordersData.pedidos || ordersData.pedidos.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No hay pedidos en el sistema</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const orders = ordersData.pedidos;
        tableBody.innerHTML = '';
        orders.forEach(order => {
            const total = order.total || order.items?.reduce((sum, item) => sum + (item.precio * item.cantidad), 0) || 0;
            const productCount = order.items?.length || 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>#${order.id || order._id}</strong>
                </td>
                <td>
                    <div class="user-info-cell">
                        <strong>${escapeHtml(order.userName || order.nombre_usuario || 'Cliente')}</strong>
                        <small>${escapeHtml(order.userEmail || order.email_usuario || '')}</small>
                    </div>
                </td>
                <td>
                    <span class="product-count">${productCount} producto(s)</span>
                </td>
                <td>
                    <strong class="price">S/ ${parseFloat(total).toFixed(2)}</strong>
                </td>
                <td>
                    ${formatFecha(order.fecha_creacion || order.createdAt)}
                </td>
                <td>
                    <span class="status-badge estado-${order.estado || 'pendiente'}">
                        ${getEstadoDisplay(order.estado)}
                    </span>
                </td>
                <td>
                    <button class="btn-view" onclick="viewOrderDetails(${order.id || order._id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando pedidos admin:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar pedidos</p>
                    <button class="btn-retry" onclick="loadAdminOrders()">
                        Reintentar
                    </button>
                </td>
            </tr>
        `;
    }
}

function updateAdminStats() {
    // Actualizar estadísticas en el panel admin
    const totalProducts = products.length;
    const totalRevenue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalOrders').textContent = '0'; // Se actualizará con datos reales
    document.getElementById('totalUsers').textContent = '0'; // Se actualizará con datos reales
    document.getElementById('revenue').textContent = `S/ ${totalRevenue.toFixed(2)}`;
}

// ===== 🔧 FUNCIONES DE CRUD PARA PRODUCTOS =====
async function handleAddProduct(e) {
    e.preventDefault();
    
    const formData = {
        nombre: document.getElementById('productName').value,
        categoria: document.getElementById('productCategory').value,
        precio: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        descripcion: document.getElementById('productDescription').value,
        imagen_url: document.getElementById('productImage').value || null
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Error al crear producto');
        
        const newProduct = await response.json();
        showNotification('✅ Producto creado exitosamente');
        
        // Resetear formulario
        document.getElementById('addProductForm').reset();
        
        // Recargar productos
        loadAdminProducts();
        loadProducts(); // Recargar también en el catálogo
        
    } catch (error) {
        console.error('Error creando producto:', error);
        showNotification('❌ Error al crear producto', 'error');
    }
}

async function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const formData = {
        nombre: document.getElementById('editProductName').value,
        categoria: document.getElementById('editProductCategory').value,
        precio: parseFloat(document.getElementById('editProductPrice').value),
        stock: parseInt(document.getElementById('editProductStock').value),
        descripcion: document.getElementById('editProductDescription').value
    };
    
    try {
        const response = await fetch(`${API_URL}/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Error al actualizar producto');
        
        showNotification('✅ Producto actualizado exitosamente');
        closeEditProductModal();
        
        // Recargar productos
        loadAdminProducts();
        loadProducts();
        
    } catch (error) {
        console.error('Error actualizando producto:', error);
        showNotification('❌ Error al actualizar producto', 'error');
    }
}

async function handleDeleteProduct() {
    const productId = document.getElementById('deleteProductId').value;
    
    try {
        const response = await fetch(`${API_URL}/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Error al eliminar producto');
        
        showNotification('🗑️ Producto eliminado exitosamente');
        closeDeleteProductModal();
        
        // Recargar productos
        loadAdminProducts();
        loadProducts();
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showNotification('❌ Error al eliminar producto', 'error');
    }
}

function viewOrderDetails(orderId) {
    // Implementar vista detallada del pedido
    showNotification(`📋 Viendo detalles del pedido #${orderId}`, 'info');
    // Aquí puedes implementar un modal con detalles completos del pedido
}

// ===== HISTORIAL DE PEDIDOS =====
async function loadHistorialPedidos() {
    const historialContent = document.getElementById('historialContent');
    const loadingElement = document.getElementById('historialLoading');
    const notLoggedElement = document.getElementById('historialNotLogged');
    const emptyElement = document.getElementById('historialEmpty');
    const pedidosList = document.getElementById('pedidosList');
    
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
        
        loadingElement.style.display = 'none';
        
        if (data.success && data.pedidos && data.pedidos.length > 0) {
            renderPedidosList(data.pedidos);
            pedidosList.style.display = 'block';
        } else {
            emptyElement.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        loadingElement.style.display = 'none';
        
        historialContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar el historial</h3>
                <p>Intenta recargar la página</p>
                <button class="btn-back-catalog" data-view="catalogo">
                    <i class="fas fa-store"></i>
                    Volver al Catálogo
                </button>
            </div>
        `;
    }
}

function renderPedidosList(pedidos) {
    const pedidosList = document.getElementById('pedidosList');
    
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
                ${renderPedidoItems(pedido.items)}
            </div>
            
            ${pedido.direccion_entrega ? `
                <div class="pedido-direccion">
                    <strong>Dirección:</strong> ${pedido.direccion_entrega}
                </div>
            ` : ''}
            
            <div class="pedido-metodo-pago">
                <strong>Método de pago:</strong> ${getMetodoPagoDisplay(pedido.metodo_pago)}
            </div>
        </div>
    `).join('');

    pedidosList.innerHTML = pedidosHTML;
}

function renderPedidoItems(items) {
    if (!items || items.length === 0) return '<p>No hay items en este pedido</p>';
    
    return items.map(item => `
        <div class="pedido-item">
            <div class="item-info">
                <div class="item-cantidad">${item.cantidad}</div>
                <div class="item-nombre">${item.producto_nombre}</div>
                <div class="item-precio">S/ ${parseFloat(item.precio_unitario).toFixed(2)} c/u</div>
            </div>
            <div class="item-subtotal">
                S/ ${parseFloat(item.subtotal).toFixed(2)}
            </div>
        </div>
    `).join('');
}

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

function getEstadoDisplay(estado) {
    const estados = {
        'completado': 'Completado',
        'pendiente': 'Pendiente',
        'cancelado': 'Cancelado',
        'en_camino': 'En camino'
    };
    return estados[estado] || estado;
}

function getMetodoPagoDisplay(metodo) {
    const metodos = {
        'efectivo': 'Efectivo',
        'tarjeta': 'Tarjeta',
        'transferencia': 'Transferencia'
    };
    return metodos[metodo] || metodo;
}

// ===== GESTIÓN DE PRODUCTOS =====
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
        
        console.log('Productos transformados:', products);
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
    console.log('Renderizando productos por categoría...');
    console.log('Total de productos:', products.length);
    
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

// ===== FUNCIONES DEL CARRITO =====
function addToCart(productId) {
    console.log('Agregando producto ID:', productId);
    
    const product = products.find(p => p.id == productId);
    if (!product) {
        console.log('Producto no encontrado con ID:', productId);
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

    console.log('Carrito actualizado:', cart);
    saveCartToStorage();
    updateCartUI();
    showNotification(`✅ ${product.name} agregado al carrito`);
}

// ===== REALIZAR PEDIDO =====
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
        btnPedir.disabled = true;
        btnPedir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
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
            console.log('✅ Pedido creado exitosamente, stock actualizado por el backend');
            
            // El backend ya actualizó el stock automáticamente
            // No necesitamos hacer actualizaciones adicionales
            
            const productosResumen = cart.map(item => 
                `• ${item.name} x${item.quantity} - S/ ${(item.price * item.quantity).toFixed(2)}`
            ).join('\n');
            
            setTimeout(() => {
                alert(`¡Pedido realizado con éxito!\n\nPedido #${pedidoResult.pedido.id}\nCliente: ${currentUser.nombre}\nEmail: ${currentUser.email}\n\nProductos:\n${productosResumen}\n\nTotal: S/ ${total.toFixed(2)}\n\n¡Gracias por tu compra!`);
                
                cart = [];
                localStorage.removeItem('bodega_cart');
                updateCartUI();
                closeCart();
                
                btnPedir.disabled = false;
                btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
                
                loadProducts();
                
                if (currentView === 'historial') {
                    loadHistorialPedidos();
                }
                
            }, 1000);
            
        } else {
            throw new Error(pedidoResult.message || 'Error al crear pedido');
        }
        
    } catch (error) {
        console.error('Error al realizar pedido:', error);
        
        const btnPedir = document.getElementById('btnPedir');
        btnPedir.disabled = false;
        btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
        
        showNotification('❌ Error al procesar el pedido. Intenta nuevamente.', 'error');
    }
}

// ===== BÚSQUEDA Y AUTOCOMPLETADO =====
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
    
    if (!suggestionsContainer.classList.contains('active')) return;

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

// ===== FILTROS =====
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
// 🔧 FUNCIÓN DE EMERGENCIA - FORZAR PANEL COMPLETO AL CARGAR
function forceAdminPanelOnLoad() {
    console.log('🔧 Forzando panel admin al cargar...');
    
    const adminWelcome = document.getElementById('adminWelcome');
    const adminPanelFull = document.getElementById('adminPanelFull');
    
    if (adminWelcome && adminPanelFull) {
        // Ocultar pantalla de bienvenida
        adminWelcome.style.display = 'none';
        
        // Mostrar panel completo
        adminPanelFull.style.display = 'block';
        adminPanelFull.style.opacity = '1';
        adminPanelFull.style.transform = 'translateY(0)';
        
        console.log('✅ Panel forzado correctamente');
    }
}

// 🔧 EJECUTAR AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
        if (currentUser?.role === 'admin' && currentView === 'admin') {
            forceAdminPanelOnLoad();
        }
    }, 500);
});
