// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_BASE_URL = 'https://bodega-backend-nuevo.onrender.com';
const API_URL = `${API_BASE_URL}/api/inventory`;
const AUTH_API = `${API_BASE_URL}/api/auth`;
const PEDIDOS_API = `${API_BASE_URL}/api/pedidos`;

// ===== FLAGS PARA CONTROLAR INICIALIZACIÓN =====
let eventListenersInitialized = false;

// ===== ESTADO GLOBAL =====
window.cart = []; // ← AGREGAR 'window.'
window.products = []; // ← AGREGAR 'window.'
window.currentFilter = 'all';
window.currentSuggestions = [];
window.selectedSuggestionIndex = -1;
window.currentUser = null;
window.authToken = localStorage.getItem('bodega_token');
window.currentView = 'catalogo';
window.isAdminMode = false;

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    
    // 🔧 ESPERAR a que la autenticación se complete PRIMERO
    await initializeAuth(); // ← AGREGAR 'async' y 'await'
    
    // 🔧 SEGUNDO: Configurar navegación y vistas
    initializeNavigation();
    
    // 🔧 TERCERO: Inicializar admin si corresponde
    initializeAdmin();
    
    // 🔧 CUARTO: Cargar datos de la aplicación
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
    
    // 🔧 QUINTO: Recuperar vista guardada (DESPUÉS de tener permisos verificados)
    const savedView = localStorage.getItem('bodega_current_view');
    console.log('🔍 Vista guardada encontrada:', savedView);
    
    if (savedView) {
        // Pequeño delay para asegurar que todo esté inicializado
        setTimeout(() => {
            console.log('🎯 Mostrando vista guardada:', savedView);
            showView(savedView);
        }, 200);
    } else {
        // Vista por defecto
        showView('catalogo');
    }
}

// ===== FUNCIONES DE UTILIDAD =====
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

// ===== 🔧 SISTEMA DE VISTAS MEJORADO =====
function showView(viewName) {
    console.log('🎯 Cambiando a vista:', viewName);
    console.log('🔍 Usuario actual:', currentUser);
    console.log('🔍 Modo admin:', isAdminMode);
    
    // 🔧 GUARDAR VISTA ACTUAL
    localStorage.setItem('bodega_current_view', viewName);
    
    // 🔧 VALIDAR PERMISOS PARA ADMIN - MEJORADO
    // 🔧 CORREGIDO: VALIDAR PERMISOS PARA ADMIN - SOLO MOSTRAR ERROR PERO NO REDIRIGIR
    if (viewName === 'admin') {
        if (!currentUser || currentUser.role !== 'admin') {
            console.log('❌ Acceso denegado a admin. Usuario:', currentUser);
            showNotification('🔐 No tienes permisos de administrador', 'error');
            // 🔧 CAMBIO: NO forzar redirección, dejar que continue el flujo normal
            return; // ← Agregar este return para evitar que continue
        } else {
            console.log('✅ Acceso permitido a admin');
            
            // ✅ FORZAR ESTILOS ADMIN INMEDIATAMENTE
            setTimeout(() => {
                console.log('🎨 Aplicando estilos forzados para admin...');
                applyAdminStyles();
            }, 50);
        }
    }
        
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
                if (typeof loadHistorialPedidos === 'function') {
                    loadHistorialPedidos();
                }
                break;
            case 'catalogo':
                document.getElementById('filtersSidebar').style.display = 'block';
                break;
            case 'admin':
                if (typeof initializeAdminView === 'function') {
                    initializeAdminView();
                }
                break;
        }
        
        // Ajustar layout según la vista
        adjustLayoutForView(viewName);
        updateNavigationState();
    }
}

