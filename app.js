const API_URL = 'https://bodega-backend-4md3.onrender.com/api/inventory';
const AUTH_API = 'https://bodega-backend-4md3.onrender.com/api/auth';
const PEDIDOS_API = 'https://bodega-backend-4md3.onrender.com/api/pedidos'; // 🆕 NUEVO

// Estado global de la aplicación
let cart = [];
let products = [];
let currentFilter = 'all';
let currentSuggestions = [];
let selectedSuggestionIndex = -1;
let currentUser = null;
let authToken = localStorage.getItem('bodega_token');
let currentView = 'catalogo'; // 🆕 NUEVO: Vista actual

// ✅ Inicializar la aplicación CON AUTENTICACIÓN Y NAVEGACIÓN
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAuth();
    initializeNavigation(); // 🆕 NUEVO: Inicializar navegación
});

function initializeApp() {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
}

// ✅ 🆕 NUEVO: Inicializar sistema de navegación
function initializeNavigation() {
    setupNavigationEventListeners();
    showView('catalogo'); // Vista por defecto
}

// ✅ 🆕 NUEVO: Configurar event listeners para navegación
function setupNavigationEventListeners() {
    // Navegación lateral
    document.querySelectorAll('.menu-item[data-view]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            showView(view);
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
}

// ✅ 🆕 NUEVO: Mostrar vista específica
function showView(viewName) {
    console.log('Cambiando a vista:', viewName);
    
    // Ocultar todas las vistas
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.remove('active');
    });
    
    // Remover activo de todos los items del menú
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar vista seleccionada
    const targetView = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (targetView) {
        targetView.classList.add('active');
        
        // Activar item del menú correspondiente
        const menuItem = document.querySelector(`.menu-item[data-view="${viewName}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }
        
        currentView = viewName;
        
        // Acciones específicas por vista
        switch(viewName) {
            case 'historial':
                loadHistorialPedidos();
                break;
            case 'catalogo':
                // Asegurar que los filtros sean visibles
                document.getElementById('filtersSidebar').style.display = 'block';
                break;
        }
        
        // Ajustar layout según la vista
        adjustLayoutForView(viewName);
    }
}

// ✅ 🆕 NUEVO: Ajustar layout según vista
function adjustLayoutForView(viewName) {
    const mainContainer = document.querySelector('.main-container');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (viewName === 'catalogo') {
        // Vista catálogo: mostrar filtros
        mainContainer.style.gridTemplateColumns = '280px 1fr';
        filtersSidebar.style.display = 'block';
    } else {
        // Otras vistas: ocultar filtros
        mainContainer.style.gridTemplateColumns = '1fr';
        filtersSidebar.style.display = 'none';
    }
}

// ✅ 🆕 NUEVO: Cargar historial de pedidos
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
                <button class="btn-back-catalog" data-view="catalogo">
                    <i class="fas fa-store"></i>
                    Volver al Catálogo
                </button>
            </div>
        `;
    }
}

// ✅ 🆕 NUEVO: Renderizar lista de pedidos
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

// ✅ 🆕 NUEVO: Renderizar items de un pedido
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

// ✅ Inicializar sistema de autenticación
function initializeAuth() {
    setupAuthEventListeners();
    checkExistingAuth();
}

// ✅ Configurar event listeners para autenticación
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

// ✅ Verificar autenticación existente
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
                
                // 🆕 NUEVO: Si estamos en historial, recargar
                if (currentView === 'historial') {
                    loadHistorialPedidos();
                }
            } else {
                // Token inválido, limpiar
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

// ✅ Mostrar modal de login
function showLoginModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideUserDropdown();
    
    document.getElementById('authOverlay').classList.add('active');
    document.getElementById('loginModal').classList.add('active');
    
    // Limpiar formularios
    document.getElementById('loginForm').reset();
}

// ✅ Mostrar modal de registro
function showRegisterModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    document.getElementById('authOverlay').classList.add('active');
    document.getElementById('registerModal').classList.add('active');
    document.getElementById('loginModal').classList.remove('active');
    
    // Limpiar formularios
    document.getElementById('registerForm').reset();
}

// ✅ Ocultar modales de autenticación
function hideAuthModals() {
    document.getElementById('authOverlay').classList.remove('active');
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('registerModal').classList.remove('active');
}

