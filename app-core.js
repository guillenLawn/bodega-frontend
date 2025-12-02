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
    
    // 🔧 CARRITO - Remover listeners antiguos primero
    const cartToggle = document.getElementById('cartToggle');
    const closeCartBtn = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const btnPedir = document.getElementById('btnPedir');
    
    if (cartToggle) {
        // Clonar y reemplazar para remover listeners antiguos
        const newCartToggle = cartToggle.cloneNode(true);
        cartToggle.parentNode.replaceChild(newCartToggle, cartToggle);
        
        // Agregar nuevo listener
        newCartToggle.addEventListener('click', function(e) {
            console.log('🛒 Click en icono del carrito');
            e.stopPropagation();
            if (typeof toggleCart === 'function') {
                toggleCart();
            }
        });
        
        // Actualizar referencia
        window.cartToggleElement = newCartToggle;
    }
    
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', function() {
            console.log('❌ Click en cerrar carrito');
            if (typeof hideCartPanel === 'function') {
                hideCartPanel();
            }
        });
    }
    
    if (cartOverlay) {
        cartOverlay.addEventListener('click', function() {
            console.log('🎯 Click en overlay del carrito');
            if (typeof hideCartPanel === 'function') {
                hideCartPanel();
            }
        });
    }
    
    if (btnPedir) {
        btnPedir.addEventListener('click', function() {
            console.log('💰 Click en "Realizar Pedido"');
            if (typeof realizarPedido === 'function') {
                realizarPedido();
            }
        });
    }
    
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

