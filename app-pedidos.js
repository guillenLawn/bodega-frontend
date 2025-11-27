// ===== SISTEMA DE NAVEGACIÓN =====
function initializeNavigation() {
    setupNavigationEventListeners();
    showView('catalogo');
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
}

function showView(viewName) {
    console.log('Cambiando a vista:', viewName);
    
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
                loadHistorialPedidos();
                break;
            case 'catalogo':
                document.getElementById('filtersSidebar').style.display = 'block';
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
        filtersSidebar.style.display = 'block';
    } else {
        mainContainer.style.gridTemplateColumns = '1fr';
        filtersSidebar.style.display = 'none';
    }
}

// ===== HISTORIAL DE PEDIDOS =====
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
        
        loadingElement.style.display = 'none';
        
        if (data.success && data.pedidos && data.pedidos.length > 0) {
            renderPedidosList(data.pedidos);
            pedidosList.style.display = 'block';
        } else {
            emptyElement.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        loadingElement.style.display = 'none';
        
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

function getEstadoDisplay(estado) {
    const estados = {
        'completado': 'Completado',
        'pendiente': 'Pendiente',
        'cancelado': 'Cancelado',
        'en_camino': 'En camino'
    };
    return estados[estado] || estado;
}

function getMetodoPagoDisplay(metodo) {
    const metodos = {
        'efectivo': 'Efectivo',
        'tarjeta': 'Tarjeta',
        'transferencia': 'Transferencia'
    };
    return metodos[metodo] || metodo;
}

// ===== GESTIÓN DE PRODUCTOS =====
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
        
        console.log('Productos transformados:', products);
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
    console.log('Renderizando productos por categoría...');
    console.log('Total de productos:', products.length);
    
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

// ===== FUNCIONES DEL CARRITO =====
function addToCart(productId) {
    console.log('Agregando producto ID:', productId);
    
    const product = products.find(p => p.id == productId);
    if (!product) {
        console.log('Producto no encontrado con ID:', productId);
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

    console.log('Carrito actualizado:', cart);
    saveCartToStorage();
    updateCartUI();
    showNotification(`✅ ${product.name} agregado al carrito`);
}

// ===== REALIZAR PEDIDO =====
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
                
                if (currentView === 'historial') {
                    loadHistorialPedidos();
                }
                
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

// ===== BÚSQUEDA Y AUTOCOMPLETADO =====
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

// ===== FILTROS =====
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
