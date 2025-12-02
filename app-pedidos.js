// ======================
// VARIABLES GLOBALES
// ======================
// ¡IMPORTANTE! NO redeclarar API_URL o PEDIDOS_API - YA EXISTEN en app-core.js
let currentCategory = 'todos'; // ← ¡ESTA ES LA LÍNEA CLAVE QUE FALTA!
let currentFilter = 'all';
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

// ======================
// FUNCIONES DE INICIALIZACIÓN
// ======================

// Inicializar aplicación de pedidos
function initializePedidos() {
    console.log('🛒 Inicializando módulo de pedidos...');
    
    // Configurar event listeners
    setupEventListeners();
    
    // Inicializar búsqueda y filtros
    initializeSearch();
    initializeFilters();
    
    console.log('✅ Módulo de pedidos inicializado');
}

function setupEventListeners() {
    // Buscador
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', handleSearchKeydown);
        searchInput.addEventListener('focus', handleSearchFocus);
        searchInput.addEventListener('blur', handleSearchBlur);
    }
    
    // Filtros
    document.querySelectorAll('.filter-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', handleFilterChange);
    });
    
    // Botón realizar pedido
    const btnPedir = document.getElementById('btnPedir');
    if (btnPedir) {
        btnPedir.addEventListener('click', realizarPedido);
    }
}

function initializeSearch() {
    console.log('🔍 Inicializando sistema de búsqueda...');
}

function initializeFilters() {
    console.log('🎯 Inicializando filtros...');
}

// ======================
// SISTEMA DE NAVEGACIÓN
// ======================
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
        window.currentView = viewName; // Usar window.currentView
        
        // Acciones específicas por vista
        switch(viewName) {
            case 'historial':
                if (typeof loadHistorialPedidos === 'function') {
                    loadHistorialPedidos();
                }
                break;
            case 'catalogo':
                if (document.getElementById('filtersSidebar')) {
                    document.getElementById('filtersSidebar').style.display = 'block';
                }
                break;
            case 'admin':
                if (typeof initializeAdminView === 'function') {
                    initializeAdminView();
                }
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
        if (filtersSidebar) filtersSidebar.style.display = 'block';
        
        // 🔧 Mostrar elementos de usuario normal
        if (document.getElementById('searchBar')) {
            document.getElementById('searchBar').style.display = 'flex';
        }
        if (document.getElementById('cartToggle')) {
            document.getElementById('cartToggle').style.display = 'flex';
        }
        
    } else if (viewName === 'admin') {
        mainContainer.style.gridTemplateColumns = '1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'none';
        
        // 🔧 Ocultar elementos de usuario normal en modo admin
        if (document.getElementById('searchBar')) {
            document.getElementById('searchBar').style.display = 'none';
        }
        if (document.getElementById('cartToggle')) {
            document.getElementById('cartToggle').style.display = 'none';
        }
        
    } else {
        mainContainer.style.gridTemplateColumns = '1fr';
        if (filtersSidebar) filtersSidebar.style.display = 'none';
        
        // Mostrar elementos de usuario normal
        if (document.getElementById('searchBar')) {
            document.getElementById('searchBar').style.display = 'flex';
        }
        if (document.getElementById('cartToggle')) {
            document.getElementById('cartToggle').style.display = 'flex';
        }
    }
}

// ======================
// 🔧 VISTA DE ADMINISTRADOR MEJORADA
// ======================
function initializeAdminView() {
    console.log('🔧 Inicializando vista admin...', { currentUser: window.currentUser, isAdminMode: window.isAdminMode });
    
    // 🔧 CORREGIDO: Solo verificar permisos, NO redirigir automáticamente
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        console.warn('❌ Usuario no autorizado para panel admin:', window.currentUser);
        showNotification('🔐 No tienes permisos de administrador', 'error');
        return;
    }
    
    console.log('✅ Usuario autorizado, cargando panel admin...');
    
    // 🔧 CAMBIO: MOSTRAR DIRECTAMENTE EL PANEL COMPLETO
    showAdminPanelDirectly();
    
    // 🔧 NUEVO: CARGAR DATOS INMEDIATAMENTE AL INICIALIZAR
    if (typeof loadAdminProducts === 'function') loadAdminProducts();
    if (typeof loadAdminOrders === 'function') loadAdminOrders();
    if (typeof updateAdminStats === 'function') updateAdminStats();
    
    console.log('✅ Vista admin inicializada correctamente con datos cargados');
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
        
        // 🔧 CARGAR DATOS INMEDIATAMENTE
        if (typeof loadAdminProducts === 'function') loadAdminProducts();
        if (typeof loadAdminOrders === 'function') loadAdminOrders();
        if (typeof updateAdminStats === 'function') updateAdminStats();
        
        console.log('✅ Panel completo mostrado directamente con datos cargados');
    } else {
        console.error('❌ No se encontraron elementos del panel admin');
    }
}