// ✅ NUEVA FUNCIÓN: Aplicar estilos forzados para admin
function applyAdminStyles() {
    console.log('🎨 Aplicando estilos CSS forzados...');
    
    const adminContainer = document.querySelector('.admin-container');
    const adminStats = document.querySelector('.admin-stats');
    const adminTabs = document.querySelector('.admin-tabs');
    
    if (adminContainer) {
        adminContainer.style.cssText = `
            width: 100% !important;
            max-width: 1400px !important;
            margin: 0 auto !important;
            padding: 20px !important;
            display: block !important;
        `;
    }
    
    if (adminStats) {
        adminStats.style.cssText = `
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
            gap: 20px !important;
            margin-bottom: 30px !important;
            width: 100% !important;
        `;
    }
    
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
    
    // Aplicar estilos a las pestañas individuales
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.style.cssText = `
            flex: 1 !important;
            padding: 12px 20px !important;
            text-align: center !important;
            background: none !important;
            border: none !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            font-weight: 500 !important;
            color: var(--text-light) !important;
        `;
    });
    
    // Aplicar estilos a las pestañas activas
    document.querySelectorAll('.admin-tab.active').forEach(tab => {
        tab.style.cssText += `
            background: var(--primary) !important;
            color: white !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important;
        `;
    });
    
    console.log('✅ Estilos forzados aplicados correctamente');
}

function adjustLayoutForView(viewName) {
    const mainContainer = document.querySelector('.main-container');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (viewName === 'catalogo') {
        mainContainer.style.gridTemplateColumns = '280px 1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'block';
        
        // Mostrar elementos de usuario normal
        document.getElementById('searchBar').style.display = 'flex';
        document.getElementById('cartToggle').style.display = 'flex';
        
    } else if (viewName === 'admin') {
        mainContainer.style.gridTemplateColumns = '1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'none';
        
        // Ocultar elementos de usuario normal en modo admin
        document.getElementById('searchBar').style.display = 'none';
        document.getElementById('cartToggle').style.display = 'none';
        
    } else {
        mainContainer.style.gridTemplateColumns = '1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'none';
        
        // Mostrar elementos de usuario normal
        document.getElementById('searchBar').style.display = 'flex';
        document.getElementById('cartToggle').style.display = 'flex';
    }
}

function updateNavigationState() {
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-view="${currentView}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// ===== 🔧 FUNCIONES DE ADMINISTRADOR =====
function initializeAdmin() {
    console.log('🔧 Inicializando sistema admin...');
    checkAdminMode(); // ← VERIFICAR PERMISOS AL INICIAR
    setupAdminEventListeners();
    setupAdminModals();
}

// 🔧 CORREGIDO: Función mejorada para verificar admin
function checkAdminMode() {
    const userData = localStorage.getItem('bodega_user');
    console.log('🔍 CheckAdminMode - userData:', userData);
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('🔍 CheckAdminMode - User parsed:', user);
            
            // ✅ VERIFICACIÓN MEJORADA
            const isAdmin = user.role === 'admin' || user.email === 'admin@bodega.com';
            console.log('🔍 CheckAdminMode - Es admin?:', isAdmin);
            
            if (isAdmin) {
                enableAdminMode();
                console.log('✅ Admin mode enabled desde checkAdminMode');
            } else {
                console.log('❌ No es admin, disabling admin mode');
                disableAdminMode();
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            disableAdminMode();
        }
    } else {
        console.log('❌ No user data found');
        disableAdminMode();
    }
}

function enableAdminMode() {
    isAdminMode = true;
    console.log('✅ enableAdminMode - isAdminMode establecido a:', true);
    
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = 'block';
        console.log('✅ Admin menu item mostrado');
    }
    
    document.body.classList.add('admin-mode');
    
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'none';
    if (cartToggle) cartToggle.style.display = 'none';
    if (filtersSidebar) filtersSidebar.style.display = 'none';
    
    console.log('🔧 Modo administrador activado');
}

function disableAdminMode() {
    isAdminMode = false;
    console.log('❌ disableAdminMode - isAdminMode establecido a:', false);
    
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = 'none';
    }
    
    document.body.classList.remove('admin-mode');
    
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'flex';
    if (cartToggle) cartToggle.style.display = 'flex';
    if (filtersSidebar) filtersSidebar.style.display = 'block';
    
    if (currentView === 'admin') {
        showView('catalogo');
    }
    
    console.log('🔧 Modo administrador desactivado');
}

