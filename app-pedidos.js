// ===== SISTEMA DE PEDIDOS Y CATÁLOGO COMPLETO =====

// ===== VARIABLES GLOBALES =====
let searchInitialized = false;
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

// ===== INICIALIZAR MÓDULO DE PEDIDOS =====
function initializePedidos() {
    console.log('🛒 Inicializando módulo de pedidos...');
    
    try {
        // Configurar event listeners
        setupPedidosEventListeners();
        
        // Inicializar búsqueda
        if (!searchInitialized) {
            initializeSearch();
            searchInitialized = true;
        }
        
        // Inicializar filtros
        initializeFilters();
        
        console.log('Módulo de pedidos inicializado');
    } catch (error) {
        console.error('Error inicializando módulo de pedidos:', error);
    }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupPedidosEventListeners() {
    // Sistema de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keydown', handleSearchKeydown);
        searchInput.addEventListener('focus', handleSearchFocus);
        searchInput.addEventListener('blur', handleSearchBlur);
    }
    
    // Filtros por categoría
    document.querySelectorAll('.filter-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', handleFilterChange);
    });
    
    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-bar')) {
            hideSuggestions();
        }
    });
}

// ===== INICIALIZAR SISTEMA DE BÚSQUEDA =====
function initializeSearch() {
    console.log('🔍 Inicializando sistema de búsqueda...');
}

// ===== INICIALIZAR FILTROS =====
function initializeFilters() {
    console.log('Inicializando filtros...');
}

// ===== RENDERIZAR PRODUCTOS POR CATEGORÍA =====
function renderProductsByCategory() {
    console.log('Renderizando productos por categoría...');
    console.log('Total de productos:', window.products ? window.products.length : 0);
    
    const activeCategory = window.currentCategory || 'todos';
    console.log('Categoría activa:', activeCategory);
    
    const container = document.querySelector('.catalog-main');
    if (!container) {
        console.error('No se encontró .catalog-main');
        return;
    }
    
    const products = window.products || [];
    
    // Filtrar productos si no es "todos"
    let filteredProducts = products;
    if (activeCategory !== 'todos') {
        filteredProducts = products.filter(product => {
            const productCategory = product.categoria || product.category;
            return productCategory === activeCategory;
        });
        console.log(`Filtrados ${filteredProducts.length} productos de categoría "${activeCategory}"`);
    }
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<p class="no-products">No hay productos en esta categoría</p>';
        return;
    }
    
    // Generar HTML según si es "todos" o categoría específica
    let catalogHTML = '';
    
    if (activeCategory === 'todos') {
        // Agrupar por categoría para mostrar secciones
        const groupedByCategory = {};
        
        filteredProducts.forEach(product => {
            const category = product.categoria || product.category || 'Sin categoría';
            if (!groupedByCategory[category]) {
                groupedByCategory[category] = [];
            }
            groupedByCategory[category].push(product);
        });
        
        // Crear sección por cada categoría
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
        
        console.log('Renderizado por categorías. Secciones:', Object.keys(groupedByCategory).length);
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
    }
    
    container.innerHTML = catalogHTML;
    
    // Agregar event listeners a las imágenes para vista detalle
    addProductDetailListeners();
    
    // Sincronizar sidebar con la categoría actual
    syncSidebarWithCategory();
    
    console.log('Renderizado completado');
}

