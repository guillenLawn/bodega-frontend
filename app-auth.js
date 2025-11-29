// ===== INICIALIZAR SISTEMA DE AUTENTICACIÓN =====
async function initializeAuth() {
    console.log('🔐 Inicializando autenticación...');
    setupAuthEventListeners();
    await checkExistingAuth(); // ← Ahora esperamos a que termine
    console.log('✅ Autenticación inicializada');
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
    console.log('🔍 Verificando autenticación existente...');
    
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
                console.log('✅ Usuario autenticado:', currentUser);
                
                // 🔧 CARGAR ROL DESDE LOCALSTORAGE SI EXISTE
                const savedUser = localStorage.getItem('bodega_user');
                if (savedUser) {
                    try {
                        const userData = JSON.parse(savedUser);
                        if (userData.role && userData.email === currentUser.email) {
                            currentUser.role = userData.role;
                            console.log('🔧 Rol cargado desde localStorage:', userData.role);
                        }
                    } catch (error) {
                        console.error('Error parsing saved user:', error);
                    }
                }
                
                updateAuthUI();
                
                // 🔧 VERIFICAR SI ES ADMIN Y ACTIVAR MODO ADMIN SOLO SI ES ADMIN REAL
                if (currentUser.role === 'admin' && isValidAdmin(currentUser)) {
                    enableAdminMode();
                    console.log('🔧 Usuario admin verificado correctamente');
                } else {
                    // 🔧 ASEGURARSE DE QUE NO ESTÉ EN MODO ADMIN SI NO ES ADMIN
                    disableAdminMode();
                    if (currentView === 'admin') {
                        // Si no es admin pero está en vista admin, redirigir al catálogo
                        if (typeof showView === 'function') {
                            showView('catalogo');
                        }
                        showNotification('🔐 No tienes permisos de administrador', 'error');
                    }
                }
                
                if (currentView === 'historial') {
                    loadHistorialPedidos();
                }
            } else {
                console.log('❌ Token inválido, limpiando datos...');
                clearAuthData();
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            clearAuthData();
        }
    } else {
        // 🔧 NO HAY TOKEN - ASEGURARSE DE QUE NO ESTÉ EN MODO ADMIN
        console.log('🔍 No hay token de autenticación');
        disableAdminMode();
        localStorage.removeItem('bodega_user');
    }
}

// 🔧 FUNCIÓN PARA VALIDAR SI ES UN ADMIN REAL
function isValidAdmin(user) {
    // Solo usuarios específicos pueden ser admins
    const validAdmins = ['admin@bodega.com'];
    return validAdmins.includes(user.email) && user.role === 'admin';
}