// ✅ Manejar login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validación básica
    if (!email || !password) {
        showNotification('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        // Mostrar estado de carga
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
            // Login exitoso
            authToken = data.token;
            currentUser = data.user;
            
            // Guardar token en localStorage
            localStorage.setItem('bodega_token', authToken);
            
            // Actualizar UI
            updateAuthUI();
            hideAuthModals();
            
            showNotification(`✅ Bienvenido, ${currentUser.nombre}!`);
            
            // 🆕 NUEVO: Si estamos en historial, recargar
            if (currentView === 'historial') {
                loadHistorialPedidos();
            }
            
            // Si hay productos en el carrito, podrías guardarlos para el usuario
            if (cart.length > 0) {
                showNotification('🛒 Tus productos del carrito están listos para pedir');
            }
            
        } else {
            // Error en login
            showNotification(`❌ ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('❌ Error de conexión', 'error');
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
    }
}

// ✅ Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('registerNombre').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validación básica
    if (!nombre || !email || !password) {
        showNotification('❌ Por favor completa todos los campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('❌ La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        // Mostrar estado de carga
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
            // Registro exitoso
            authToken = data.token;
            currentUser = data.user;
            
            // Guardar token en localStorage
            localStorage.setItem('bodega_token', authToken);
            
            // Actualizar UI
            updateAuthUI();
            hideAuthModals();
            
            showNotification(`✅ Cuenta creada exitosamente! Bienvenido, ${currentUser.nombre}`);
            
        } else {
            // Error en registro
            showNotification(`❌ ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification('❌ Error de conexión', 'error');
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Cuenta';
    }
}

// ✅ Manejar logout
function handleLogout() {
    // Limpiar datos de autenticación
    authToken = null;
    currentUser = null;
    localStorage.removeItem('bodega_token');
    
    // Actualizar UI
    updateAuthUI();
    hideUserDropdown();
    
    // 🆕 NUEVO: Si estamos en historial, recargar para mostrar mensaje de no logueado
    if (currentView === 'historial') {
        loadHistorialPedidos();
    }
    
    showNotification('👋 Sesión cerrada correctamente');
}

// ✅ Actualizar UI según estado de autenticación
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
    if (currentUser) {
        // Usuario autenticado
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        
        // Actualizar información del usuario
        userName.textContent = currentUser.nombre.split(' ')[0]; // Solo primer nombre
        dropdownUserName.textContent = currentUser.nombre;
        dropdownUserEmail.textContent = currentUser.email;
    } else {
        // Usuario no autenticado
        loginBtn.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// ✅ Toggle dropdown de usuario
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

// ✅ Ocultar dropdown de usuario
function hideUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('active');
}

// ✅ Configurar event listeners para autocompletado
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

// ✅ Manejar búsqueda con autocompletado
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

    // Filtrar productos para sugerencias
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );

    currentSuggestions = filteredProducts.slice(0, 8); // Máximo 8 sugerencias
    selectedSuggestionIndex = -1;

    if (currentSuggestions.length > 0) {
        showSuggestions(currentSuggestions, searchTerm);
    } else {
        showNoSuggestions();
    }
}

// ✅ Mostrar sugerencias
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

    // Agregar event listeners a las sugerencias
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

// ✅ Mostrar mensaje de no hay sugerencias
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

// ✅ Ocultar sugerencias
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.classList.remove('active');
    selectedSuggestionIndex = -1;
}

// ✅ Resaltar texto en sugerencias
function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// ✅ Manejar teclado en búsqueda
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
                // Búsqueda normal
                performSearch();
            }
            break;
            
        case 'Escape':
            hideSuggestions();
            break;
    }
}

// ✅ Actualizar sugerencia seleccionada
function updateSelectedSuggestion() {
    const suggestions = document.querySelectorAll('.suggestion-item');
    
    suggestions.forEach((suggestion, index) => {
        if (index === selectedSuggestionIndex) {
            suggestion.classList.add('selected');
            // Scroll a la sugerencia seleccionada
            suggestion.scrollIntoView({ block: 'nearest' });
        } else {
            suggestion.classList.remove('selected');
        }
    });

    // Actualizar input con texto de sugerencia seleccionada
    const searchInput = document.getElementById('searchInput');
    if (selectedSuggestionIndex >= 0) {
        const selectedProduct = currentSuggestions[selectedSuggestionIndex];
        searchInput.value = selectedProduct.name;
    }
}

