// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_URL = 'https://bodega-backend-4md3.onrender.com/api/inventory';
const AUTH_API = 'https://bodega-backend-4md3.onrender.com/api/auth';
const PEDIDOS_API = 'https://bodega-backend-4md3.onrender.com/api/pedidos';
const ADMIN_API = 'https://bodega-backend-4md3.onrender.com/api/admin';

// ===== ESTADO GLOBAL =====
let cart = [];
let products = [];
let currentFilter = 'all';
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let currentUser = null;
let authToken = localStorage.getItem('bodega_token');
let currentView = 'catalogo';
let isAdminMode = false;

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAuth();
    initializeNavigation();
    initializeAdmin(); // 🔧 Nueva inicialización para admin
});

function initializeApp() {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
    checkAdminMode(); // 🔧 Verificar si es admin al cargar
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

// ===== 🔧 FUNCIONES DE ADMINISTRADOR =====
function initializeAdmin() {
    setupAdminEventListeners();
    setupAdminModals();
}

function checkAdminMode() {
    // Verificar si el usuario actual es admin
    const userData = localStorage.getItem('bodega_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (user.role === 'admin' || user.email === 'admin@bodega.com') {
                enableAdminMode();
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

function enableAdminMode() {
    isAdminMode = true;
    
    // Mostrar opción admin en menú usuario
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = 'block';
    }
    
    // Aplicar estilos de admin al body
    document.body.classList.add('admin-mode');
    
    // Ocultar elementos que no se usan en modo admin
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
    
    // Ocultar opción admin en menú usuario
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = 'none';
    }
    
    // Remover estilos de admin
    document.body.classList.remove('admin-mode');
    
    // Mostrar elementos normales
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'flex';
    if (cartToggle) cartToggle.style.display = 'flex';
    if (filtersSidebar) filtersSidebar.style.display = 'block';
    
    // Si está en vista admin, volver al catálogo
    if (currentView === 'admin') {
        switchView('catalogo');
    }
    
    console.log('🔧 Modo administrador desactivado');
}

function setupAdminEventListeners() {
    // Navegación entre pestañas del admin
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAdminTab(tabName);
        });
    });
    
    // Botones de actualización
    document.getElementById('refreshProducts')?.addEventListener('click', loadAdminProducts);
    document.getElementById('refreshOrders')?.addEventListener('click', loadAdminOrders);
    
    // Formulario agregar producto
    document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
    
    // Navegación desde el menú de usuario
    document.addEventListener('click', function(e) {
        if (e.target.closest('.admin-option')) {
            e.preventDefault();
            showAdminView();
        }
    });
}

function setupAdminModals() {
    // Modal editar producto
    document.getElementById('closeEditProductModal')?.addEventListener('click', closeEditProductModal);
    document.getElementById('cancelEditProduct')?.addEventListener('click', closeEditProductModal);
    document.getElementById('editProductOverlay')?.addEventListener('click', closeEditProductModal);
    document.getElementById('editProductForm')?.addEventListener('submit', handleEditProduct);
    
    // Modal eliminar producto
    document.getElementById('closeDeleteProductModal')?.addEventListener('click', closeDeleteProductModal);
    document.getElementById('cancelDeleteProduct')?.addEventListener('click', closeDeleteProductModal);
    document.getElementById('deleteProductOverlay')?.addEventListener('click', closeDeleteProductModal);
    document.getElementById('confirmDeleteProduct')?.addEventListener('click', handleDeleteProduct);
}

function switchAdminTab(tabName) {
    // Actualizar pestañas activas
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Activar pestaña seleccionada
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePane = document.getElementById(tabName);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePane) activePane.classList.add('active');
    
    // Cargar datos según la pestaña
    switch(tabName) {
        case 'gestion-productos':
            loadAdminProducts();
            break;
        case 'pedidos-sistema':
            loadAdminOrders();
            break;
        case 'agregar-producto':
            // Resetear formulario
            document.getElementById('addProductForm')?.reset();
            break;
    }
}

// ===== 🔧 MOSTRAR VISTA DE ADMINISTRADOR =====
function showAdminView() {
    // Ocultar todas las vistas
    hideAllViews();
    
    // Mostrar vista admin
    const adminView = document.getElementById('viewAdmin');
    if (adminView) {
        adminView.classList.add('active');
        currentView = 'admin';
        
        // Cargar datos del panel admin
        loadAdminPanelData();
        
        // Actualizar navegación
        updateNavigationState();
        
        console.log('📊 Vista de administrador activada');
    }
}

