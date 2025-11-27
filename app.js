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

// ✅ Inicializar la aplicación CON NAVEGACIÓN ACTUALIZADA
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAuth();
    initializeNavigation(); // 🆕 ACTUALIZADO
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
    closeCart();
}

// ✅ 🆕 NUEVO: Cambiar pestañas en el modal de perfil
function switchTab(tabName) {
    // Actualizar botones de pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    
    // Actualizar contenido de pestañas
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
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
                
                document.getElementById('totalPedidos').textContent = totalPedidos;
                document.getElementById('totalGastado').textContent = `S/ ${totalGastado.toFixed(2)}`;
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
        historialContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar el historial</h3>
                <p>Intenta recargar la página</p>
            </div>
        `;
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

// ===== SISTEMA DE AUTENTICACIÓN (MANTENIDO) =====

function initializeAuth() {
    setupAuthEventListeners();
    checkExistingAuth();
}

function setupAuthEventListeners() {
    // Botones de login/registro
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('showRegister').addEventListener('click', showRegisterModal);
    document.getElementById('showLogin').addEventListener('click', showLoginModal);
    
    // Cerrar modales
    document.getElementById('closeLoginModal').addEventListener('click', hideAuthModals);
    document.getElementById('closeRegisterModal').addEventListener('click', hideAuthModals);
    document.getElementById('authOverlay').addEventListener('click', hideAuthModals);
    
    // Formularios
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Menú de usuario
    document.getElementById('userBtn').addEventListener('click', toggleUserDropdown);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
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

function showLoginModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideUserDropdown();
    
    document.getElementById('authOverlay').classList.add('active');
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginForm').reset();
}

function showRegisterModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    document.getElementById('authOverlay').classList.add('active');
    document.getElementById('registerModal').classList.add('active');
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('registerForm').reset();
}

function hideAuthModals() {
    document.getElementById('authOverlay').classList.remove('active');
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('registerModal').classList.remove('active');
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
            hideAuthModals();
            showNotification(`✅ Bienvenido, ${currentUser.nombre}!`);
            
            // 🆕 ACTUALIZADO: Recargar perfil si está abierto
            if (document.getElementById('perfilModal').classList.contains('active')) {
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
    hideUserDropdown();
    showNotification('👋 Sesión cerrada correctamente');
    
    // 🆕 ACTUALIZADO: Actualizar perfil si está abierto
    if (document.getElementById('perfilModal').classList.contains('active')) {
        showHistorialNotLogged();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        userName.textContent = currentUser.nombre.split(' ')[0];
        dropdownUserName.textContent = currentUser.nombre;
        dropdownUserEmail.textContent = currentUser.email;
    } else {
        loginBtn.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

function hideUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('active');
}

// ===== SISTEMA DE PRODUCTOS Y CARRITO (MANTENIDO) =====

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

    document.addEventListener('click', function(e) {
        const searchBar = document.querySelector('.search-bar');
        if (!searchBar.contains(e.target)) {
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
                
                btnPedir.disabled = false;
                btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
                
                loadProducts();
                
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
`;
document.head.appendChild(style);

function initializeProductAnimations() {
    const productCards = document.querySelectorAll('.product-card-modern');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

setTimeout(initializeProductAnimations, 100);
