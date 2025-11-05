const API_URL = 'https://bodega-backend-4md3.onrender.com/api/inventory';
// Estado global de la aplicación
let cart = [];
let products = [];
let currentFilter = 'all';
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

// ✅ Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartUI();
}

// ✅ NUEVO: Configurar event listeners para autocompletado
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

// ✅ NUEVO: Manejar búsqueda con autocompletado
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

// ✅ NUEVO: Mostrar sugerencias
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

// ✅ NUEVO: Mostrar mensaje de no hay sugerencias
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

// ✅ NUEVO: Ocultar sugerencias
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    suggestionsContainer.classList.remove('active');
    selectedSuggestionIndex = -1;
}

// ✅ NUEVO: Resaltar texto en sugerencias
function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// ✅ NUEVO: Manejar teclado en búsqueda
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

// ✅ NUEVO: Actualizar sugerencia seleccionada
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

// ✅ NUEVO: Seleccionar sugerencia
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

// ✅ NUEVO: Realizar búsqueda completa
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

// ✅ NUEVO: Manejar focus en búsqueda
function handleSearchFocus() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm.length >= 2 && currentSuggestions.length > 0) {
        showSuggestions(currentSuggestions, searchTerm);
    }
}

// ✅ NUEVO: Manejar blur en búsqueda (con delay para permitir clicks)
function handleSearchBlur() {
    setTimeout(() => {
        hideSuggestions();
    }, 200);
}

// ✅ NUEVO: Cargar carrito desde localStorage
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