// 🔧 LIMPIAR DATOS DE AUTENTICACIÓN
function clearAuthData() {
    localStorage.removeItem('bodega_token');
    localStorage.removeItem('bodega_user');
    authToken = null;
    currentUser = null;
    disableAdminMode();
    updateAuthUI();
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
            
            // 🔧 DETECTAR SI ES ADMIN SOLO PARA USUARIOS AUTORIZADOS
            if (!currentUser.role) {
                if (email === 'admin@bodega.com') {
                    currentUser.role = 'admin';
                } else {
                    currentUser.role = 'user';
                }
            }
            
            // 🔧 VALIDAR QUE EL ROL SEA CORRECTO
            if (currentUser.role === 'admin' && !isValidAdmin(currentUser)) {
                currentUser.role = 'user';
                console.warn('⚠️ Intento de acceso admin no autorizado:', email);
            }
            
            // ACTUALIZAR EN LOCALSTORAGE
            localStorage.setItem('bodega_user', JSON.stringify(currentUser));
            
            updateAuthUI();
            hideAuthModals();
            
            // 🔧 ACTIVAR MODO ADMIN Y MOSTRAR PANEL SOLO SI ES ADMIN VÁLIDO
            if (currentUser.role === 'admin' && isValidAdmin(currentUser)) {
                enableAdminMode();
                
                // 🔧 SOLUCIÓN: REFRESH AUTOMÁTICO PARA ADMIN
                console.log('🔄 Admin detectado - recargando vista para corregir diseño...');
                setTimeout(() => {
                    window.location.reload();
                }, 300);
                
                showNotification(`👑 ¡Bienvenido Administrador ${currentUser.nombre}!`, 'success');
            } else {
                // 🔧 ASEGURARSE DE QUE USUARIOS NORMALES NO ESTÉN EN MODO ADMIN
                disableAdminMode();
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
            
            // 🔧 ASIGNAR ROL DE ADMINISTRADOR SOLO SI CORRESPONDE A CREDENCIALES ESPECÍFICAS
            let userRole = 'user';
            
            // 🔧 SOLO UN USUARIO ESPECÍFICO PUEDE SER ADMIN
            if (nombre === 'admin1' && email === 'admin@bodega.com' && password === 'contra_admin1') {
                userRole = 'admin';
                console.log('🔧 Creando cuenta de administrador autorizada');
            }
            
            // AGREGAR EL ROL AL USUARIO
            currentUser.role = userRole;
            
            // ACTUALIZAR EN LOCALSTORAGE
            localStorage.setItem('bodega_user', JSON.stringify(currentUser));
            
            updateAuthUI();
            hideAuthModals();
            
            // 🔧 NOTIFICACIÓN ESPECIAL Y ACTIVAR MODO ADMIN SOLO SI ES ADMIN VÁLIDO
            if (userRole === 'admin' && isValidAdmin(currentUser)) {
                enableAdminMode();
                
                // 🔧 SOLUCIÓN: REFRESH AUTOMÁTICO PARA ADMIN
                console.log('🔄 Admin detectado - recargando vista para corregir diseño...');
                setTimeout(() => {
                    window.location.reload();
                }, 300);
                
                showNotification(`👑 ¡Cuenta de Administrador creada exitosamente! Bienvenido, ${currentUser.nombre}`, 'success');
            } else {
                // 🔧 ASEGURARSE DE QUE USUARIOS NORMALES NO ESTÉN EN MODO ADMIN
                disableAdminMode();
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
    // Limpiar todos los datos
    authToken = null;
    currentUser = null;
    localStorage.removeItem('bodega_token');
    localStorage.removeItem('bodega_user');
    
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
    const adminMenuItem = document.getElementById('adminMenuItem');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        
        // 🔧 MOSTRAR INDICADOR DE ADMIN EN EL HEADER SOLO SI ES ADMIN VÁLIDO
        if (currentUser.role === 'admin' && isValidAdmin(currentUser)) {
            userName.textContent = '👑 Admin';
            dropdownUserName.innerHTML = `${currentUser.nombre} <span class="admin-badge">👑 Administrador</span>`;
            // Mostrar opción admin en el menú
            if (adminMenuItem) {
                adminMenuItem.style.display = 'block';
            }
        } else {
            userName.textContent = 'Cuenta';
            dropdownUserName.textContent = currentUser.nombre;
            // Ocultar opción admin en el menú para usuarios normales
            if (adminMenuItem) {
                adminMenuItem.style.display = 'none';
            }
        }
        
        dropdownUserEmail.textContent = currentUser.email;
    } else {
        loginBtn.style.display = 'flex';
        userMenu.style.display = 'none';
        // Ocultar opción admin si no hay usuario
        if (adminMenuItem) {
            adminMenuItem.style.display = 'none';
        }
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
    // Solo activar si el usuario actual es un admin válido
    if (!currentUser || currentUser.role !== 'admin' || !isValidAdmin(currentUser)) {
        console.warn('⚠️ Intento de activar modo admin sin permisos');
        return;
    }
    
    document.body.classList.add('admin-mode');
    document.body.setAttribute('data-user-role', 'admin');
    
    // 🔧 OCULTAR ELEMENTOS QUE NO SE USAN EN MODO ADMIN
    const searchBar = document.getElementById('searchBar');
    const cartToggle = document.getElementById('cartToggle');
    const filtersSidebar = document.getElementById('filtersSidebar');
    
    if (searchBar) searchBar.style.display = 'none';
    if (cartToggle) cartToggle.style.display = 'none';
    if (filtersSidebar) filtersSidebar.style.display = 'none';
    
    console.log('🔧 Modo administrador activado correctamente');
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
    
    // 🔧 VOLVER A LA VISTA NORMAL DEL CATÁLOGO SI ESTÁ EN ADMIN
    if (typeof showView === 'function' && currentView === 'admin') {
        showView('catalogo');
        showNotification('🔐 Modo administrador desactivado', 'info');
    }
    
    console.log('🔧 Modo administrador desactivado');
}

// 🔧 FUNCIÓN PARA MOSTRAR VISTA ADMIN CON VERIFICACIÓN DE PERMISOS
function showAdminView() {
    // 🔧 VERIFICAR PERMISOS ANTES DE MOSTRAR EL PANEL
    if (!currentUser || currentUser.role !== 'admin' || !isValidAdmin(currentUser)) {
        showNotification('🔐 No tienes permisos de administrador', 'error');
        if (typeof showView === 'function') {
            showView('catalogo');
        }
        return;
    }
    
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