// ===== CREAR TARJETA DE PRODUCTO =====
function createProductCardHTML(product) {
    const productName = product.nombre || product.name || 'Producto sin nombre';
    const productDescription = product.descripcion || product.description || '';
    const productPrice = parseFloat(product.precio || product.price || 0);
    const productStock = product.stock || product.quantity || 0;
    const productCategory = product.categoria || product.category || 'Sin categoría';
    const productImage = product.imagen_url || product.image_url || null;
    
    // Usar imagen real si existe, sino ícono
    const imageHTML = productImage 
        ? `<img src="${productImage}" alt="${escapeHtml(productName)}" class="product-real-image" data-product-id="${product.id}">`
        : `<i class="fas fa-${getProductIcon(productCategory)}" data-product-id="${product.id}"></i>`;
    
    return `
        <div class="product-card-modern" data-id="${product.id}">
            <div class="product-image clickable-image" data-product-id="${product.id}">
                <div class="category-badge">${productCategory}</div>
                ${imageHTML}
                <div class="image-overlay" data-product-id="${product.id}">
                    <i class="fas fa-search-plus"></i>
                    <span>Ver detalles</span>
                </div>
            </div>
            <div class="product-card-body">
                <h3 class="product-card-title">${escapeHtml(productName)}</h3>
                <p class="product-card-description">${escapeHtml(productDescription)}</p>
                <div class="product-card-footer">
                    <div class="product-card-price">S/ ${productPrice.toFixed(2)}</div>
                    <div class="product-card-stock ${productStock > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${productStock > 0 ? `Stock: ${productStock}` : 'Sin stock'}
                    </div>
                    <button class="btn-add-cart" onclick="addToCart(${product.id})" ${productStock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> ${productStock === 0 ? 'Sin stock' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== AGREGAR EVENT LISTENERS PARA VISTA DETALLE =====
function addProductDetailListeners() {
    // Agregar eventos a las imágenes y overlays
    document.querySelectorAll('.product-image, .image-overlay, .product-real-image').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
            const productId = this.getAttribute('data-product-id');
            if (productId) {
                mostrarDetalleProducto(productId);
            }
        });
    });
    
    // También hacer clickeable el título
    document.querySelectorAll('.product-card-title').forEach(title => {
        title.addEventListener('click', function() {
            const productCard = this.closest('.product-card-modern');
            const productId = productCard?.getAttribute('data-id');
            if (productId) {
                mostrarDetalleProducto(productId);
            }
        });
    });
}

// ===== 🆕 FUNCIÓN PARA MOSTRAR DETALLE DE PRODUCTO =====
async function mostrarDetalleProducto(productoId) {
    console.log(`🔍 Mostrando detalles del producto ID: ${productoId}`);
    
    // Guardar producto actual
    localStorage.setItem('bodega_current_product_id', productoId);
    
    // Cambiar a vista detalle
    if (typeof showView === 'function') {
        showView('productoDetalle');
    }
    
    // Cargar detalles
    cargarVistaDetalleProducto(productoId);
}

// ===== 🆕 CARGAR VISTA DETALLE DE PRODUCTO =====
async function cargarVistaDetalleProducto(productoId) {
    const container = document.getElementById('productoDetalleContainer');
    if (!container) return;
    
    // Mostrar loading
    container.innerHTML = `
        <div class="detalle-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando detalles del producto...</p>
        </div>
    `;
    
    try {
        console.log(`Solicitando detalles del producto ID: ${productoId}`);
        
        // Intentar primero el endpoint de detalles completos
        const response = await fetch(`https://bodega-backend-nuevo.onrender.com/api/productos/${productoId}/detalle-completo`);
        
        if (!response.ok) {
            // Si falla, usar el endpoint normal
            console.log('Endpoint detalle no disponible, usando endpoint normal...');
            await cargarDetalleDesdeLocal(productoId);
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.producto) {
            const producto = data.producto;
            mostrarDetalleCompleto(producto);
        } else {
            throw new Error('No se pudo cargar el producto');
        }
        
    } catch (error) {
        console.error('Error cargando detalles:', error);
        // Intentar cargar desde datos locales
        await cargarDetalleDesdeLocal(productoId);
    }
}

// ===== 🆕 CARGAR DETALLE DESDE DATOS LOCALES =====
async function cargarDetalleDesdeLocal(productoId) {
    const producto = window.products?.find(p => p.id == productoId);
    
    if (!producto) {
        document.getElementById('productoDetalleContainer').innerHTML = `
            <div class="detalle-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Producto no encontrado</h3>
                <p>El producto que buscas no está disponible</p>
                <button class="btn-volver" onclick="showView('catalogo')">
                    <i class="fas fa-arrow-left"></i> Volver al Catálogo
                </button>
            </div>
        `;
        return;
    }
    
    // Crear objeto con datos básicos
    const productoBasico = {
        id: producto.id,
        nombre: producto.nombre || producto.name || '',
        descripcion: producto.descripcion || producto.description || '',
        descripcion_larga: producto.descripcion || producto.description || 'Descripción no disponible',
        precio: producto.precio || producto.price || 0,
        stock: producto.stock || producto.quantity || 0,
        categoria: producto.categoria || producto.category || 'Sin categoría',
        imagen_url: producto.imagen_url || producto.image_url || '',
        marca: producto.marca || 'Varios',
        peso: producto.peso || '1',
        unidad_medida: producto.unidad_medida || 'unidad'
    };
    
    mostrarDetalleCompleto(productoBasico);
}