function setupAdminEventListeners() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });
    
    document.getElementById('refreshProducts')?.addEventListener('click', loadAdminProducts);
    document.getElementById('refreshOrders')?.addEventListener('click', loadAdminOrders);
    
    document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
}

function setupAdminModals() {
    document.getElementById('closeEditProductModal')?.addEventListener('click', closeEditProductModal);
    document.getElementById('cancelEditProduct')?.addEventListener('click', closeEditProductModal);
    document.getElementById('editProductOverlay')?.addEventListener('click', closeEditProductModal);
    document.getElementById('editProductForm')?.addEventListener('submit', handleEditProduct);
    
    document.getElementById('closeDeleteProductModal')?.addEventListener('click', closeDeleteProductModal);
    document.getElementById('cancelDeleteProduct')?.addEventListener('click', closeDeleteProductModal);
    document.getElementById('deleteProductOverlay')?.addEventListener('click', closeDeleteProductModal);
    document.getElementById('confirmDeleteProduct')?.addEventListener('click', handleDeleteProduct);
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePane = document.getElementById(tabName);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePane) activePane.classList.add('active');
    
    switch(tabName) {
        case 'gestion-productos':
            if (typeof loadAdminProducts === 'function') loadAdminProducts();
            break;
        case 'pedidos-sistema':
            if (typeof loadAdminOrders === 'function') loadAdminOrders();
            break;
        case 'agregar-producto':
            document.getElementById('addProductForm')?.reset();
            break;
    }
}

// ===== 🔧 MOSTRAR VISTA DE ADMINISTRADOR =====
function showAdminView() {
    console.log('🎯 showAdminView llamado');
    console.log('🔍 Estado actual - isAdminMode:', isAdminMode);
    console.log('🔍 Estado actual - currentUser:', currentUser);
    
    // 🔧 USAR LA NUEVA FUNCIÓN showView EN LUGAR DE LÓGICA DUPLICADA
    showView('admin');
}

