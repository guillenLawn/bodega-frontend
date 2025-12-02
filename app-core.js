// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_BASE_URL = 'https://bodega-backend-nuevo.onrender.com';
const API_URL = `${API_BASE_URL}/api/inventory`;
const AUTH_API = `${API_BASE_URL}/api/auth`;
const PEDIDOS_API = `${API_BASE_URL}/api/pedidos`;

// ===== ESTADO GLOBAL =====
window.cart = [];
window.products = [];
window.currentUser = null;
window.authToken = localStorage.getItem('bodega_token');
window.currentView = 'catalogo';
window.isAdminMode = false;
window.currentCategory = 'todos'; // ← AGREGADO para sincronizar con app-pedidos

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    
    try {
        // 1. Inicializar autenticación
        await initializeAuth();
        
        // 2. Inicializar navegación y vistas
        initializeNavigation();
        
        // 3. Cargar productos
        await loadProducts();
        
        // 4. Configurar listeners
        setupEventListeners();
        
        // 5. Cargar carrito
        loadCartFromStorage();
        updateCartUI();
        
        // 6. Mostrar vista guardada o catálogo por defecto
        const savedView = localStorage.getItem('bodega_current_view') || 'catalogo';
        showView(savedView);
        
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        showNotification('❌ Error al cargar la aplicación', 'error');
    }
}

// ===== FUNCIONES DE UTILIDAD =====
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showNotification(message, type = 'success') {
    // Eliminar notificaciones existentes
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
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
    notification.setAttribute('role', 'alert');
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== SISTEMA DE VISTAS =====
function showView(viewName) {
    console.log('🎯 Cambiando a vista:', viewName);
    
    // Validar permisos para admin
    if (viewName === 'admin') {
        if (!window.currentUser || window.currentUser.role !== 'admin') {
            showNotification('🔐 No tienes permisos de administrador', 'error');
            return;
        }
    }
    
    // Guardar vista actual
    localStorage.setItem('bodega_current_view', viewName);
    window.currentView = viewName;
    
    // Ocultar todas las vistas
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.remove('active');
    });
    
    // Mostrar vista seleccionada
    const targetView = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (targetView) {
        targetView.classList.add('active');
        
        // Acciones específicas por vista
        switch(viewName) {
            case 'historial':
                if (typeof loadHistorialPedidos === 'function') loadHistorialPedidos();
                break;
            case 'catalogo':
                document.getElementById('filtersSidebar').style.display = 'block';
                if (typeof window.renderProductsByCategory === 'function') {
                    window.renderProductsByCategory();
                }
                break;
            case 'admin':
                if (typeof initializeAdminView === 'function') {
                    initializeAdminView();
                }
                break;
        }
        
        // Ajustar layout
        adjustLayoutForView(viewName);
        updateNavigationState();
    }
}

function adjustLayoutForView(viewName) {
    const mainContainer = document.querySelector('.main-container');
    const filtersSidebar = document.getElementById('filtersSidebar');
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    
    if (!mainContainer) return;
    
    if (viewName === 'catalogo') {
        mainContainer.style.gridTemplateColumns = '280px 1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'block';
        if (searchBar) searchBar.style.display = 'flex';
        if (cartToggle) cartToggle.style.display = 'flex';
    } else if (viewName === 'admin') {
        mainContainer.style.gridTemplateColumns = '1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'none';
        if (searchBar) searchBar.style.display = 'none';
        if (cartToggle) cartToggle.style.display = 'none';
    } else {
        mainContainer.style.gridTemplateColumns = '1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'none';
        if (searchBar) searchBar.style.display = 'flex';
        if (cartToggle) cartToggle.style.display = 'flex';
    }
}

function updateNavigationState() {
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-view="${window.currentView}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// ===== SISTEMA DE ADMINISTRADOR =====
function checkAdminMode() {
    const userData = localStorage.getItem('bodega_user');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const isAdmin = user.role === 'admin' || user.email === 'admin@bodega.com';
            
            if (isAdmin) {
                enableAdminMode();
            } else {
                disableAdminMode();
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            disableAdminMode();
        }
    } else {
        disableAdminMode();
    }
}