// ======================
// 🎯 FUNCIONES PRINCIPALES DEL CATÁLOGO - CORREGIDAS
// ======================

function renderProductsByCategory() {
    console.log('🔄 Renderizando productos por categoría...');
    console.log('📊 Total de productos:', window.products ? window.products.length : 0);
    
    // ✅ CORREGIDO: Usar window.currentCategory como prioridad
    const activeCategory = window.currentCategory || currentCategory || 'todos';
    console.log('🎯 Categoría activa:', activeCategory);
    
    // Buscar el contenedor principal del catálogo
    const container = document.querySelector('.catalog-main');
    if (!container) {
        console.error('❌ ERROR: No se encontró .catalog-main en el DOM');
        return;
    }
    
    // Usar window.products (definido en app-core.js)
    const products = window.products || [];
    
    // 1. Filtrar productos por categoría (si no es 'todos')
    let filteredProducts = products;
    
    if (activeCategory && activeCategory !== 'todos') {
        filteredProducts = products.filter(product => {
            const productCategory = product.categoria || product.category;
            return productCategory === activeCategory;
        });
        console.log(`✅ Filtrados ${filteredProducts.length} productos de categoría "${activeCategory}"`);
    }
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<p class="no-products">No hay productos en esta categoría</p>';
        return;
    }
    
    // 2. AGRUPAR por categoría para mostrar secciones
    // (Si estamos en 'todos', agrupar por categoría. Si estamos en una categoría específica, mostrar solo esa)
    let catalogHTML = '';
    
    if (activeCategory === 'todos') {
        // Agrupar por categoría
        const groupedByCategory = {};
        
        filteredProducts.forEach(product => {
            const category = product.categoria || product.category || 'Sin categoría';
            
            if (!groupedByCategory[category]) {
                groupedByCategory[category] = [];
            }
            groupedByCategory[category].push(product);
        });
        
        // Generar HTML con SECCIONES por categoría
        Object.keys(groupedByCategory).forEach(category => {
            const categoryProducts = groupedByCategory[category];
            
            if (categoryProducts.length > 0) {
                const categoryDisplayName = getCategoryDisplayName(category);
                
                catalogHTML += `
                    <div class="category-section">
                        <div class="category-header">
                            <h2 class="category-title">${categoryDisplayName}</h2>
                            <p class="category-description">${categoryProducts.length} producto(s)</p>
                        </div>
                        <div class="products-grid">
                            ${categoryProducts.map(product => createProductCardHTML(product)).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        console.log('✅ Renderizado por categorías. Secciones:', Object.keys(groupedByCategory).length);
    } else {
        // Mostrar solo productos de una categoría específica
        const categoryDisplayName = getCategoryDisplayName(activeCategory);
        
        catalogHTML = `
            <div class="category-section">
                <div class="category-header">
                    <h2 class="category-title">${categoryDisplayName}</h2>
                    <p class="category-description">${filteredProducts.length} producto(s)</p>
                </div>
                <div class="products-grid">
                    ${filteredProducts.map(product => createProductCardHTML(product)).join('')}
                </div>
            </div>
        `;
        
        console.log(`✅ Renderizado de categoría específica: "${activeCategory}"`);
    }
    
    container.innerHTML = catalogHTML;
    
    console.log('✅ Renderizado completado. Tarjetas creadas:', document.querySelectorAll('.product-card-modern').length);
    if (typeof syncSidebarWithCategory === 'function') {
        syncSidebarWithCategory();
    }
}

// AGREGAR esta función auxiliar si no existe:
function getCategoryDisplayName(categoryKey) {
    const displayNames = {
        'Abarrotes': 'Abarrotes Esenciales',
        'Granos': 'Granos y Cereales',
        'Pastas': 'Pastas y Fideos',
        'Aceites': 'Aceites y Vinagres',
        'Lácteos': 'Lácteos Frescos',
        'Carnes': 'Carnes y Embutidos',
        'Bebidas': 'Bebidas y Refrescos',
        'Limpieza': 'Limpieza del Hogar',
        'Conservas': 'Conservas y Enlatados',
        'default': categoryKey
    };
    
    return displayNames[categoryKey] || displayNames.default;
}


// ✅ Función para crear tarjeta de producto - CORREGIDA
function createProductCardHTML(product) {
    // ✅ CORREGIDO: Usar las propiedades REALES del backend
    const productName = product.nombre || product.name || 'Producto sin nombre';
    const productDescription = product.descripcion || product.description || '';
    const productPrice = parseFloat(product.precio || product.price || 0);
    const productStock = product.stock || product.quantity || 0;
    const productCategory = product.categoria || product.category || 'Sin categoría';
    const productImage = product.imagen_url || product.image_url || null;
    
    // ✅ USAR imagen_url si existe
    const imageHTML = productImage 
        ? `<img src="${productImage}" alt="${escapeHtml(productName)}" class="product-real-image">`
        : `<i class="fas fa-${getProductIcon(productCategory)}"></i>`;
    
    return `
        <div class="product-card-modern" data-id="${product.id}">
            <div class="product-image">
                <div class="category-badge">${productCategory}</div>
                ${imageHTML}
                <i class="fas fa-${getProductIcon(productCategory)}"></i>
            </div>
            <div class="product-card-body">
                <h3 class="product-card-title">${escapeHtml(productName)}</h3>
                <p class="product-card-description">${escapeHtml(productDescription)}</p>
                <div class="product-card-footer">
                    <div class="product-card-price">S/ ${productPrice.toFixed(2)}</div>
                    <div class="product-card-stock">${productStock > 0 ? `Stock: ${productStock}` : 'Sin stock'}</div>
                    <button class="btn-add-cart" onclick="addToCart(${product.id})" ${productStock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> ${productStock === 0 ? 'Sin stock' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ======================
// FUNCIONES AUXILIARES
// ======================

// 1. FUNCIÓN PARA ESCAPAR HTML (PROTECCIÓN CONTRA XSS)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 2. FUNCIÓN PARA OBTENER ICONOS POR CATEGORÍA
function getProductIcon(category) {
    const iconMap = {
        'Abarrotes': 'shopping-basket',
        'Lácteos': 'cheese',
        'Bebidas': 'wine-bottle',
        'Limpieza': 'broom',
        'Conservas': 'box',
        'Pastas': 'utensils',
        'Aceites': 'oil-can',
        'Granos': 'seedling',
        'Carnes': 'drumstick-bite',
        'default': 'tag'
    };
    
    return iconMap[category] || iconMap.default;
}

// 3. FUNCIÓN PARA ATACHAR EVENT LISTENERS A PRODUCTOS
function attachEventListenersToProducts() {
    // Botones "Agregar al carrito"
    document.querySelectorAll('.btn-add-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.closest('.product-card-modern').getAttribute('data-id');
            if (typeof addToCart === 'function') {
                addToCart(productId);
            }
        });
    });
}

// ======================
// BÚSQUEDA Y AUTOCOMPLETADO
// ======================
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

    const products = window.products || [];
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
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
    const products = window.products || [];
    const product = products.find(p => p.id === productId);
    if (product && typeof addToCart === 'function') {
        addToCart(productId);
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        hideSuggestions();
        showNotification(`✅ ${product.name} agregado al carrito`);
    }
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm.length > 2) {
        const products = window.products || [];
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.category && product.category.toLowerCase().includes(searchTerm))
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
    
    if (!catalogMain) return;
    
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

    // Agrupar productos por categoría
    const groupedProducts = {};
    filteredProducts.forEach(product => {
        const category = product.category || 'Sin categoría';
        if (!groupedProducts[category]) {
            groupedProducts[category] = [];
        }
        groupedProducts[category].push(product);
    });
    
    let catalogHTML = '';
    
    Object.keys(groupedProducts).forEach(category => {
        if (groupedProducts[category].length > 0) {
            catalogHTML += `
                <div class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">${category}</h2>
                        <p class="category-description">${groupedProducts[category].length} producto(s) encontrado(s)</p>
                    </div>
                    <div class="products-grid">
                        ${groupedProducts[category].map(product => createProductCardHTML(product)).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    catalogMain.innerHTML = catalogHTML;
    attachEventListenersToProducts();
}

// ======================
// FILTROS
// ======================
function handleFilterChange(e) {
    const filterText = e.target.nextElementSibling.textContent.toLowerCase();
    console.log('🎯 Filtro seleccionado:', filterText);
    
    // Mapear texto del filtro a categorías REALES
    const filterMap = {
        'todos los productos': 'todos',
        'abarrotes': 'Abarrotes',
        'lácteos': 'Lácteos',               // ← Cambié de "Lácteos y carnes" a "Lácteos"
        'bebidas': 'Bebidas',
        'limpieza': 'Limpieza',
        'aceites': 'Aceites',
        'conservas': 'Conservas',
        'pastas': 'Pastas'
    };
    
    // Actualizar currentCategory
    const newCategory = filterMap[filterText] || 'todos';
    currentCategory = newCategory;
    window.currentCategory = newCategory;
    
    console.log('✅ Categoría cambiada a:', newCategory);
    
    // 🔧 **CORREGIR: Actualizar UI de la sidebar**
    // 1. Remover 'active' de todos los filtros
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });
    
    // 2. Agregar 'active' al filtro seleccionado
    const selectedOption = e.target.closest('.filter-option');
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // 3. Marcar el radio button como checked
    const radioInput = e.target;
    if (radioInput && radioInput.type === 'radio') {
        radioInput.checked = true;
    }
    
    // Renderizar productos con la nueva categoría
    if (window.renderProductsByCategory) {
        window.renderProductsByCategory();
    }
}
// Función para sincronizar la sidebar con la categoría actual
function syncSidebarWithCategory() {
    console.log('🔄 Sincronizando sidebar con categoría:', window.currentCategory);
    
    // Mapeo inverso: de categoría a texto del filtro
    const categoryToFilterMap = {
        'todos': 'todos los productos',
        'Abarrotes': 'abarrotes',
        'Lácteos': 'lácteos',
        'Bebidas': 'bebidas',
        'Limpieza': 'limpieza',
        'Aceites': 'aceites',
        'Conservas': 'conservas',
        'Pastas': 'pastas'
    };
    
    const currentFilterText = categoryToFilterMap[window.currentCategory] || 'todos los productos';
    
    // Buscar y activar el filtro correspondiente
    const allFilterOptions = document.querySelectorAll('.filter-option');
    allFilterOptions.forEach(option => {
        const filterText = option.querySelector('span')?.textContent.toLowerCase() || '';
        
        if (filterText === currentFilterText) {
            option.classList.add('active');
            const radioInput = option.querySelector('input[type="radio"]');
            if (radioInput) {
                radioInput.checked = true;
            }
        } else {
            option.classList.remove('active');
        }
    });
    
    console.log('✅ Sidebar sincronizada con categoría:', window.currentCategory);
}

// ======================
// FUNCIONES DE EMERGENCIA
// ======================

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

// ======================
// INICIALIZACIÓN AUTOMÁTICA
// ======================
// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 DOM listo, inicializando módulo de pedidos...');
    initializePedidos();
    
    // Verificar y exponer currentCategory globalmente
    if (!window.currentCategory) {
        window.currentCategory = currentCategory;
        console.log('✅ currentCategory expuesta globalmente:', window.currentCategory);
    }
});

// Exponer funciones globales necesarias
window.renderProductsByCategory = renderProductsByCategory;
window.currentCategory = currentCategory;

// ======================
// EXPONER VARIABLES GLOBALES
// ======================
window.currentCategory = currentCategory;
window.renderProductsByCategory = renderProductsByCategory;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 DOM listo, inicializando módulo de pedidos...');
    initializePedidos();
});