// ===== 🆕 MOSTRAR DETALLE COMPLETO EN LA VISTA =====
function mostrarDetalleCompleto(producto) {
    const container = document.getElementById('productoDetalleContainer');
    if (!container) return;
    
    const imagenHTML = producto.imagen_url 
        ? `<img src="${producto.imagen_url}" alt="${escapeHtml(producto.nombre)}" class="detalle-imagen-principal">`
        : `<div class="detalle-imagen-placeholder">
                <i class="fas fa-${getProductIcon(producto.categoria)}"></i>
           </div>`;
    
    const stockHTML = producto.stock > 0 
        ? `<span class="detalle-stock in-stock"> En stock: ${producto.stock} unidades</span>`
        : `<span class="detalle-stock out-of-stock"> Sin stock disponible</span>`;
    
    const detallesHTML = `
        <div class="producto-detalle">
            <!-- Header con botón volver -->
            <div class="detalle-header">
                <button class="btn-volver" onclick="showView('catalogo')">
                    <i class="fas fa-arrow-left"></i> Volver al Catálogo
                </button>
                <h1 class="detalle-titulo">${escapeHtml(producto.nombre)}</h1>
            </div>
            
            <div class="detalle-content">
                <!-- Imagen principal -->
                <div class="detalle-imagen-container">
                    ${imagenHTML}
                </div>
                
                <!-- Información del producto -->
                <div class="detalle-info">
                    <div class="detalle-precio-estado">
                        <div class="detalle-precio">
                            <span class="precio-label">Precio:</span>
                            <span class="precio-valor">S/ ${parseFloat(producto.precio).toFixed(2)}</span>
                        </div>
                        <div class="detalle-estado">
                            ${stockHTML}
                        </div>
                    </div>
                    
                    <!-- Descripción -->
                    <div class="detalle-seccion">
                        <h3><i class="fas fa-align-left"></i> Descripción</h3>
                        <p class="detalle-descripcion">${escapeHtml(producto.descripcion_larga)}</p>
                    </div>
                    
                    <!-- Características -->
                    <div class="detalle-seccion">
                        <h3><i class="fas fa-info-circle"></i> Características</h3>
                        <div class="detalle-caracteristicas">
                            <div class="caracteristica">
                                <span class="caracteristica-label">Marca:</span>
                                <span class="caracteristica-valor">${producto.marca}</span>
                            </div>
                            <div class="caracteristica">
                                <span class="caracteristica-label">Categoría:</span>
                                <span class="caracteristica-valor">${producto.categoria}</span>
                            </div>
                            <div class="caracteristica">
                                <span class="caracteristica-label">Peso/Unidad:</span>
                                <span class="caracteristica-valor">${producto.peso} ${producto.unidad_medida}</span>
                            </div>
                            <div class="caracteristica">
                                <span class="caracteristica-label">ID Producto:</span>
                                <span class="caracteristica-valor">#${producto.id}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Acciones -->
                    <div class="detalle-acciones">
                        <button class="btn-agregar-detalle" onclick="agregarAlCarritoDesdeDetalle(${producto.id})" ${producto.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i>
                            ${producto.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                        </button>
                        <button class="btn-comprar-ahora" onclick="comprarAhora(${producto.id})" ${producto.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-bolt"></i>
                            Comprar Ahora
                        </button>
                    </div>
                    
                    <!-- Información adicional -->
                    <div class="detalle-extra">
                        <p><i class="fas fa-shipping-fast"></i> <strong>Envío delivery:</strong> Todavia no disponible</p>
                        <p><i class="fas fa-clock"></i> <strong>Entrega:</strong> Recogo en tienda</p>
                        <p><i class="fas fa-store"></i> <strong>Disponible en:</strong> Bodega Guadalupe - Ate</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = detallesHTML;
    
    // Agregar event listener para cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            showView('catalogo');
        }
    });
}

// ===== 🆕 FUNCIONES PARA ACCIONES EN DETALLE =====
function agregarAlCarritoDesdeDetalle(productoId) {
    if (typeof addToCart === 'function') {
        addToCart(productoId);
        showNotification(' Producto agregado al carrito desde vista detalle');
    }
}

function comprarAhora(productoId) {
    // Agregar al carrito
    if (typeof addToCart === 'function') {
        addToCart(productoId);
    }
    
    // Mostrar carrito
    setTimeout(() => {
        if (typeof showCartPanel === 'function') {
            showCartPanel();
        }
    }, 500);
    
    showNotification(' Producto agregado, revisa tu carrito para completar la compra');
}

// ===== SISTEMA DE BÚSQUEDA CON AUTOCOMPLETADO =====
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
    const filteredProducts = products.filter(product => {
        const name = (product.nombre || product.name || '').toLowerCase();
        const category = (product.categoria || product.category || '').toLowerCase();
        const description = (product.descripcion || product.description || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               category.includes(searchTerm) || 
               description.includes(searchTerm);
    });
    
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
    if (!suggestionsContainer) return;
    
    const suggestionsHTML = suggestions.map((product, index) => {
        const productName = product.nombre || product.name;
        const productCategory = product.categoria || product.category;
        const productPrice = parseFloat(product.precio || product.price || 0);
        
        return `
            <div class="suggestion-item" data-index="${index}" data-product-id="${product.id}">
                <div class="suggestion-icon">
                    <i class="fas fa-${getProductIcon(productCategory)}"></i>
                </div>
                <div class="suggestion-content">
                    <div class="suggestion-name">${highlightText(productName, searchTerm)}</div>
                    <div class="suggestion-category">${productCategory}</div>
                </div>
                <div class="suggestion-price">S/ ${productPrice.toFixed(2)}</div>
            </div>
        `;
    }).join('');
    
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

function showNoSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
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
    if (suggestionsContainer) {
        suggestionsContainer.classList.remove('active');
    }
    selectedSuggestionIndex = -1;
}

function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return String(text).replace(regex, '<mark>$1</mark>');
}

function handleSearchKeydown(e) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!suggestionsContainer || !suggestionsContainer.classList.contains('active')) return;
    
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
}

function selectSuggestion(productId) {
    const products = window.products || [];
    const product = products.find(p => p.id === productId);
    
    if (product) {
        if (typeof addToCart === 'function') {
            addToCart(productId);
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        hideSuggestions();
        showNotification(` ${product.nombre || product.name} agregado al carrito`);
    }
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    
    if (searchTerm.length > 2) {
        const products = window.products || [];
        const filteredProducts = products.filter(product => {
            const name = (product.nombre || product.name || '').toLowerCase();
            const category = (product.categoria || product.category || '').toLowerCase();
            return name.includes(searchTerm) || category.includes(searchTerm);
        });
        
        renderSearchResults(filteredProducts);
        hideSuggestions();
    }
}

function handleSearchFocus() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
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
    
    // Agrupar por categoría
    const groupedProducts = {};
    filteredProducts.forEach(product => {
        const category = product.categoria || product.category || 'Sin categoría';
        if (!groupedProducts[category]) {
            groupedProducts[category] = [];
        }
        groupedProducts[category].push(product);
    });
    
    let catalogHTML = '';
    Object.keys(groupedProducts).forEach(category => {
        const categoryProducts = groupedProducts[category];
        if (categoryProducts.length > 0) {
            const categoryDisplayName = getCategoryDisplayName(category);
            
            catalogHTML += `
                <div class="category-section">
                    <div class="category-header">
                        <h2 class="category-title">${categoryDisplayName}</h2>
                        <p class="category-description">${categoryProducts.length} producto(s) encontrado(s)</p>
                    </div>
                    <div class="products-grid">
                        ${categoryProducts.map(product => createProductCardHTML(product)).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    catalogMain.innerHTML = catalogHTML;
    
    // Agregar event listeners a las imágenes
    addProductDetailListeners();
}

// ===== SISTEMA DE FILTROS =====
function handleFilterChange(e) {
    const filterText = e.target.nextElementSibling?.textContent.toLowerCase() || '';
    console.log(' Filtro seleccionado:', filterText);
    
    // Mapear texto del filtro a categorías REALES
    const filterMap = {
        'todos los productos': 'todos',
        'abarrotes': 'Abarrotes',
        'lácteos y carnes': 'Lácteos',
        'bebidas': 'Bebidas',
        'limpieza': 'Limpieza',
        'pastas': 'Pastas',
        'aceites': 'Aceites',
        'granos': 'Granos',
        'conservas': 'Conservas'
    };
    
    // Actualizar categoría
    const newCategory = filterMap[filterText] || 'todos';
    window.currentCategory = newCategory;
    
    console.log(' Categoría cambiada a:', newCategory);
    
    // Actualizar UI de la sidebar
    syncSidebarWithCategory();
    
    // Renderizar productos
    renderProductsByCategory();
}

function syncSidebarWithCategory() {
    console.log(' Sincronizando sidebar con categoría:', window.currentCategory);
    
    const categoryToFilterMap = {
        'todos': 'todos los productos',
        'Abarrotes': 'abarrotes',
        'Lácteos': 'lácteos y carnes',
        'Bebidas': 'bebidas',
        'Limpieza': 'limpieza',
        'Pastas': 'pastas',
        'Aceites': 'aceites',
        'Granos': 'granos',
        'Conservas': 'conservas'
    };
    
    const currentFilterText = categoryToFilterMap[window.currentCategory] || 'todos los productos';
    
    // Actualizar UI de los filtros
    document.querySelectorAll('.filter-option').forEach(option => {
        const optionText = option.querySelector('span')?.textContent.toLowerCase() || '';
        const radioInput = option.querySelector('input[type="radio"]');
        
        if (optionText === currentFilterText) {
            option.classList.add('active');
            if (radioInput) radioInput.checked = true;
        } else {
            option.classList.remove('active');
        }
    });
    
    console.log(' Sidebar sincronizada');
}

// ===== VISTA DE ADMINISTRADOR =====
function initializeAdminView() {
    console.log('🔧 Inicializando vista admin...');
    
    // Verificar permisos
    if (!window.currentUser || window.currentUser.role !== 'admin') {
        console.warn('❌ Usuario no autorizado para panel admin');
        if (typeof showNotification === 'function') {
            showNotification(' No tienes permisos de administrador', 'error');
        }
        return;
    }
    
    console.log(' Usuario autorizado, cargando panel admin...');
    
    // Mostrar panel completo directamente
    showAdminPanelDirectly();
    
    // Cargar datos
    if (typeof loadAdminProducts === 'function') {
        loadAdminProducts();
    }
    if (typeof loadAdminOrders === 'function') {
        loadAdminOrders();
    }
    if (typeof updateAdminStats === 'function') {
        updateAdminStats();
    }

    initializeAddProduct();
    console.log(' Vista admin inicializada correctamente');
}

function showAdminPanelDirectly() {
    console.log(' Mostrando panel completo directamente...');
    
    const adminWelcome = document.getElementById('adminWelcome');
    const adminPanelFull = document.getElementById('adminPanelFull');
    
    if (adminWelcome && adminPanelFull) {
        adminWelcome.style.display = 'none';
        adminPanelFull.style.display = 'block';
        adminPanelFull.style.opacity = '1';
        adminPanelFull.style.visibility = 'visible';
        
        console.log(' Panel completo mostrado');
    }
}

// ===== HISTORIAL DE PEDIDOS =====
async function loadHistorialPedidos() {
    console.log('📋 Cargando historial de pedidos...');
    
    // ✅ USAR LOS IDs CORRECTOS del HTML
    const historialContent = document.getElementById('historialContent');
    const historialLoading = document.getElementById('historialLoading');
    const historialNotLogged = document.getElementById('historialNotLogged');
    const historialEmpty = document.getElementById('historialEmpty');
    const pedidosList = document.getElementById('pedidosList');
    
    console.log('🔍 Elementos encontrados:');
    console.log('- historialContent:', historialContent ? '✅' : '❌');
    console.log('- historialLoading:', historialLoading ? '✅' : '❌');
    console.log('- historialNotLogged:', historialNotLogged ? '✅' : '❌');
    console.log('- historialEmpty:', historialEmpty ? '✅' : '❌');
    console.log('- pedidosList:', pedidosList ? '✅' : '❌');
    
    if (!historialContent) {
        console.error(' No se encontró historialContent');
        return;
    }
    
    // Verificar si el usuario está logueado
    if (!window.currentUser) {
        console.log('👤 Usuario no logueado, mostrando mensaje...');
        
        // Ocultar todos los demás estados
        if (historialLoading) historialLoading.style.display = 'none';
        if (historialEmpty) historialEmpty.style.display = 'none';
        if (pedidosList) pedidosList.style.display = 'none';
        
        // Mostrar mensaje de no logueado
        if (historialNotLogged) {
            historialNotLogged.style.display = 'block';
        } else {
            historialContent.innerHTML = `
                <div class="historial-not-logged">
                    <i class="fas fa-user-lock"></i>
                    <h3>Inicia sesión para ver tu historial</h3>
                    <p>Necesitas estar logueado para ver tus pedidos anteriores</p>
                    <button class="btn-primary" onclick="showAuthModal('login')">
                        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                    </button>
                </div>
            `;
        }
        return;
    }
    
    // ✅ Ocultar estados no necesarios
    if (historialNotLogged) historialNotLogged.style.display = 'none';
    if (historialEmpty) historialEmpty.style.display = 'none';
    if (pedidosList) pedidosList.style.display = 'none';
    
    // ✅ Mostrar loading
    if (historialLoading) {
        historialLoading.style.display = 'block';
    } else {
        historialContent.innerHTML = '<div class="loading-spinner">Cargando tu historial...</div>';
    }
    
    try {
        console.log(' Solicitando historial al backend...');
        
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/pedidos/usuario', {
            headers: {
                'Authorization': `Bearer ${window.authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(' Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudieron cargar los pedidos`);
        }
        
        const data = await response.json();
        console.log(' Datos recibidos:', data);
        
        const pedidos = data.pedidos || [];
        console.log(' Pedidos encontrados:', pedidos.length);
        
        // ✅ Ocultar loading
        if (historialLoading) historialLoading.style.display = 'none';
        
        if (pedidos.length === 0) {
            console.log(' No hay pedidos, mostrando mensaje...');
            if (historialEmpty) {
                historialEmpty.style.display = 'block';
            } else {
                historialContent.innerHTML = `
                    <div class="historial-empty">
                        <i class="fas fa-clipboard-list"></i>
                        <h3>No tienes pedidos aún</h3>
                        <p>Realiza tu primer pedido en el catálogo</p>
                        <button class="btn-primary" onclick="showView('catalogo')">
                            <i class="fas fa-store"></i> Ir al Catálogo
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        // Ordenar por fecha (más reciente primero)
        pedidos.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
        
        console.log(' Generando HTML para', pedidos.length, 'pedidos...');
        
        // ✅ Usar pedidosList si existe, sino crear uno
        const containerParaPedidos = pedidosList || historialContent;
        
        
        let historialHTML = `
            <div class="historial-header">
                <div class="historial-header-top">
                    <h2>Mis Pedidos</h2>
                    <button class="btn-volver-catalogo" onclick="showView('catalogo')">
                        <i class="fas fa-arrow-left"></i>
                        Volver al Catálogo
                    </button>
                </div>
                <p class="historial-count">Total: ${pedidos.length} pedido(s)</p>
            </div>
        `;
        
        pedidos.forEach(pedido => {
            const total = parseFloat(pedido.total) || 0;
            const fecha = new Date(pedido.fecha_creacion).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            historialHTML += `
                <div class="pedido-card">
                    <div class="pedido-header">
                        <div class="pedido-info">
                            <h3>Pedido #${pedido.id}</h3>
                            <p class="pedido-fecha">${fecha}</p>
                        </div>
                        <div class="pedido-estado">
                            <span class="status-badge estado-${pedido.estado || 'completado'}">
                                ${pedido.estado === 'completado' ? ' Completado' : 
                                  pedido.estado === 'pendiente' ? ' Pendiente' : 
                                  pedido.estado === 'cancelado' ? ' Cancelado' : 
                                  '📦 ' + (pedido.estado || 'Completado')}
                            </span>
                        </div>
                    </div>
                    
                    <div class="pedido-items">
                        ${(pedido.items || []).map(item => `
                            <div class="pedido-item">
                                <div class="pedido-item-info">
                                    <span class="pedido-item-nombre">${item.producto_nombre}</span>
                                    <span class="pedido-item-cantidad">${item.cantidad} x S/ ${parseFloat(item.precio_unitario).toFixed(2)}</span>
                                </div>
                                <span class="pedido-item-subtotal">S/ ${parseFloat(item.subtotal).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="pedido-footer">
                        <div class="pedido-total">
                            <strong>Total:</strong>
                            <span class="pedido-total-monto">S/ ${total.toFixed(2)}</span>
                        </div>
                        ${pedido.direccion_entrega ? `
                            <div class="pedido-direccion">
                                <strong> Dirección:</strong> ${pedido.direccion_entrega}
                            </div>
                        ` : ''}
                        ${pedido.metodo_pago ? `
                            <div class="pedido-metodo-pago">
                                <strong> Método de pago:</strong> ${pedido.metodo_pago}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        // ✅ Insertar en el contenedor correcto
        if (pedidosList) {
            pedidosList.innerHTML = historialHTML;
            pedidosList.style.display = 'block';
        } else {
            historialContent.innerHTML = historialHTML;
        }
        
        console.log(' Historial cargado correctamente');
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        
        //  Ocultar loading
        if (historialLoading) historialLoading.style.display = 'none';
        
        // Mostrar error
        historialContent.innerHTML = `
            <div class="historial-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar el historial</h3>
                <p>${error.message}</p>
                <p>Los pedidos se han guardado correctamente en el sistema.</p>
                <button class="btn-primary" onclick="showView('catalogo')">
                    <i class="fas fa-store"></i> Continuar Comprando
                </button>
            </div>
        `;
    }
}

// ===== FUNCIONES AUXILIARES =====
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

// ===== INICIALIZACIÓN AUTOMÁTICA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 DOM listo, inicializando módulo de pedidos...');
    
    // Inicializar después de un pequeño delay para asegurar que todo esté cargado
    setTimeout(() => {
        initializePedidos();
        
        // Exponer currentCategory globalmente si no existe
        if (!window.currentCategory) {
            window.currentCategory = 'todos';
        }
    }, 100);
});


// ===== 🆕 FUNCIONALIDAD COMPLETA PARA AGREGAR PRODUCTOS =====

// Inicializar funcionalidad de agregar producto
function initializeAddProduct() {
    console.log(' Inicializando funcionalidad para agregar productos...');
    
    // Agregar evento al formulario
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductSubmit);
        console.log(' Formulario de agregar producto configurado');
    }
    
    // Configurar tabs del admin
    setupAdminTabs();
}