function loadAdminPanelData() {
    // Cargar productos para gestión
    loadAdminProducts();
    
    // Cargar pedidos del sistema
    loadAdminOrders();
    
    // Cargar estadísticas
    loadAdminStats();
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
        
        // Actualizar estadísticas
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
    // Actualizar estadísticas en el panel admin
    const totalProducts = products.length;
    const totalRevenue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalOrders').textContent = '0'; // Se actualizará con datos reales
    document.getElementById('totalUsers').textContent = '0'; // Se actualizará con datos reales
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
    // Navegación entre vistas
    document.addEventListener('click', function(e) {
        const viewBtn = e.target.closest('[data-view]');
        if (viewBtn) {
            e.preventDefault();
            const viewName = viewBtn.getAttribute('data-view');
            switchView(viewName);
        }
    });
}

function switchView(viewName) {
    // 🔧 Si es admin y quiere ver catálogo, mostrar panel admin
    if (isAdminMode && viewName === 'catalogo') {
        showAdminView();
        return;
    }
    
    hideAllViews();
    currentView = viewName;
    
    const viewElement = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (viewElement) {
        viewElement.classList.add('active');
    }
    
    updateNavigationState();
    
    // Cargar datos específicos de la vista
    switch(viewName) {
        case 'historial':
            loadHistorialPedidos();
            break;
        case 'admin':
            showAdminView();
            break;
        case 'catalogo':
            // Ya se cargan los productos al inicio
            break;
    }
}

function hideAllViews() {
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.remove('active');
    });
}

function updateNavigationState() {
    // Actualizar estado activo en navegación si es necesario
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-view="${currentView}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
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

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div id="emptyCart" class="empty-cart-modern">
                <i class="fas fa-shopping-bag"></i>
                <p>Tu carrito está vacío</p>
                <small>Agrega algunos productos</small>
            </div>
        `;
        btnPedir.disabled = true;
        btnPedir.classList.add('disabled');
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
        
        cartItems.innerHTML = cartHTML;
        btnPedir.disabled = false;
        btnPedir.classList.remove('disabled');
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalAmount.textContent = `S/ ${total.toFixed(2)}`;
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
    // 🔧 No mostrar carrito en modo admin
    if (isAdminMode && currentView === 'admin') {
        showNotification('🔧 El carrito está deshabilitado en modo administrador', 'info');
        return;
    }
    
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    cartPanel.classList.toggle('active');
    overlay.classList.toggle('active');
    document.querySelector('.main-container').classList.toggle('blurred');
    
    if (cartPanel.classList.contains('active')) {
        updateCartUI();
    }
}

function closeCart() {
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    cartPanel.classList.remove('active');
    overlay.classList.remove('active');
    document.querySelector('.main-container').classList.remove('blurred');
}

// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
function setupEventListeners() {
    // Carrito moderno
    document.getElementById('cartToggle').addEventListener('click', toggleCart);
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
    document.getElementById('btnPedir').addEventListener('click', realizarPedido);
    
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

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', function(e) {
        const searchBar = document.querySelector('.search-bar');
        if (!searchBar.contains(e.target)) {
            hideSuggestions();
        }
    });
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

// ===== FUNCIONES QUE FALTAN (para evitar errores) =====
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
    // Implementación básica - puedes expandir esto según tus necesidades
    console.log('Renderizando productos:', products);
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
    showNotification('✅ Producto agregado al carrito');
}

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
        
        const response = await fetch(PEDIDOS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(pedidoData)
        });
        
        if (!response.ok) throw new Error('Error al realizar pedido');
        
        const result = await response.json();
        showNotification('✅ Pedido realizado exitosamente');
        
        // Limpiar carrito
        cart = [];
        saveCartToStorage();
        updateCartUI();
        closeCart();
        
    } catch (error) {
        console.error('Error realizando pedido:', error);
        showNotification('❌ Error al realizar pedido', 'error');
    }
}

async function loadHistorialPedidos() {
    // Implementación básica del historial
    console.log('Cargando historial de pedidos...');
}

function handleFilterChange(e) {
    currentFilter = e.target.value;
    // Implementar filtrado de productos
}

function handleSearch() {
    // Implementar búsqueda
}

function handleSearchKeydown() {
    // Implementar navegación con teclado en búsqueda
}

function handleSearchFocus() {
    // Mostrar sugerencias
}

function handleSearchBlur() {
    // Ocultar sugerencias
}

function hideSuggestions() {
    // Ocultar sugerencias de búsqueda
}

function loadAdminStats() {
    // Cargar estadísticas del admin
    console.log('Cargando estadísticas del admin...');
}
