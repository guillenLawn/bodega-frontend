// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_BASE_URL = 'https://bodega-backend-nuevo.onrender.com';
const API_URL = `${API_BASE_URL}/api/inventory`;
const AUTH_API = `${API_BASE_URL}/api/auth`;
const PEDIDOS_API = `${API_BASE_URL}/api/pedidos`;

// ===== CONFIGURACIÓN YAPE =====
const YAPE_NUMBER = '937331592'; // 🆕 Cambia este número por tu Yape real
const YAPE_NAME = 'BODEGA GUADALUPE';

// ===== ESTADO GLOBAL =====
window.cart = [];
window.products = [];
window.currentUser = null;
window.authToken = localStorage.getItem('bodega_token');
window.currentView = 'catalogo';
window.isAdminMode = false;
window.currentCategory = 'todos';

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
            case 'productoDetalle':
                const detalleContainer = document.getElementById('productoDetalleContainer');
                if (detalleContainer) {
                    detalleContainer.innerHTML = '<div class="detalle-loading"><i class="fas fa-spinner fa-spin"></i><p>Cargando detalles...</p></div>';
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
            const precioNumero = parseFloat(product.precio) || 0;
            const stockNumero = parseInt(product.stock) || 0;
            const categoria = product.categoria || 'Sin categoría';
            
            row.innerHTML = `
                <td>
                    <div class="product-info-cell">
                        <div class="product-avatar">
                            <i class="fas fa-${getProductIcon(categoria)}"></i>
                        </div>
                        <div class="product-details">
                            <strong>${escapeHtml(product.nombre)}</strong>
                            ${product.descripcion ? `<small>${escapeHtml(product.descripcion)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge">${escapeHtml(categoria)}</span>
                </td>
                <td>
                    <strong class="price">S/ ${precioNumero.toFixed(2)}</strong>
                </td>
                <td>
                    <span class="stock ${stockNumero > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${stockNumero}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${stockNumero > 0 ? 'active' : 'inactive'}">
                        ${stockNumero > 0 ? 'Activo' : 'Sin Stock'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="openEditProductModal('${product.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="openDeleteProductModal('${product.id}')" title="Eliminar">
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

async function updateAdminStats() {
    console.log('📊 Actualizando estadísticas del admin...');
    
    let stats = {
        totalProductos: window.products?.length || 0,
        totalPedidos: 0,
        totalUsuarios: 0,
        ingresosTotales: 0
    };
    
    try {
        if (window.currentUser && window.currentUser.role === 'admin' && window.authToken) {
            console.log('🌐 Solicitando estadísticas al backend...');
            
            const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/estadisticas', {
                headers: {
                    'Authorization': `Bearer ${window.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📊 Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Estadísticas recibidas del backend:', data);
                
                if (data.estadisticas) {
                    stats = {
                        totalProductos: data.estadisticas.totalProductos || window.products?.length || 0,
                        totalPedidos: data.estadisticas.totalPedidos || 0,
                        totalUsuarios: data.estadisticas.totalUsuarios || 0,
                        ingresosTotales: parseFloat(data.estadisticas.ingresosTotales) || 0
                    };
                } else if (data.totalProductos) {
                    stats = {
                        totalProductos: data.totalProductos || window.products?.length || 0,
                        totalPedidos: data.totalPedidos || 0,
                        totalUsuarios: data.totalUsuarios || 0,
                        ingresosTotales: parseFloat(data.ingresosTotales) || 0
                    };
                }
            } else {
                console.warn('⚠️ No se pudieron obtener estadísticas del backend, usando valores por defecto');
            }
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo estadísticas:', error.message);
    }
    
    console.log('🎯 Estadísticas a mostrar:', stats);
    
    const totalProductsEl = document.getElementById('totalProducts');
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalUsersEl = document.getElementById('totalUsers');
    const revenueEl = document.getElementById('revenue');
    
    if (totalProductsEl) {
        totalProductsEl.textContent = stats.totalProductos;
        console.log(`✅ Productos: ${stats.totalProductos}`);
    }
    
    if (totalOrdersEl) {
        totalOrdersEl.textContent = stats.totalPedidos;
        console.log(`✅ Pedidos: ${stats.totalPedidos}`);
    }
    
    if (totalUsersEl) {
        totalUsersEl.textContent = stats.totalUsuarios;
        console.log(`✅ Usuarios: ${stats.totalUsuarios}`);
    }
    
    if (revenueEl) {
        revenueEl.textContent = `S/ ${stats.ingresosTotales.toFixed(2)}`;
        console.log(`✅ Ingresos: S/ ${stats.ingresosTotales.toFixed(2)}`);
    }
    
    console.log('✅ Estadísticas del admin actualizadas correctamente');
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

    const totalItems = window.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

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

    const total = window.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    if (totalAmount) {
        totalAmount.textContent = `S/ ${total.toFixed(2)}`;
    }
}

function addToCart(productId) {
    const product = window.products.find(p => p.id == productId);
    if (!product) return;
    
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

// ===== 🆕 REALIZAR PEDIDO CON YAPE =====
async function realizarPedido() {
    if (window.cart.length === 0) return;
    
    if (!window.currentUser) {
        showNotification('🔐 Inicia sesión para realizar pedidos', 'info');
        if (typeof showAuthModal === 'function') showAuthModal('login');
        return;
    }
    
    // Calcular total
    const total = window.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    
    // Mostrar modal de pago Yape
    showYapeModal(total);
}

// ===== 🆕 FUNCIONES DE PAGO YAPE =====
function showYapeModal(total) {
    console.log('💰 Mostrando modal Yape para total:', total);
    
    const yapeModal = document.getElementById('yapeModal');
    const yapeOverlay = document.getElementById('yapeOverlay');
    const closeBtn = document.getElementById('closeYapeModal');
    
    if (!yapeModal || !yapeOverlay) {
        console.error('❌ No se encontró el modal Yape');
        return;
    }
    
    // Actualizar información en el modal
    document.getElementById('yapeAmount').textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById('yapePhone').textContent = YAPE_NUMBER;
    
    // Generar QR con el monto
    generateYapeQR(total);
    
    // Mostrar modal
    yapeOverlay.style.display = 'block';
    yapeModal.style.display = 'block';
    
    setTimeout(() => {
        yapeOverlay.classList.add('active');
        yapeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }, 10);
    
    // Event listeners para cerrar
    if (closeBtn) {
        closeBtn.addEventListener('click', hideYapeModal);
    }
    yapeOverlay.addEventListener('click', hideYapeModal);
    
    // También cerrar con ESC
    document.addEventListener('keydown', function handleEsc(e) {
        if (e.key === 'Escape') {
            hideYapeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    });
}

function hideYapeModal() {
    const yapeModal = document.getElementById('yapeModal');
    const yapeOverlay = document.getElementById('yapeOverlay');
    
    if (!yapeModal || !yapeOverlay) return;
    
    yapeOverlay.classList.remove('active');
    yapeModal.classList.remove('active');
    
    setTimeout(() => {
        yapeOverlay.style.display = 'none';
        yapeModal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function generateYapeQR(total) {
    const qrImage = document.getElementById('yapeQrImage');
    const qrLoading = document.getElementById('qrLoading');
    const qrCaption = document.querySelector('.qr-caption');
    
    if (!qrImage || !qrLoading) return;
    
    // 🎯 TU QR ESTÁTICO DE CLOUDINARY
    const QR_ESTATICO_URL = 'https://res.cloudinary.com/dbptiljzk/image/upload/v1764742067/codigo_numero_np7uds.png';
    
    console.log('🔗 Cargando QR estático:', QR_ESTATICO_URL);
    
    // Mostrar loading
    qrLoading.style.display = 'flex';
    qrImage.style.display = 'none';
    
    // Actualizar instrucciones
    if (qrCaption) {
        qrCaption.innerHTML = `
            <i class="fas fa-qrcode"></i> 
            Escanéame con Yape<br>
            <small>Luego ingresa <strong>S/ ${total.toFixed(2)}</strong></small>
        `;
    }
    
    // Cargar tu QR estático
    qrImage.src = QR_ESTATICO_URL;
    
    // Configurar timeout por si tarda
    const timeout = setTimeout(() => {
        if (qrLoading.style.display !== 'none') {
            mostrarBackupQR(total);
        }
    }, 3000);
    
    qrImage.onload = function() {
        clearTimeout(timeout);
        qrLoading.style.display = 'none';
        qrImage.style.display = 'block';
        console.log('✅ QR estático cargado correctamente');
        
        // Agregar efecto de carga suave
        qrImage.style.opacity = '0';
        setTimeout(() => {
            qrImage.style.transition = 'opacity 0.5s ease';
            qrImage.style.opacity = '1';
        }, 100);
    };
    
    qrImage.onerror = function() {
        clearTimeout(timeout);
        console.error('❌ Error cargando QR estático');
        mostrarBackupQR(total);
    };
}

function mostrarBackupQR(total) {
    const qrLoading = document.getElementById('qrLoading');
    const qrImage = document.getElementById('yapeQrImage');
    
    if (!qrLoading) return;
    
    qrLoading.innerHTML = `
        <div class="backup-qr">
            <div class="backup-header">
                <i class="fas fa-mobile-alt"></i>
                <h4>Pago con Yape</h4>
            </div>
            
            <div class="backup-number-display">
                <div class="number-label">Número Yape:</div>
                <div class="number-value">${YAPE_NUMBER}</div>
                <button class="btn-copy-small" onclick="copyYapeNumber()">
                    <i class="fas fa-copy"></i> Copiar
                </button>
            </div>
            
            <div class="backup-amount">
                <div class="amount-label">Monto a enviar:</div>
                <div class="amount-value">S/ ${total.toFixed(2)}</div>
            </div>
            
            <div class="backup-steps">
                <p><strong>Instrucciones:</strong></p>
                <ol>
                    <li>Abre la app <strong>Yape</strong></li>
                    <li>Ingresa el número: <strong>${YAPE_NUMBER}</strong></li>
                    <li>Pon el monto: <strong>S/ ${total.toFixed(2)}</strong></li>
                    <li>Envía el pago</li>
                    <li>Guarda el comprobante</li>
                </ol>
            </div>
        </div>
    `;
    
    if (qrImage) {
        qrImage.style.display = 'none';
    }
}

function mostrarQRAlternativo(numero, total) {
    const qrLoading = document.getElementById('qrLoading');
    const qrImage = document.getElementById('yapeQrImage');
    
    if (!qrLoading) return;
    
    qrLoading.innerHTML = `
        <div class="qr-alternative">
            <div class="alternative-number">
                <i class="fas fa-phone"></i>
                <h4>Número Yape</h4>
                <div class="big-number">${numero}</div>
                <p class="amount-info">Monto a pagar: <strong>S/ ${total.toFixed(2)}</strong></p>
            </div>
            <div class="alternative-instructions">
                <p><i class="fas fa-mobile-alt"></i> <strong>Instrucción rápida:</strong></p>
                <p>1. Abre Yape</p>
                <p>2. Ingresa este número</p>
                <p>3. Pon el monto: <strong>S/ ${total.toFixed(2)}</strong></p>
                <p>4. Envía el pago</p>
            </div>
        </div>
    `;
    
    if (qrImage) {
        qrImage.style.display = 'none';
    }
}

function copyYapeNumber() {
    const yapeNumber = YAPE_NUMBER;
    
    // Usar Clipboard API
    navigator.clipboard.writeText(yapeNumber).then(function() {
        showNotification('✅ Número copiado al portapapeles', 'success');
        
        // Animación en el botón
        const copyBtn = document.querySelector('.btn-copy');
        if (copyBtn) {
            copyBtn.classList.add('copied-animation');
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            
            setTimeout(() => {
                copyBtn.classList.remove('copied-animation');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        }
    }).catch(function(err) {
        console.error('Error copiando:', err);
        showNotification('❌ Error al copiar', 'error');
    });
}

async function confirmarPagoYape() {
    const total = window.cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    
    // Mostrar confirmación
    if (!confirm(`¿Confirmas que ya realizaste el pago de S/ ${total.toFixed(2)} por Yape?\n\nRecuerda guardar el comprobante de pago.`)) {
        return;
    }
    
    // Deshabilitar botón
    const confirmBtn = document.getElementById('confirmYapeBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }
    
    try {
        // Crear pedido en el backend
        const pedidoData = {
            items: window.cart.map(item => ({
                id: item.id,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.quantity
            })),
            total: total,
            userId: window.currentUser.id,
            userName: window.currentUser.nombre,
            userEmail: window.currentUser.email,
            direccion: 'Delivery a domicilio',
            metodoPago: 'yape'
        };
        
        console.log('📤 Enviando pedido con pago Yape:', pedidoData);
        
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken}`
            },
            body: JSON.stringify(pedidoData)
        });
        
        if (!response.ok) {
            throw new Error('Error creando pedido');
        }
        
        const result = await response.json();
        console.log('✅ Pedido creado:', result);
        
        // Actualizar stock localmente
        window.cart.forEach(item => {
            const product = window.products.find(p => p.id == item.id);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
            }
        });
        
        // Limpiar carrito
        window.cart = [];
        saveCartToStorage();
        updateCartUI();
        hideCartPanel();
        hideYapeModal();
        
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
        
        showNotification('✅ ¡Pago confirmado! Tu pedido está siendo procesado.', 'success');
        
        // Mostrar mensaje final
        setTimeout(() => {
            alert('🎉 ¡Pedido realizado con éxito!\n\nTu pedido ha sido registrado y será procesado pronto.\nPuedes ver el estado en tu historial de compras.\n\n¡Gracias por tu compra en Bodega Guadalupe!');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error confirmando pago:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
        
        // Rehabilitar botón
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Pago';
        }
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
    
    // Botón realizar pedido (AHORA abre Yape)
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
}

function initializeAdminView() {
    console.log('🔧 Inicializando vista admin...');
}

// ===== INICIALIZAR AUTENTICACIÓN (placeholder) =====
async function initializeAuth() {
    console.log('🔐 Inicializando autenticación...');
}

function showAuthModal(type) {
    console.log('🔐 Mostrando modal de autenticación:', type);
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
    
    /* 🆕 Animación copiado */
    @keyframes copied {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    .copied-animation {
        animation: copied 0.3s ease;
    }
`;
document.head.appendChild(style);

// ===== EXPONER FUNCIONES GLOBALES =====
window.showView = showView;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.realizarPedido = realizarPedido; // ✅ Ahora abre modal Yape
window.toggleCart = toggleCart;
window.showCartPanel = showCartPanel;
window.hideCartPanel = hideCartPanel;
window.loadAdminProducts = loadAdminProducts;
window.loadAdminOrders = loadAdminOrders;
window.getProductIcon = getProductIcon;
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.getStatusText = getStatusText;

// 🆕 Funciones de Yape
window.showYapeModal = showYapeModal;
window.hideYapeModal = hideYapeModal;
window.confirmarPagoYape = confirmarPagoYape;
window.copyYapeNumber = copyYapeNumber;

console.log('✅ app-core.js cargado correctamente con Yape');