// Configurar pestañas del admin
function setupAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAdminTab(tabName);
        });
    });
}

// Mostrar pestaña específica del admin
function showAdminTab(tabName) {
    // Actualizar tabs activos
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Activar tab clickeado
    const activeTab = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
    const activePane = document.getElementById(tabName);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePane) activePane.classList.add('active');
}

// Manejar envío del formulario para agregar producto
async function handleAddProductSubmit(e) {
    e.preventDefault();
    
    console.log(' Enviando formulario para agregar producto...');
    
    // Obtener valores del formulario
    const nombre = document.getElementById('productName').value.trim();
    const categoria = document.getElementById('productCategory').value;
    const precio = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const descripcion = document.getElementById('productDescription').value.trim();
    const imagen_url = document.getElementById('productImage').value.trim();
    
    // Validaciones básicas
    if (!nombre || !categoria || isNaN(precio) || isNaN(stock)) {
        showNotification(' Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    if (precio < 0) {
        showNotification(' El precio debe ser un número positivo', 'error');
        return;
    }
    
    if (stock < 0) {
        showNotification(' El stock debe ser un número positivo', 'error');
        return;
    }
    
    // Crear objeto producto
    const nuevoProducto = {
        nombre: nombre,
        categoria: categoria,
        precio: precio,
        stock: stock,
        descripcion: descripcion || nombre,
        imagen_url: imagen_url || obtenerImagenPorDefecto(categoria)
    };
    
    console.log(' Producto a crear:', nuevoProducto);
    
    try {
        // Mostrar loading
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        // Enviar al backend
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.authToken}`
            },
            body: JSON.stringify(nuevoProducto)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(' Producto agregado exitosamente!', 'success');
            
            // Resetear formulario
            e.target.reset();
            
            // Recargar lista de productos
            if (typeof loadAdminProducts === 'function') {
                await loadAdminProducts();
            }
            
            // Actualizar productos globales
            if (typeof loadProducts === 'function') {
                await loadProducts();
            }
            
            // Actualizar estadísticas
            if (typeof updateAdminStats === 'function') {
                updateAdminStats();
            }
            
            // Mostrar mensaje de éxito
            showSuccessMessage();
            
            // Volver a la pestaña de gestión de productos
            setTimeout(() => {
                showAdminTab('gestion-productos');
            }, 1500);
            
        } else {
            throw new Error(data.error || 'Error al crear producto');
        }
        
    } catch (error) {
        console.error('Error agregando producto:', error);
        showNotification(` Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
        }
    }
}