function loadAdminPanelData() {
    if (typeof loadAdminProducts === 'function') loadAdminProducts();
    if (typeof loadAdminOrders === 'function') loadAdminOrders();
    if (typeof loadAdminStats === 'function') loadAdminStats();
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
        
        const products = await response.json();
        
        if (products.length === 0) {
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
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="product-info-cell">
                        <div class="product-avatar">
                            <i class="fas fa-${getProductIcon(product.category)}"></i>
                        </div>
                        <div class="product-details">
                            <strong>${escapeHtml(product.name)}</strong>
                            ${product.description ? `<small>${escapeHtml(product.description)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge">${escapeHtml(product.category)}</span>
                </td>
                <td>
                    <strong class="price">S/ ${parseFloat(product.price).toFixed(2)}</strong>
                </td>
                <td>
                    <span class="stock ${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${product.quantity}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${product.quantity > 0 ? 'active' : 'inactive'}">
                        ${product.quantity > 0 ? 'Activo' : 'Sin Stock'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditProductModal('${product.id || product._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="openDeleteProductModal('${product.id || product._id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        updateAdminStats();
        
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
        
        const orders = await response.json();
        
        if (!orders || orders.length === 0) {
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
        
        tableBody.innerHTML = '';
        orders.forEach(order => {
            const total = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
            const productCount = order.items?.length || 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>#${order.id || order._id}</strong>
                </td>
                <td>
                    <div class="user-info-cell">
                        <strong>${escapeHtml(order.userName || 'Cliente')}</strong>
                        <small>${escapeHtml(order.userEmail || '')}</small>
                    </div>
                </td>
                <td>
                    <span class="product-count">${productCount} producto(s)</span>
                </td>
                <td>
                    <strong class="price">S/ ${total.toFixed(2)}</strong>
                </td>
                <td>
                    ${new Date(order.fecha || order.createdAt).toLocaleDateString()}
                </td>
                <td>
                    <span class="status-badge estado-${order.estado || 'pendiente'}">
                        ${getStatusText(order.estado)}
                    </span>
                </td>
                <td>
                    <button class="btn-view" onclick="viewOrderDetails('${order.id || order._id}')" title="Ver detalles">
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
    const totalProducts = products.length;
    const totalRevenue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalOrders').textContent = '0';
    document.getElementById('totalUsers').textContent = '0';
    document.getElementById('revenue').textContent = `S/ ${totalRevenue.toFixed(2)}`;
}

// ===== 🔧 MODALES DE ADMIN =====
function openEditProductModal(productId) {
    const product = products.find(p => p.id == productId || p._id == productId);
    if (!product) {
        showNotification('❌ Producto no encontrado', 'error');
        return;
    }
    
    document.getElementById('editProductId').value = product.id || product._id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.quantity;
    document.getElementById('editProductDescription').value = product.description || '';
    
    document.getElementById('editProductOverlay').style.display = 'block';
    document.getElementById('editProductModal').style.display = 'block';
}

function closeEditProductModal() {
    document.getElementById('editProductOverlay').style.display = 'none';
    document.getElementById('editProductModal').style.display = 'none';
}

function openDeleteProductModal(productId) {
    document.getElementById('deleteProductId').value = productId;
    document.getElementById('deleteProductOverlay').style.display = 'block';
    document.getElementById('deleteProductModal').style.display = 'block';
}

function closeDeleteProductModal() {
    document.getElementById('deleteProductOverlay').style.display = 'none';
    document.getElementById('deleteProductModal').style.display = 'none';
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        quantity: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value,
        image: document.getElementById('productImage').value || null
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
        
        document.getElementById('addProductForm').reset();
        loadAdminProducts();
        loadProducts();
        
    } catch (error) {
        console.error('Error creando producto:', error);
        showNotification('❌ Error al crear producto', 'error');
    }
}

async function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const formData = {
        name: document.getElementById('editProductName').value,
        category: document.getElementById('editProductCategory').value,
        price: parseFloat(document.getElementById('editProductPrice').value),
        quantity: parseInt(document.getElementById('editProductStock').value),
        description: document.getElementById('editProductDescription').value
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
        loadAdminProducts();
        loadProducts();
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showNotification('❌ Error al eliminar producto', 'error');
    }
}

function viewOrderDetails(orderId) {
    showNotification(`📋 Viendo detalles del pedido #${orderId}`, 'info');
}

function getStatusText(status) {
    const statusMap = {
        'completado': 'Completado',
        'pendiente': 'Pendiente',
        'cancelado': 'Cancelado',
        'en_camino': 'En Camino'
    };
    return statusMap[status] || 'Pendiente';
}

// ===== GESTIÓN DE VISTAS Y NAVEGACIÓN =====
function initializeNavigation() {
    document.addEventListener('click', function(e) {
        const viewBtn = e.target.closest('[data-view]');
        if (viewBtn) {
            e.preventDefault();
            const viewName = viewBtn.getAttribute('data-view');
            showView(viewName);
        }
        
        // Manejar clic en opción admin del menú usuario
        if (e.target.closest('.admin-option')) {
            e.preventDefault();
            showAdminView();
        }
    });
}

// ===== GESTIÓN DEL CARRITO =====
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('bodega_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            console.log('Carrito cargado desde localStorage:', cart);
        } catch (error) {
            console.error('Error cargando carrito:', error);
            cart = [];
        }
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('bodega_cart', JSON.stringify(cart));
        console.log('Carrito guardado en localStorage');
    } catch (error) {
        console.error('Error guardando carrito:', error);
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const btnPedir = document.getElementById('btnPedir');

    console.log('Actualizando UI del carrito. Productos en carrito:', cart.length);

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div id="emptyCart" class="empty-cart-modern">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Tu carrito está vacío</p>
                    <small>Agrega algunos productos</small>
                </div>
            `;
            if (btnPedir) {
                btnPedir.disabled = true;
                btnPedir.classList.add('disabled');
            }
        } else {
            let cartHTML = '';
            
            cart.forEach(item => {
                // ✅ CORREGIDO: Usar 'nombre' y 'precio'
                cartHTML += `
                    <div class="cart-item-modern">
                        <div class="cart-item-image">
                            <i class="fas fa-${getProductIcon(item.categoria)}"></i>
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
                            <div class="cart-item-price">S/ ${item.precio.toFixed(2)} c/u</div>
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
            
            cartItems.innerHTML = cartHTML;
            if (btnPedir) {
                btnPedir.disabled = false;
                btnPedir.classList.remove('disabled');
            }
        }
    }

    // ✅ CORREGIDO: Usar 'precio' en lugar de 'price'
    const total = cart.reduce((sum, item) => sum + ((item.precio || 0) * (item.quantity || 0)), 0);
    if (totalAmount) {
        totalAmount.textContent = `S/ ${total.toFixed(2)}`;
    }
}

