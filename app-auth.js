// ===== INICIALIZAR SISTEMA DE AUTENTICACIÓN =====
function initializeAuth() {
    setupAuthEventListeners();
    checkExistingAuth();
}

// ===== CONFIGURAR EVENT LISTENERS PARA AUTENTICACIÓN =====
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
    
    // MENÚ DE USUARIO EN HEADER
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

// ===== VERIFICAR AUTENTICACIÓN EXISTENTE =====
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
                
                // 🔧 VERIFICAR SI ES ADMIN Y ACTIVAR MODO ADMIN
                if (currentUser.role === 'admin') {
                    enableAdminMode();
                    // 🔧 MOSTRAR PANEL ADMIN AUTOMÁTICAMENTE
                    if (typeof showAdminView === 'function') {
                        showAdminView();
                    }
                }
                
                if (currentView === 'historial') {
                    loadHistorialPedidos();
                }
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

// ===== MANEJO DE MODALES =====
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

// ===== MANEJAR LOGIN =====
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
            
            // 🔧 DETECTAR SI ES ADMIN POR EMAIL (para casos donde el backend no envía role)
            if (!currentUser.role) {
                if (email === 'admin@bodega.com' || email.includes('admin')) {
                    currentUser.role = 'admin';
                    // Actualizar en localStorage
                    localStorage.setItem('bodega_user', JSON.stringify(currentUser));
                }
            }
            
            updateAuthUI();
            hideAuthModals();
            
            // 🔧 ACTIVAR MODO ADMIN Y MOSTRAR PANEL SI ES ADMIN
            if (currentUser.role === 'admin') {
                enableAdminMode();
                // 🔧 MOSTRAR PANEL ADMIN AUTOMÁTICAMENTE
                if (typeof showAdminView === 'function') {
                    setTimeout(() => {
                        showAdminView();
                    }, 100);
                }
                showNotification(`👑 ¡Bienvenido Administrador ${currentUser.nombre}!`, 'success');
            } else {
                showNotification(`✅ Bienvenido, ${currentUser.nombre}!`);
            }
            
            if (currentView === 'historial') {
                loadHistorialPedidos();
            }
            
            if (cart.length > 0) {
                showNotification('🛒 Tus productos del carrito están listos para pedir');
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

// ===== MANEJAR REGISTRO =====
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
            
            // 🔧 ASIGNAR ROL DE ADMINISTRADOR SI CORRESPONDE
            let userRole = 'user';
            
            // DETECTAR SI ES EL USUARIO ADMIN ESPECÍFICO
            if (nombre === 'admin1' && email === 'admin@bodega.com' && password === 'contra_admin1') {
                userRole = 'admin';
            }
            
            // AGREGAR EL ROL AL USUARIO
            currentUser.role = userRole;
            
            // ACTUALIZAR EN LOCALSTORAGE
            localStorage.setItem('bodega_user', JSON.stringify(currentUser));
            
            updateAuthUI();
            hideAuthModals();
            
            // 🔧 NOTIFICACIÓN ESPECIAL Y ACTIVAR MODO ADMIN SI ES ADMIN
            if (userRole === 'admin') {
                enableAdminMode();
                // 🔧 MOSTRAR PANEL ADMIN AUTOMÁTICAMENTE
                if (typeof showAdminView === 'function') {
                    setTimeout(() => {
                        showAdminView();
                    }, 100);
                }
                showNotification(`👑 ¡Cuenta de Administrador creada exitosamente! Bienvenido, ${currentUser.nombre}`, 'success');
            } else {
                showNotification(`✅ Cuenta creada exitosamente! Bienvenido, ${currentUser.nombre}`);
            }
            
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

// ===== MANEJAR LOGOUT =====
function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('bodega_token');
    
    updateAuthUI();
    hideUserDropdown();
    
    // 🔧 DESACTIVAR MODO ADMIN AL CERRAR SESIÓN
    disableAdminMode();
    
    if (currentView === 'historial') {
        loadHistorialPedidos();
    }
    
    showNotification('👋 Sesión cerrada correctamente');
}

// ===== ACTUALIZAR UI SEGÚN ESTADO DE AUTENTICACIÓN =====
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        
        // 🔧 MOSTRAR INDICADOR DE ADMIN EN EL HEADER
        if (currentUser.role === 'admin') {
            userName.textContent = '👑 Admin';
            dropdownUserName.innerHTML = `${currentUser.nombre} <span class="admin-badge">👑 Administrador</span>`;
        } else {
            userName.textContent = 'Cuenta';
            dropdownUserName.textContent = currentUser.nombre;
        }
        
        dropdownUserEmail.textContent = currentUser.email;
    } else {
        loginBtn.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// ===== MANEJO DEL DROPDOWN DE USUARIO =====
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

function hideUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.remove('active');
}

// 🔧 FUNCIÓN PARA ACTIVAR MODO ADMINISTRADOR
function enableAdminMode() {
    document.body.classList.add('admin-mode');
    document.body.setAttribute('data-user-role', 'admin');
    
    // 🔧 OCULTAR ELEMENTOS QUE NO SE USAN EN MODO ADMIN
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'none';
    if (cartToggle) cartToggle.style.display = 'none';
    if (filtersSidebar) filtersSidebar.style.display = 'none';
    
    // 🔧 MOSTRAR OPCIÓN ADMIN EN EL MENÚ
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = 'block';
    }
    
    console.log('🔧 Modo administrador activado');
}

// 🔧 FUNCIÓN PARA DESACTIVAR MODO ADMINISTRADOR
function disableAdminMode() {
    document.body.classList.remove('admin-mode');
    document.body.removeAttribute('data-user-role');
    
    // 🔧 MOSTRAR ELEMENTOS NORMALES
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'flex';
    if (cartToggle) cartToggle.style.display = 'flex';
    if (filtersSidebar) filtersSidebar.style.display = 'block';
    
    // 🔧 OCULTAR OPCIÓN ADMIN EN EL MENÚ
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = 'none';
    }
    
    // 🔧 VOLVER A LA VISTA NORMAL DEL CATÁLOGO
    if (typeof switchView === 'function' && currentView === 'admin') {
        switchView('catalogo');
    }
    
    console.log('🔧 Modo administrador desactivado');
}

// 🔧 FUNCIÓN TEMPORAL PARA MOSTRAR VISTA ADMIN (si no existe en app-core.js)
function showAdminView() {
    // Ocultar todas las vistas
    const allViews = document.querySelectorAll('.view-content');
    allViews.forEach(view => view.classList.remove('active'));
    
    // Mostrar vista admin
    const adminView = document.getElementById('viewAdmin');
    if (adminView) {
        adminView.classList.add('active');
        currentView = 'admin';
        console.log('📊 Vista de administrador activada');
        
        // Cargar datos del panel admin si las funciones existen
        if (typeof loadAdminPanelData === 'function') {
            loadAdminPanelData();
        } else if (typeof loadAdminProducts === 'function') {
            loadAdminProducts();
        }
    }
}

// 🔧 FUNCIÓN TEMPORAL PARA CAMBIAR VISTA (si no existe en app-core.js)
function switchView(viewName) {
    // Ocultar todas las vistas
    const allViews = document.querySelectorAll('.view-content');
    allViews.forEach(view => view.classList.remove('active'));
    
    // Mostrar vista seleccionada
    const viewElement = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (viewElement) {
        viewElement.classList.add('active');
        currentView = viewName;
        console.log(`🔄 Cambiando a vista: ${viewName}`);
    }
}