// ✅ Seleccionar sugerencia
function selectSuggestion(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        // Agregar al carrito directamente
        addToCart(productId);
        
        // Limpiar búsqueda
        document.getElementById('searchInput').value = '';
        hideSuggestions();
        
        // Mostrar notificación
        showNotification(`✅ ${product.name} agregado al carrito`);
    }
}

// ✅ Realizar búsqueda completa
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

// ✅ Manejar focus en búsqueda
function handleSearchFocus() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm.length >= 2 && currentSuggestions.length > 0) {
        showSuggestions(currentSuggestions, searchTerm);
    }
}

// ✅ Manejar blur en búsqueda (con delay para permitir clicks)
function handleSearchBlur() {
    setTimeout(() => {
        hideSuggestions();
    }, 200);
}

// ✅ Cargar carrito desde localStorage
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

// ✅ Guardar carrito en localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('bodega_cart', JSON.stringify(cart));
        console.log('Carrito guardado en localStorage');
    } catch (error) {
        console.error('Error guardando carrito:', error);
    }
}

// ✅ Manejar cambio de filtros
function handleFilterChange(e) {
    const filterText = e.target.nextElementSibling.textContent.toLowerCase();
    
    // Actualizar estado activo visual
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });
    e.target.closest('.filter-option').classList.add('active');
    
    // Mapear texto del filtro a categorías
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

// ✅ Renderizar resultados de búsqueda
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

    // Agrupar por categoría para mantener la estructura
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
    
    // Agregar event listeners a los botones
    attachEventListenersToProducts();
}

