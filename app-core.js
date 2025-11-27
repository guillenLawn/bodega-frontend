// ===== CONFIGURACIÓN Y CONSTANTES =====
const API_URL = 'https://bodega-backend-4md3.onrender.com/api/inventory';
const AUTH_API = 'https://bodega-backend-4md3.onrender.com/api/auth';
const PEDIDOS_API = 'https://bodega-backend-4md3.onrender.com/api/pedidos';

// ===== ESTADO GLOBAL =====
let cart = [];
let products = [];
let currentFilter = 'all';
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let currentUser = null;
let authToken = localStorage.getItem('bodega_token');
let currentView = 'catalogo';

// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAuth();
    initializeNavigation();
});

function initializeApp() {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
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