function enableAdminMode() {
    window.isAdminMode = true;
    document.body.classList.add('admin-mode');
    
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) adminMenuItem.style.display = 'block';
    
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'none';
    if (cartToggle) cartToggle.style.display = 'none';
    if (filtersSidebar) filtersSidebar.style.display = 'none';
    
    console.log('🔧 Modo administrador activado');
}

function disableAdminMode() {
    window.isAdminMode = false;
    document.body.classList.remove('admin-mode');
    
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) adminMenuItem.style.display = 'none';
    
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'flex';
    if (cartToggle) cartToggle.style.display = 'flex';
    if (filtersSidebar) filtersSidebar.style.display = 'block';
    
    if (window.currentView === 'admin') {
        showView('catalogo');
    }
    
    console.log('🔧 Modo administrador desactivado');
}

function showAdminView() {
    showView('admin');
}

// ===== GESTIÓN DE PRODUCTOS (ADMIN) =====
async function loadAdminProducts() {
    const tableBody = document.getElementById('adminProductsTable');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="loading-spinner"></div></td></tr>';
        
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const products = await response.json();
        
        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos registrados</td></tr>';
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
                <td><span class="category-badge">${escapeHtml(product.category)}</span></td>
                <td><strong class="price">S/ ${parseFloat(product.price).toFixed(2)}</strong></td>
                <td><span class="stock ${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">${product.quantity}</span></td>
                <td><span class="status-badge ${product.quantity > 0 ? 'active' : 'inactive'}">${product.quantity > 0 ? 'Activo' : 'Sin Stock'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditProductModal('${product.id || product._id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" onclick="openDeleteProductModal('${product.id || product._id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        updateAdminStats();
        
    } catch (error) {
        console.error('Error cargando productos admin:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center error">Error al cargar productos</td></tr>';
    }
}

async function loadAdminOrders() {
    const tableBody = document.getElementById('adminOrdersTable');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="loading-spinner"></div></td></tr>';
        
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
        
        const data = await response.json();
        const orders = data.orders || data || [];
        
        if (!Array.isArray(orders) || orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay pedidos en el sistema</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        orders.forEach(order => {
            const total = order.items?.reduce((sum, item) => sum + ((item.precio || item.price || 0) * (item.cantidad || item.quantity || 0)), 0) || 0;
            const productCount = order.items?.length || 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>#${order.id || order._id || 'N/A'}</strong></td>
                <td>
                    <div class="user-info-cell">
                        <strong>${escapeHtml(order.userName || 'Cliente')}</strong>
                        <small>${escapeHtml(order.userEmail || '')}</small>
                    </div>
                </td>
                <td><span class="product-count">${productCount} producto(s)</span></td>
                <td><strong class="price">S/ ${total.toFixed(2)}</strong></td>
                <td>${new Date(order.fecha || order.createdAt).toLocaleDateString()}</td>
                <td><span class="status-badge estado-${order.estado || 'pendiente'}">${getStatusText(order.estado)}</span></td>
                <td><button class="btn-view" onclick="viewOrderDetails('${order.id || order._id || ''}')"><i class="fas fa-eye"></i></button></td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando pedidos admin:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center error">Error al cargar pedidos</td></tr>';
    }
}

function updateAdminStats() {
    const totalProducts = window.products.length;
    const totalRevenue = window.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalOrders').textContent = '0';
    document.getElementById('totalUsers').textContent = '0';
    document.getElementById('revenue').textContent = `S/ ${totalRevenue.toFixed(2)}`;
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

// ===== GESTIÓN DEL CARRITO =====
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('bodega_cart');
    if (savedCart) {
        try {
            window.cart = JSON.parse(savedCart);
            console.log('Carrito cargado desde localStorage:', window.cart.length, 'productos');
        } catch (error) {
            console.error('Error cargando carrito:', error);
            window.cart = [];
        }
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('bodega_cart', JSON.stringify(window.cart));
    } catch (error) {
        console.error('Error guardando carrito:', error);
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const btnPedir = document.getElementById('btnPedir');

    // Actualizar contador
    const totalItems = window.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Actualizar lista de productos
    if (cartItems) {
        if (window.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart-modern">
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
            
            window.cart.forEach(item => {
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
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                            <span class="cart-item-quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                            <button class="remove-item" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button>
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

    // Actualizar total
    const total = window.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    if (totalAmount) {
        totalAmount.textContent = `S/ ${total.toFixed(2)}`;
    }
}

function addToCart(productId) {
    const product = window.products.find(p => p.id == productId);
    if (!product) return;
    
    // Verificar stock
    if (product.quantity <= 0) {
        showNotification('❌ Producto sin stock disponible', 'error');
        return;
    }
    
    const existingItem = window.cart.find(item => item.id == productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
            showNotification('❌ No hay más stock disponible', 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        window.cart.push({
            id: product.id,
            nombre: product.nombre,
            precio: parseFloat(product.precio),
            quantity: 1,
            categoria: product.categoria
        });
    }
    
    saveCartToStorage();
    updateCartUI();
    showNotification('✅ Producto agregado al carrito');
}

function removeFromCart(productId) {
    window.cart = window.cart.filter(item => item.id != productId);
    saveCartToStorage();
    updateCartUI();
    showNotification('🗑️ Producto removido del carrito');
}

function updateQuantity(productId, change) {
    const item = window.cart.find(item => item.id == productId);
    if (!item) return;

    const originalProduct = window.products.find(p => p.id == productId);
    
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

// ===== REALIZAR PEDIDO (CORREGIDO CON ACTUALIZACIÓN DE STOCK) =====
async function realizarPedido() {
    if (window.cart.length === 0) return;
    
    if (!window.currentUser) {
        showNotification('🔐 Inicia sesión para realizar pedidos', 'info');
        if (typeof showAuthModal === 'function') showAuthModal('login');
        return;
    }
    
    try {
        // Preparar datos del pedido (igual que antes)
        const pedidoData = {
            items: window.cart.map(item => ({
                id: item.id,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.quantity
            })),
            total: window.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0),
            userId: window.currentUser.id,
            userName: window.currentUser.nombre,
            userEmail: window.currentUser.email,
            direccion: 'Delivery a domicilio', // Puedes cambiar esto
            metodoPago: 'efectivo'
        };
        
        console.log('📤 Enviando pedido al backend:', pedidoData);
        
        // Enviar pedido al backend
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken}`
            },
            body: JSON.stringify(pedidoData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del backend:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Pedido creado en backend:', result);
        
        // El backend YA actualizó el stock automáticamente
        // Solo necesitamos actualizar localmente para reflejar los cambios
        
        // Actualizar stock localmente basado en el carrito
        window.cart.forEach(item => {
            const product = window.products.find(p => p.id == item.id);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
                console.log(`📉 Stock actualizado localmente: ${product.nombre} - Nuevo: ${product.stock}`);
            }
        });
        
        // Limpiar carrito
        window.cart = [];
        saveCartToStorage();
        updateCartUI();
        hideCartPanel();
        
        // Actualizar vistas
        if (window.currentView === 'catalogo') {
            setTimeout(() => {
                if (typeof window.renderProductsByCategory === 'function') {
                    window.renderProductsByCategory();
                }
            }, 500);
        }
        
        if (window.currentView === 'admin' && typeof loadAdminProducts === 'function') {
            setTimeout(loadAdminProducts, 500);
        }
        
        showNotification('✅ Pedido realizado exitosamente - Stock actualizado');
        
    } catch (error) {
        console.error('❌ Error completo realizando pedido:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

// ===== CONTROL DEL PANEL DEL CARRITO =====
function showCartPanel() {
    if (window.isAdminMode && window.currentView === 'admin') {
        showNotification('🔧 El carrito está deshabilitado en modo administrador', 'info');
        return;
    }
    
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartPanel && cartOverlay) {
        cartOverlay.style.display = 'block';
        setTimeout(() => {
            cartPanel.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateCartUI();
        }, 10);
    }
}

function hideCartPanel() {
    const cartPanel = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (cartPanel && cartOverlay) {
        cartPanel.classList.remove('active');
        cartOverlay.classList.remove('active');
        setTimeout(() => {
            cartOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

function toggleCart() {
    const cartPanel = document.getElementById('cartPanel');
    
    if (cartPanel && cartPanel.classList.contains('active')) {
        hideCartPanel();
    } else {
        showCartPanel();
    }
}

// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
function setupEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    // Botón del carrito
    const cartBtn = document.getElementById('cartToggle');
    if (cartBtn) {
        cartBtn.addEventListener('click', toggleCart);
    }
    
    // Botón cerrar carrito
    const closeBtn = document.getElementById('closeCart');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideCartPanel);
    }
    
    // Overlay del carrito
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.addEventListener('click', hideCartPanel);
    }
    
    // Botón realizar pedido
    const btnPedir = document.getElementById('btnPedir');
    if (btnPedir) {
        btnPedir.addEventListener('click', realizarPedido);
    }
    
    // Navegación
    document.addEventListener('click', function(e) {
        const viewBtn = e.target.closest('[data-view]');
        if (viewBtn) {
            e.preventDefault();
            const viewName = viewBtn.getAttribute('data-view');
            showView(viewName);
        }
        
        if (e.target.closest('.admin-option')) {
            e.preventDefault();
            showAdminView();
        }
    });
}

// ===== FUNCIONES DE PRODUCTOS =====
async function loadProducts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        window.products = await response.json();
        console.log('Productos cargados:', window.products.length);
        
        // Si hay una función de renderizado, llamarla
        if (typeof window.renderProductsByCategory === 'function') {
            window.renderProductsByCategory();
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        showNotification('❌ Error al cargar productos', 'error');
    }
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
        'Conservas': 'can',
        'Abarrotes': 'box',
        'Lácteos y Carnes': 'cheese'
    };
    return icons[category] || 'box';
}

// ===== FUNCIONES QUE SE COMPARTEN =====
function initializeNavigation() {
    console.log('🔧 Inicializando navegación...');
}

function loadHistorialPedidos() {
    console.log('📋 Cargando historial de pedidos...');
    // Esta función se implementará completamente en app-pedidos.js
}

function initializeAdminView() {
    console.log('🔧 Inicializando vista admin...');
    // Esta función se implementará completamente en app-pedidos.js
}

// ===== INICIALIZAR AUTENTICACIÓN (placeholder) =====
async function initializeAuth() {
    console.log('🔐 Inicializando autenticación...');
    // Esta función está en app-auth.js
}

function showAuthModal(type) {
    console.log('🔐 Mostrando modal de autenticación:', type);
    // Esta función está en app-auth.js
}

// ===== CSS DINÁMICO =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 10px auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .notification {
        animation: slideInRight 0.3s ease;
    }
    
    .estado-completado { background: #D1FAE5; color: #065F46; }
    .estado-pendiente { background: #FEF3C7; color: #92400E; }
    .estado-cancelado { background: #FEE2E2; color: #991B1B; }
    .estado-en_camino { background: #DBEAFE; color: #1E40AF; }
    
    .admin-mode .search-bar,
    .admin-mode .cart-icon-nav {
        display: none !important;
    }
    
    .admin-mode .navbar {
        border-bottom: 3px solid #dc2626;
    }
`;
document.head.appendChild(style);

// ===== EXPONER FUNCIONES GLOBALES =====
window.showView = showView;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.realizarPedido = realizarPedido;
window.toggleCart = toggleCart;
window.showCartPanel = showCartPanel;
window.hideCartPanel = hideCartPanel;
window.loadAdminProducts = loadAdminProducts;
window.loadAdminOrders = loadAdminOrders;
window.getProductIcon = getProductIcon;
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.getStatusText = getStatusText;

console.log('✅ app-core.js cargado correctamente');