// ✅ Cargar productos desde la API
async function loadProducts() {
    try {
        showLoadingState(true);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const data = await response.json();
        
        // Transformar datos del backend al formato del frontend
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

// ✅ Mostrar/ocultar estado de carga
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

// ✅ Renderizar productos por categoría
function renderProductsByCategory() {
    console.log('Renderizando productos por categoría...');
    console.log('Total de productos:', products.length);
    
    const catalogMain = document.querySelector('.catalog-main');
    
    // Filtrar productos según el filtro activo
    let filteredProducts = products;
    if (currentFilter !== 'all') {
        filteredProducts = filterProductsByCategory(products, currentFilter);
    }
    
    // Agrupar productos por categoría para el display
    const groupedProducts = groupProductsByCategory(filteredProducts);
    
    let catalogHTML = '';
    
    // Renderizar cada categoría que tenga productos
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
    
    // Agregar event listeners a los botones de agregar al carrito
    attachEventListenersToProducts();
}

// ✅ Filtrar productos por categoría
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

// ✅ Agrupar productos por categoría
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

// ✅ Obtener nombre display para categoría
function getCategoryDisplayName(categoryKey) {
    const names = {
        'abarrotes': 'Abarrotes Esenciales',
        'lacteos': 'Lácteos y Carnes Frescas',
        'bebidas': 'Bebidas y Refrescos',
        'limpieza': 'Limpieza y Hogar'
    };
    return names[categoryKey] || categoryKey;
}

// ✅ Obtener descripción para categoría
function getCategoryDescription(categoryKey) {
    const descriptions = {
        'abarrotes': 'Productos básicos de la más alta calidad',
        'lacteos': 'Frescura y calidad garantizada',
        'bebidas': 'Para todos los momentos',
        'limpieza': 'Cuidado y limpieza para tu familia'
    };
    return descriptions[categoryKey] || '';
}

// ✅ Crear HTML de tarjeta de producto
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

// ✅ Obtener icono según categoría
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

// ✅ Agregar event listeners a los productos
function attachEventListenersToProducts() {
    document.querySelectorAll('.btn-add-cart:not(.disabled)').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

// ✅ Funciones del Carrito
function addToCart(productId) {
    console.log('Agregando producto ID:', productId);
    
    const product = products.find(p => p.id == productId);
    if (!product) {
        console.log('Producto no encontrado con ID:', productId);
        showNotification('❌ Producto no encontrado', 'error');
        return;
    }

    // Verificar stock
    if (product.quantity <= 0) {
        showNotification('❌ Producto sin stock', 'error');
        return;
    }

    const existingItem = cart.find(item => item.id == productId);
    
    if (existingItem) {
        // Verificar que no exceda el stock disponible
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
        // Verificar stock al aumentar cantidad
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

// ✅ ACTUALIZAR INTERFAZ DEL CARRITO
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const emptyCart = document.getElementById('emptyCart');
    const btnPedir = document.getElementById('btnPedir');

    console.log('Actualizando UI del carrito. Productos en carrito:', cart.length);

    // Actualizar contador en el navbar
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';

    // Manejo completo del estado del carrito
    if (cart.length === 0) {
        // Carrito vacío
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
        // Reconstruir completamente los items del carrito
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

    // Actualizar total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalAmount.textContent = `S/ ${total.toFixed(2)}`;
}

// ✅ Control del panel del carrito MODERNO
function toggleCart() {
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    cartPanel.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Agregar efecto de blur al fondo
    document.querySelector('.main-container').classList.toggle('blurred');
    
    // Actualizar UI cuando se abre el carrito
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

// ✅ 🆕 NUEVO: REALIZAR PEDIDO MEJORADO CON CREACIÓN EN BD
async function realizarPedido() {
    // VERIFICAR AUTENTICACIÓN ANTES DE PROCEDER
    if (!currentUser) {
        showNotification('🔐 Por favor inicia sesión para realizar tu pedido', 'info');
        showLoginModal({ preventDefault: () => {} });
        return;
    }
    
    if (cart.length === 0) return;

    try {
        // Mostrar mensaje de procesamiento
        showNotification('⏳ Procesando pedido...', 'info');
        
        // Deshabilitar botón temporalmente
        const btnPedir = document.getElementById('btnPedir');
        btnPedir.disabled = true;
        btnPedir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        // 🆕 NUEVO: Crear pedido en la base de datos
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const pedidoData = {
            items: cart.map(item => ({
                id: item.id,
                nombre: item.name,
                cantidad: item.quantity,
                precio: item.price
            })),
            total: total,
            direccion: "Entrega en tienda", // Por defecto
            metodoPago: "efectivo" // Por defecto
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
            // 🆕 NUEVO: Actualizar stock en la base de datos
            const updatePromises = cart.map(async (item) => {
                const product = products.find(p => p.id == item.id);
                const newQuantity = product.quantity - item.quantity;
                
                console.log(`Actualizando producto ${product.name}: ${product.quantity} - ${item.quantity} = ${newQuantity}`);
                
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

            // Esperar a que todas las actualizaciones terminen
            await Promise.all(updatePromises);
            
            // Mostrar resumen del pedido
            const productosResumen = cart.map(item => 
                `• ${item.name} x${item.quantity} - S/ ${(item.price * item.quantity).toFixed(2)}`
            ).join('\n');
            
            // Mostrar alerta de confirmación elegante
            setTimeout(() => {
                alert(`¡Pedido realizado con éxito!\n\nPedido #${pedidoResult.pedido.id}\nCliente: ${currentUser.nombre}\nEmail: ${currentUser.email}\n\nProductos:\n${productosResumen}\n\nTotal: S/ ${total.toFixed(2)}\n\n¡Gracias por tu compra!`);
                
                // Limpiar carrito
                cart = [];
                localStorage.removeItem('bodega_cart');
                updateCartUI();
                closeCart();
                
                // Restaurar botón
                btnPedir.disabled = false;
                btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
                
                // Recargar productos para mostrar stock actualizado
                loadProducts();
                
                // 🆕 NUEVO: Si estamos en historial, recargar
                if (currentView === 'historial') {
                    loadHistorialPedidos();
                }
                
            }, 1000);
            
        } else {
            throw new Error(pedidoResult.message || 'Error al crear pedido');
        }
        
    } catch (error) {
        console.error('Error al realizar pedido:', error);
        
        // Restaurar botón
        const btnPedir = document.getElementById('btnPedir');
        btnPedir.disabled = false;
        btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
        
        showNotification('❌ Error al procesar el pedido. Intenta nuevamente.', 'error');
    }
}

// ✅ Mostrar notificación mejorada
function showNotification(message, type = 'success') {
    // Crear notificación temporal
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

// ✅ Escapar HTML para seguridad
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
    
    /* 🆕 NUEVO: Estilos para estados del pedido */
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
    
    /* 🆕 NUEVO: Estilos para error state */
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
    
    /* 🆕 NUEVO: Estilos para información adicional del pedido */
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

// ✅ Inicializar animaciones de productos
function initializeProductAnimations() {
    const productCards = document.querySelectorAll('.product-card-modern');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Llamar a las animaciones después de renderizar
setTimeout(initializeProductAnimations, 100);