function removeFromCart(productId) {
    console.log('Eliminando producto ID:', productId);
    cart = cart.filter(item => item.id != productId);
    saveCartToStorage();
    updateCartUI();
    showNotification('🗑️ Producto removido del carrito');
}

function updateQuantity(productId, change) {
    console.log(`Actualizando cantidad producto ${productId}: cambio ${change}`);
    
    const item = cart.find(item => item.id == productId);
    if (!item) return;

    // ✅ BUSCAR producto ORIGINAL con propiedades correctas
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

// ===== CONTROL DEL PANEL DEL CARRITO =====
function toggleCart() {
    if (isAdminMode && currentView === 'admin') {
        showNotification('🔧 El carrito está deshabilitado en modo administrador', 'info');
        return;
    }
    
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    if (cartPanel && overlay) {
        cartPanel.classList.toggle('active');
        overlay.classList.toggle('active');
        document.querySelector('.main-container').classList.toggle('blurred');
        
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
        document.querySelector('.main-container').classList.remove('blurred');
    }
}


// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
function setupEventListeners() {
    // ✅ PREVENIR DUPLICACIÓN
    if (eventListenersInitialized) {
        console.log('⚠️ Event listeners ya inicializados, saltando...');
        return;
    }
    
    console.log('🎯 Configurando event listeners...');
    
    // 🔧 CARRITO - Configuración SIMPLE y DIRECTA
    setupCartButtonSimple();
    setupCartCloseButton();
    
    // 🔧 FILTROS - Solo si existen
    document.querySelectorAll('.filter-option input').forEach(radio => {
        radio.addEventListener('change', function(e) {
            console.log('🎯 Cambio de filtro:', e.target.value);
            if (typeof handleFilterChange === 'function') {
                handleFilterChange(e);
            }
        });
    });

    // 🔧 BÚSQUEDA
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
    
    // ✅ MARCAR COMO INICIALIZADO
    eventListenersInitialized = true;
    console.log('✅ Event listeners configurados correctamente');
}

// ===== 🔧 CONFIGURACIÓN SIMPLE DEL BOTÓN DEL CARRITO =====
function setupCartButtonSimple() {
    console.log('🎯 Configurando botón del carrito (versión simple)...');
    
    const cartBtn = document.getElementById('cartToggle');
    if (!cartBtn) {
        console.error('❌ Botón del carrito no encontrado');
        return;
    }
    
    // 1. Clonar el botón para remover listeners rotos
    const newBtn = cartBtn.cloneNode(true);
    cartBtn.parentNode.replaceChild(newBtn, cartBtn);
    
    // 2. Listener DIRECTO y SIMPLE
    newBtn.addEventListener('click', function(e) {
        console.log('🛒 Click en botón del carrito');
        e.preventDefault();
        e.stopPropagation();
        
        // Usar toggleCart principal
        if (typeof toggleCart === 'function') {
            toggleCart();
        }
    });
    
    console.log('✅ Botón del carrito configurado');
}

// ===== 🔧 CONFIGURACIÓN DEL BOTÓN CERRAR CARRITO =====
function setupCartCloseButton() {
    console.log('🎯 Configurando botón cerrar carrito...');
    
    const closeBtn = document.getElementById('closeCart');
    if (!closeBtn) return;
    
    // Listener