// Obtener imagen por defecto según categoría
function obtenerImagenPorDefecto(categoria) {
    const imagenesPorCategoria = {
        'Abarrotes': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/abarrotes_default.jpg',
        'Lácteos': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/lacteos_default.jpg',
        'Bebidas': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/bebidas_default.jpg',
        'Limpieza': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/limpieza_default.jpg',
        'Pastas': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/pastas_default.jpg',
        'Aceites': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/aceites_default.jpg',
        'Conservas': 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/conservas_default.jpg'
    };
    
    return imagenesPorCategoria[categoria] || 'https://res.cloudinary.com/dbptiljzk/image/upload/v1700000000/bodega/default_product.jpg';
}

// Mostrar mensaje de éxito
function showSuccessMessage() {
    const successHTML = `
        <div class="success-message" id="addProductSuccess">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="success-content">
                <h4>¡Producto creado exitosamente!</h4>
                <p>El producto ha sido agregado a la base de datos y ya está disponible en el catálogo.</p>
            </div>
            <button class="btn-close-success" onclick="document.getElementById('addProductSuccess').remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const tabPane = document.getElementById('agregar-producto');
    if (tabPane) {
        // Insertar después del header
        const header = tabPane.querySelector('.tab-header');
        if (header) {
            header.insertAdjacentHTML('afterend', successHTML);
            
            // Auto-remover después de 5 segundos
            setTimeout(() => {
                const successMsg = document.getElementById('addProductSuccess');
                if (successMsg) successMsg.remove();
            }, 5000);
        }
    }
}

// Función para editar producto (ya existe en el HTML)
function openEditProductModal(productId) {
    console.log(' Abriendo modal para editar producto ID:', productId);
    // Tu código existente para editar...
}

function openDeleteProductModal(productId) {
    console.log(' Abriendo modal para eliminar producto ID:', productId);
    // Tu código existente para eliminar...
}



// ===== EXPONER FUNCIONES GLOBALES =====
window.initializeAddProduct = initializeAddProduct;
window.handleAddProductSubmit = handleAddProductSubmit;
window.showAdminTab = showAdminTab;
// ===== EXPONER FUNCIONES GLOBALES =====
window.renderProductsByCategory = renderProductsByCategory;
window.initializeAdminView = initializeAdminView;
window.loadHistorialPedidos = loadHistorialPedidos;
window.syncSidebarWithCategory = syncSidebarWithCategory;
window.mostrarDetalleProducto = mostrarDetalleProducto;
window.cargarVistaDetalleProducto = cargarVistaDetalleProducto;
window.agregarAlCarritoDesdeDetalle = agregarAlCarritoDesdeDetalle;
window.comprarAhora = comprarAhora;

console.log(' app-pedidos.js cargado correctamente');