// ===== FUNCIONES DE PRODUCTOS =====
function getProductIcon(category) {
    const icons = {
        'Granos': 'wheat',
        'Pastas': 'utensils',
        'Aceites': 'flask',
        'Lácteos': 'cheese',
        'Carnes': 'drumstick-bite',
        'Bebidas': 'wine-bottle',
        'Limpieza': 'spray-can',
        'Conservas': 'can',
        'Abarrotes': 'box',
        'Lácteos y Carnes': 'cheese'
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

// ===== ANIMACIONES CSS DINÁMICAS =====
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
    
    /* 🔧 Estilos específicos para modo admin */
    .admin-mode .search-bar,
    .admin-mode .cart-icon-nav {
        display: none !important;
    }
    
    .admin-mode .navbar {
        border-bottom: 3px solid #dc2626;
    }
    
    .admin-badge {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9rem;
    }
    
    .table-loading {
        text-align: center;
        color: var(--text-light);
        padding: var(--space-xl);
    }
    
    .action-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
    }
    
    .btn-edit, .btn-delete, .btn-view {
        padding: 6px 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .btn-edit {
        background: #3b82f6;
        color: white;
    }
    
    .btn-delete {
        background: #ef4444;
        color: white;
    }
    
    .btn-view {
        background: #10b981;
        color: white;
    }
    
    .btn-edit:hover { background: #2563eb; }
    .btn-delete:hover { background: #dc2626; }
    .btn-view:hover { background: #059669; }
    
    .product-info-cell {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .product-avatar {
        width: 40px;
        height: 40px;
        background: var(--bg-light);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary);
    }
    
    .category-badge {
        background: var(--bg-light);
        color: var(--text-dark);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .stock.in-stock { color: #10b981; font-weight: 600; }
    .stock.out-of-stock { color: #ef4444; font-weight: 600; }
    
    .text-center { text-align: center; }
    .text-center i { font-size: 2rem; margin-bottom: 10px; display: block; }
    
    .btn-retry {
        background: var(--primary);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 10px;
    }
    
    /* ✅ NUEVO: Estilos para panel admin completo */
    .admin-container {
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid var(--border-light);
    }
    
    .admin-title-section h2 {
        color: var(--text-dark);
        margin-bottom: 5px;
        font-size: 2rem;
    }
    
    .admin-subtitle {
        color: var(--text-light);
        font-size: 1.1rem;
    }
    
    .admin-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
        width: 100%;
    }
    
    .stat-card {
        background: white;
        padding: 25px;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border-left: 4px solid var(--primary);
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .stat-icon {
        width: 60px;
        height: 60px;
        background: var(--primary-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: var(--primary);
    }
    
    .stat-info h3 {
        font-size: 2rem;
        margin-bottom: 5px;
        color: var(--text-dark);
    }
    
    .stat-info p {
        color: var(--text-light);
        margin: 0;
    }
    
    .admin-tabs {
        display: flex;
        background: white;
        border-radius: 12px;
        padding: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .admin-tab {
        flex: 1;
        padding: 12px 20px;
        text-align: center;
        background: none;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        color: var(--text-light);
    }
    
    .admin-tab.active {
        background: var(--primary);
        color: white;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    
    .tab-pane {
        display: none;
    }
    
    .tab-pane.active {
        display: block;
    }
    
    .admin-table-container {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .admin-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .admin-table th {
        background: var(--bg-light);
        padding: 15px 12px;
        text-align: left;
        font-weight: 600;
        color: var(--text-dark);
        border-bottom: 2px solid var(--border-light);
    }
    
    .admin-table td {
        padding: 12px;
        border-bottom: 1px solid var(--border-light);
    }
    
    .admin-table tr:last-child td {
        border-bottom: none;
    }
    
    .admin-table tr:hover {
        background: var(--bg-light);
    }
    
    .user-info-cell {
        display: flex;
        flex-direction: column;
    }
    
    .user-info-cell small {
        color: var(--text-light);
        font-size: 0.8rem;
    }
`;
document.head.appendChild(style);

// ===== INICIALIZAR ANIMACIONES =====
function initializeProductAnimations() {
    const productCards = document.querySelectorAll('.product-card-modern');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

setTimeout(initializeProductAnimations, 100);

// ===== FUNCIONES QUE FALTAN =====
async function loadProducts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        products = await response.json();
        console.log('Productos cargados:', products);
        renderProducts();
    } catch (error) {
        console.error('Error cargando productos:', error);
        showNotification('❌ Error al cargar productos', 'error');
    }
}

function renderProducts() {
    console.log('🔄 app-core: Renderizando productos:', window.products ? window.products.length : 0);
    
    // ✅ LLAMAR a la función CORRECTA de app-pedidos.js
    if (typeof window.renderProductsByCategory === 'function') {
        console.log('🎯 Llamando a renderProductsByCategory()...');
        window.renderProductsByCategory();
    } else {
        console.error('❌ renderProductsByCategory no disponible');
        
        // Fallback: renderizado básico
        const container = document.querySelector('.catalog-main');
        if (container && window.products && window.products.length > 0) {
            console.log('🔄 Usando fallback básico...');
            container.innerHTML = `
                <div class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">Todos los productos</h2>
                    </div>
                    <div class="products-grid">
                        ${window.products.map(p => `
                            <div class="product-card-modern" data-id="${p.id}">
                                <div class="product-image">
                                    <div class="category-badge">${p.categoria || 'Sin categoría'}</div>
                                    ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" class="product-real-image">` : '<i class="fas fa-box"></i>'}
                                </div>
                                <div class="product-card-body">
                                    <h3>${p.nombre}</h3>
                                    <p>S/ ${parseFloat(p.precio).toFixed(2)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id == productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
            showNotification('❌ No hay más stock disponible', 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        // ✅ CORREGIDO: Usar propiedades correctas
        cart.push({
            id: product.id,
            nombre: product.nombre,        // ← ¡CORREGIDO! Antes era 'name'
            precio: parseFloat(product.precio), // ← ¡CORREGIDO! Antes era 'price'
            quantity: 1,
            categoria: product.categoria    // ← ¡CORREGIDO! Antes era 'category'
        });
    }
    
    saveCartToStorage();
    updateCartUI();
    showNotification('✅ Producto agregado al carrito');
}

// ✅ SOLUCIONADO: Función realizarPedido con debugging mejorado
async function realizarPedido() {
    if (cart.length === 0) return;
    
    if (!currentUser) {
        showNotification('🔐 Inicia sesión para realizar pedidos', 'error');
        return;
    }
    
    try {
        const pedidoData = {
            items: cart,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            userId: currentUser.id,
            userName: currentUser.nombre,
            userEmail: currentUser.email
        };
        
        // ✅ DEBUGGING MEJORADO
        console.log('📤 Enviando pedido:', pedidoData);
        console.log('🔑 Token:', authToken);
        console.log('🌐 URL:', PEDIDOS_API);
        
        const response = await fetch(PEDIDOS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(pedidoData)
        });
        
        // ✅ MANEJO DETALLADO DE ERRORES
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', response.status, errorText);
            
            if (response.status === 401) {
                throw new Error('No autorizado - token inválido');
            } else if (response.status === 400) {
                throw new Error('Datos inválidos: ' + errorText);
            } else {
                throw new Error(`Error ${response.status}: ${errorText}`);
            }
        }
        
        const result = await response.json();
        console.log('✅ Pedido exitoso:', result);
        
        showNotification('✅ Pedido realizado exitosamente');
        
        // Limpiar carrito
        cart = [];
        saveCartToStorage();
        updateCartUI();
        closeCart();
        
    } catch (error) {
        console.error('❌ Error completo realizando pedido:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

async function loadHistorialPedidos() {
    console.log('Cargando historial de pedidos...');
}

function handleFilterChange(e) {
    currentFilter = e.target.value;
}

function handleSearch() {
}

function handleSearchKeydown() {
}

function handleSearchFocus() {
}

function handleSearchBlur() {
}

function hideSuggestions() {
}

function loadAdminStats() {
    console.log('Cargando estadísticas del admin...');
}

function showCartPanel() {
    console.log('🛒 Mostrando panel del carrito...');
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartPanel && cartOverlay) {
        // 1. Primero mostrar el overlay (con pointer-events)
        cartOverlay.style.display = 'block';
        cartOverlay.style.pointerEvents = 'auto';
        
        // 2. Pequeño delay para que el DOM procese el display change
        setTimeout(() => {
            // 3. Agregar clase active para animación
            cartOverlay.classList.add('active');
            cartPanel.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // 4. Actualizar contenido
            updateCartUI(); // Actualizar siempre al abrir
            
            console.log('✅ Carrito completamente abierto');
        }, 10);
    }
}

function hideCartPanel() {
    console.log('🛒 Ocultando panel del carrito...');
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartPanel && cartOverlay) {
        // 1. Remover clase active del panel
        cartPanel.classList.remove('active');
        
        // 2. IMPORTANTE: También remover pointer-events del overlay
        cartOverlay.classList.remove('active');
        cartOverlay.style.pointerEvents = 'none'; // ← ¡ESTO ES CLAVE!
        
        // 3. Esperar a que termine la animación (300ms) y luego deshabilitar completamente
        setTimeout(() => {
            cartOverlay.style.display = 'none';
            document.body.style.overflow = '';
            console.log('✅ Carrito completamente cerrado y overlay deshabilitado');
        }, 300); // Mismo tiempo que la transición CSS
    }
}

// 🔧 REEMPLAZAR LA FUNCIÓN toggleCart (línea ~860):
function toggleCart() {
    console.log('🎯 toggleCart() llamado');
    
    if (isAdminMode && currentView === 'admin') {
        showNotification('🔧 El carrito está deshabilitado en modo administrador', 'info');
        return;
    }
    
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    if (!cartPanel || !overlay) {
        console.error('❌ Elementos del carrito no encontrados');
        return;
    }
    
    console.log('🔍 Estado actual - Panel activo?:', cartPanel.classList.contains('active'));
    
    // ✅ CORREGIDO: Verificar correctamente si está abierto
    if (cartPanel.classList.contains('active')) {
        console.log('🔒 Cerrando carrito...');
        hideCartPanel();
    } else {
        console.log('🔓 Abriendo carrito...');
        showCartPanel();
    }
}

// ===== 🔧 SOLUCIÓN DEFINITIVA - REEMPLAZAR BOTÓN COMPLETAMENTE =====
function fixCartButton() {
    console.log('🔧 Aplicando solución definitiva al botón del carrito...');
    
    const cartToggle = document.getElementById('cartToggle');
    if (!cartToggle) {
        console.error('❌ Botón del carrito no encontrado');
        return;
    }
    
    // 1. Crear NUEVO botón idéntico
    const newButton = document.createElement('div');
    newButton.id = 'cartToggle';
    newButton.className = cartToggle.className;
    newButton.innerHTML = cartToggle.innerHTML;
    
    // 2. Copiar todos los atributos
    Array.from(cartToggle.attributes).forEach(attr => {
        newButton.setAttribute(attr.name, attr.value);
    });
    
    // 3. Agregar estilos y comportamiento
    newButton.style.cursor = 'pointer';
    newButton.title = 'Abrir carrito de compras';
    newButton.setAttribute('role', 'button');
    newButton.setAttribute('tabindex', '0');
    
    // 4. Reemplazar el botón viejo
    cartToggle.parentNode.replaceChild(newButton, cartToggle);
    
    console.log('✅ Botón reemplazado con versión nueva y limpia');
    
    return newButton;
}

// ===== FUNCIÓN PARA INICIALIZAR CARRITO =====
function initializeCartSystem() {
    console.log('🛒 Inicializando sistema del carrito...');
    
    // 1. Arreglar el botón
    const cartButton = fixCartButton();
    
    // 2. Agregar event listener DIRECTO y ROBUSTO
    if (cartButton) {
        cartButton.addEventListener('click', function(e) {
            console.log('🎯 CLICK REGISTRADO en carrito');
            e.preventDefault();
            e.stopPropagation();
            
            // Prevenir clics rápidos múltiples
            if (this.dataset.processing) return;
            this.dataset.processing = 'true';
            
            setTimeout(() => {
                delete this.dataset.processing;
            }, 500);
            
            // Usar toggleCart existente
            if (typeof toggleCart === 'function') {
                toggleCart();
            } else {
                // Fallback manual
                const panel = document.getElementById('cartPanel');
                const overlay = document.getElementById('cartOverlay');
                
                if (panel && overlay) {
                    const isOpen = panel.classList.contains('active');
                    
                    if (isOpen) {
                        hideCartPanel();
                    } else {
                        showCartPanel();
                    }
                }
            }
        });
        
        // 3. También agregar para tecla Enter (accesibilidad)
        cartButton.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        
        console.log('✅ Sistema del carrito inicializado correctamente');
    }
}

// ===== 🚨 SOLUCIÓN DE EMERGENCIA - OVERLAY COMPLETAMENTE FUNCIONAL =====
function setupCartOverlayFix() {
    console.log('🚨 Configurando overlay del carrito...');
    
    const overlay = document.getElementById('cartOverlay');
    if (!overlay) return;
    
    // Asegurar que overlay esté inicialmente oculto
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
    overlay.classList.remove('active');
    
    // Agregar event listener DIRECTO para cerrar al hacer click
    overlay.addEventListener('click', function(e) {
        console.log('🎯 Click en overlay para cerrar carrito');
        if (typeof hideCartPanel === 'function') {
            hideCartPanel();
        }
    });
    
    console.log('✅ Overlay configurado correctamente');
}

// Ejecutar después de que todo cargue
setTimeout(() => {
    if (typeof setupCartOverlayFix === 'function') {
        setupCartOverlayFix();
    }
}, 2000);

// ===== 🔧 SOLUCIÓN FINAL PARA EL BOTÓN DEL CARRITO =====
// AGREGAR AL FINAL DEL ARCHIVO - NO MODIFICAR NADA MÁS

function arreglarBotonCarrito() {
    console.log('🔧 Iniciando arreglo del botón del carrito...');
    
    // 1. Buscar el botón
    const botonCarrito = document.getElementById('cartToggle');
    if (!botonCarrito) {
        console.error('❌ No se encontró el botón del carrito');
        return;
    }
    
    console.log('✅ Botón encontrado:', botonCarrito);
    
    // 2. Crear nuevo botón IDÉNTICO
    const nuevoBoton = botonCarrito.cloneNode(true);
    
    // 3. Reemplazar el botón viejo
    botonCarrito.parentNode.replaceChild(nuevoBoton, botonCarrito);
    
    // 4. Agregar evento CLICK que SIEMPRE funciona
    nuevoBoton.addEventListener('click', function(evento) {
        console.log('🎯 CLICK en carrito registrado!');
        evento.preventDefault();
        evento.stopPropagation();
        
        // Llamar a toggleCart que YA EXISTE en tu código
        if (typeof toggleCart === 'function') {
            toggleCart();
        } else {
            console.error('❌ toggleCart no existe, usando lógica manual');
            
            const panel = document.getElementById('cartPanel');
            const overlay = document.getElementById('cartOverlay');
            
            if (panel && overlay) {
                if (panel.classList.contains('active')) {
                    // CERRAR
                    panel.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                } else {
                    // ABRIR
                    overlay.style.display = 'block';
                    setTimeout(() => {
                        panel.classList.add('active');
                        overlay.classList.add('active');
                        document.body.style.overflow = 'hidden';
                        if (typeof updateCartUI === 'function') {
                            updateCartUI();
                        }
                    }, 10);
                }
            }
        }
    });
    
    console.log('✅ Botón del carrito ARREGLADO definitivamente');
}

// Ejecutar después de que todo cargue
setTimeout(function() {
    console.log('⏰ Iniciando arreglo automático...');
    arreglarBotonCarrito();
    
    // También arreglar el botón de cerrar (X) por si acaso
    const botonCerrar = document.getElementById('closeCart');
    if (botonCerrar) {
        botonCerrar.addEventListener('click', function() {
            console.log('❌ Click en botón cerrar carrito');
            if (typeof hideCartPanel === 'function') {
                hideCartPanel();
            } else if (typeof toggleCart === 'function') {
                toggleCart();
            }
        });
    }
    
    // Arreglar overlay
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            console.log('🎯 Click en overlay');
            if (typeof hideCartPanel === 'function') {
                hideCartPanel();
            } else if (typeof toggleCart === 'function') {
                toggleCart();
            }
        });
    }
    
    console.log('🎉 Sistema de carrito COMPLETAMENTE ARREGLADO');
}, 2000);