// ✅ NUEVO: Guardar carrito en localStorage
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
// ✅ Cargar productos desde la API - VERSIÓN CORREGIDA
async function loadProducts() {
    try {
        showLoadingState(true);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const data = await response.json();
        
        // ✅ CORRECCIÓN: Transformar datos del backend al formato del frontend
        products = data.map(product => ({
            id: product.id,
            name: product.nombre,           // ← nombre → name
            description: product.descripcion,
            price: parseFloat(product.precio), // ← string → number
            quantity: product.stock,        // ← stock → quantity
            category: product.categoria,    // ← categoria → category
            image: product.imagen_url       // ← imagen_url → image
        }));
        
        console.log('Productos transformados:', products);
        
        // Si hay menos de 10 productos, cargar más productos de bodega
        if (products.length < 10) {
            console.log('Cargando productos adicionales...');
            await loadAdditionalBodegaProducts();
        } else {
            renderProductsByCategory();
        }
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        showNotification('❌ Error al cargar productos', 'error');
        // Cargar productos de bodega si hay error
        await loadAdditionalBodegaProducts();
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

// ✅ Cargar productos adicionales de bodega
async function loadAdditionalBodegaProducts() {
    const additionalProducts = [
        // Abarrotes - usando categorías que ya tienes
        { name: 'Azúcar Rubia 1kg', category: 'Granos', quantity: 40, price: 3.80 },
        { name: 'Lentejas La Iberica 500g', category: 'Granos', quantity: 25, price: 4.20 },
        { name: 'Harina Blanca Flor 1kg', category: 'Granos', quantity: 35, price: 3.50 },
        { name: 'Avena Molino 500g', category: 'Granos', quantity: 28, price: 3.80 },
        { name: 'Sal Rosada 1kg', category: 'Granos', quantity: 45, price: 2.20 },

        // Lácteos
        { name: 'Queso Fresco Laive 250g', category: 'Lácteos', quantity: 25, price: 8.50 },
        { name: 'Huevos Blancos Docena', category: 'Lácteos', quantity: 40, price: 9.00 },
        { name: 'Yogurt Gloria 1L', category: 'Lácteos', quantity: 30, price: 6.50 },
        { name: 'Mantequilla Gloria 200g', category: 'Lácteos', quantity: 22, price: 7.80 },

        // Bebidas
        { name: 'Coca-Cola 1L', category: 'Bebidas', quantity: 45, price: 5.00 },
        { name: 'Inca Kola 1L', category: 'Bebidas', quantity: 38, price: 4.80 },
        { name: 'Agua Cielo 1L', category: 'Bebidas', quantity: 50, price: 2.00 },
        { name: 'Jugo Pulp Naranja 1L', category: 'Bebidas', quantity: 25, price: 6.00 },
        { name: 'Gatorade 500ml', category: 'Bebidas', quantity: 30, price: 4.00 },

        // Carnes
        { name: 'Pollo Fresco Entero', category: 'Carnes', quantity: 20, price: 15.00 },
        { name: 'Jamón de Pavo San Fernando', category: 'Carnes', quantity: 18, price: 12.50 },
        { name: 'Salchicha Huachana', category: 'Carnes', quantity: 32, price: 5.50 },

        // Limpieza
        { name: 'Jabón Bolivar', category: 'Limpieza', quantity: 40, price: 2.80 },
        { name: 'Detergente Ace 500g', category: 'Limpieza', quantity: 35, price: 4.20 },
        { name: 'Lavavajillas Sapolio', category: 'Limpieza', quantity: 28, price: 3.50 },
        { name: 'Cloro Clorox 1L', category: 'Limpieza', quantity: 22, price: 5.20 },

        // Conservas
        { name: 'Sardinas en Salsa de Tomate', category: 'Conservas', quantity: 20, price: 4.80 },
        { name: 'Menestras Mixtas 500g', category: 'Conservas', quantity: 30, price: 6.00 },
        { name: 'Galletas Casino Vainilla', category: 'Conservas', quantity: 55, price: 3.00 }
    ];

    try {
        console.log('Cargando productos adicionales en la base de datos...');
        
        // Insertar productos en la base de datos
        for (const product of additionalProducts) {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            
            if (!response.ok) {
                console.error('Error insertando producto:', product.name);
            } else {
                console.log('Producto agregado:', product.name);
            }
        }
        
        console.log('Productos adicionales cargados exitosamente');
        
        // Recargar productos desde la BD
        const response = await fetch(API_URL);
        products = await response.json();
        
        console.log('Todos los productos recargados desde BD:', products);
        renderProductsByCategory();
        
    } catch (error) {
        console.error('Error cargando productos adicionales:', error);
        // Si falla, renderizar con los productos que ya tenemos
        renderProductsByCategory();
    }
}

// ✅ Renderizar productos por categoría - ADAPTADO AL NUEVO DISEÑO
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

// ✅ Funciones del Carrito - ADAPTADAS AL NUEVO DISEÑO
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

// ✅ ACTUALIZAR INTERFAZ DEL CARRITO - CORREGIDO COMPLETAMENTE
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');
    const emptyCart = document.getElementById('emptyCart');
    const btnPedir = document.getElementById('btnPedir');

    console.log('Actualizando UI del carrito. Productos en carrito:', cart.length);
    console.log('Carrito actual:', cart);

    // ✅ CORRECCIÓN: Actualizar contador en el navbar
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';

    // ✅ CORRECCIÓN: Manejo completo del estado del carrito
    if (cart.length === 0) {
        // Carrito vacío
        cartItems.innerHTML = `
            <div id="emptyCart" class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <span>Agrega productos desde el catálogo</span>
            </div>
        `;
        btnPedir.disabled = true;
        btnPedir.classList.add('disabled');
    } else {
        // ✅ CORRECCIÓN: Reconstruir completamente los items del carrito
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
                        <div class="cart-item-total">S/ ${(item.price * item.quantity).toFixed(2)}</div>
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

    // ✅ CORRECCIÓN: Actualizar total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalAmount.textContent = `S/ ${total.toFixed(2)}`;
    
    // ✅ CORRECCIÓN: Forzar reflow para asegurar que los cambios se muestren
    cartItems.offsetHeight;
}

// ✅ Control del panel del carrito MODERNO
function toggleCart() {
    const cartPanel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    
    cartPanel.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Agregar efecto de blur al fondo
    document.querySelector('.main-container').classList.toggle('blurred');
    
    // ✅ CORRECCIÓN: Actualizar UI cuando se abre el carrito
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

// ✅ Realizar pedido - MEJORADO
async function realizarPedido() {
    if (cart.length === 0) return;

    try {
        // Mostrar mensaje de procesamiento
        showNotification('⏳ Procesando pedido...', 'info');
        
        // Deshabilitar botón temporalmente
        const btnPedir = document.getElementById('btnPedir');
        btnPedir.disabled = true;
        btnPedir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        // Actualizar stock en la base de datos para cada producto
        const updatePromises = cart.map(async (item) => {
            const product = products.find(p => p.id == item.id);
            const newQuantity = product.quantity - item.quantity;
            
            console.log(`Actualizando producto ${product.name}: ${product.quantity} - ${item.quantity} = ${newQuantity}`);
            
            const response = await fetch(`${API_URL}/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: product.name,
                    category: product.category,
                    quantity: newQuantity,
                    price: product.price
                })
            });
            
            if (!response.ok) throw new Error('Error actualizando producto');
            return response.json();
        });

        // Esperar a que todas las actualizaciones terminen
        await Promise.all(updatePromises);
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Mostrar resumen del pedido
        const productosResumen = cart.map(item => 
            `• ${item.name} x${item.quantity} - S/ ${(item.price * item.quantity).toFixed(2)}`
        ).join('\n');
        
        // Mostrar alerta de confirmación elegante
        setTimeout(() => {
            alert(`🎉 ¡Pedido realizado con éxito!\n\n📦 Productos:\n${productosResumen}\n\n💰 Total: S/ ${total.toFixed(2)}\n\n✅ Stock actualizado en la base de datos`);
            
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
            
        }, 1000);
        
    } catch (error) {
        console.error('Error al realizar pedido:', error);
        
        // Restaurar botón
        const btnPedir = document.getElementById('btnPedir');
        btnPedir.disabled = false;
        btnPedir.innerHTML = '<i class="fas fa-credit-card"></i> Realizar Pedido';
        
        alert('❌ Error al procesar el pedido. Intenta nuevamente.');
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
    
    /* ✅ CORRECCIÓN: Estilos para el carrito vacío */
    .empty-cart {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: #6b7280;
    }
    
    .empty-cart i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #d1d5db;
    }
    
    .empty-cart p {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }
    
    .empty-cart span {
        font-size: 0.9rem;
        color: #9ca3af;
    }
    
    /* ✅ CORRECCIÓN: Estilos para botón deshabilitado */
    .disabled {
        opacity: 0.6;
        cursor: not-allowed !important;
    }
    
    /* ✅ NUEVO: Estilos para resaltado en búsqueda */
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