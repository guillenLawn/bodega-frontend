// ===== SISTEMA DE AUTENTICACIÓN COMPLETO =====

// ===== VARIABLES GLOBALES =====
let authInitialized = false;

// ===== INICIALIZAR AUTENTICACIÓN =====
async function initializeAuth() {
    if (authInitialized) return;
    
    console.log(' Inicializando autenticación...');
    
    try {
        // Configurar listeners
        setupAuthEventListeners();
        
        // Verificar sesión existente
        await checkExistingAuth();
        
        authInitialized = true;
        console.log(' Autenticación inicializada');
    } catch (error) {
        console.error(' Error inicializando autenticación:', error);
    }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupAuthEventListeners() {
    // Botones para mostrar modales
    const loginBtn = document.getElementById('loginBtn');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    
    if (loginBtn) loginBtn.addEventListener('click', () => showAuthModal('login'));
    if (showRegister) showRegister.addEventListener('click', () => showAuthModal('register'));
    if (showLogin) showLogin.addEventListener('click', () => showAuthModal('login'));
    
    // Botones cerrar modales
    const closeLoginModal = document.getElementById('closeLoginModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const authOverlay = document.getElementById('authOverlay');
    
    if (closeLoginModal) closeLoginModal.addEventListener('click', hideAuthModals);
    if (closeRegisterModal) closeRegisterModal.addEventListener('click', hideAuthModals);
    if (authOverlay) authOverlay.addEventListener('click', hideAuthModals);
    
    // Formularios
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    // Menú usuario
    const userBtn = document.getElementById('userBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userBtn) userBtn.addEventListener('click', toggleUserDropdown);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        const userMenu = document.getElementById('userMenu');
        const userBtn = document.getElementById('userBtn');
        
        if (userMenu && userBtn && !userMenu.contains(e.target) && !userBtn.contains(e.target)) {
            hideUserDropdown();
        }
    });
}

// ===== VERIFICAR SESIÓN EXISTENTE =====
async function checkExistingAuth() {
    console.log(' Verificando autenticación existente...');
    
    const token = localStorage.getItem('bodega_token');
    if (!token) {
        console.log(' No hay token de autenticación');
        clearAuthData();
        return;
    }
    
    try {
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            window.currentUser = data.user;
            window.authToken = token;
            
            console.log(' Usuario autenticado:', window.currentUser);
            
            // Cargar rol desde localStorage
            const savedUser = localStorage.getItem('bodega_user');
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    if (userData.role && userData.email === window.currentUser.email) {
                        window.currentUser.role = userData.role;
                        console.log('🔧 Rol cargado desde localStorage:', userData.role);
                    }
                } catch (error) {
                    console.error('Error parsing saved user:', error);
                }
            }
            
            updateAuthUI();
            
            // Activar modo admin si corresponde
            if (window.currentUser.role === 'admin' && isValidAdmin(window.currentUser)) {
                if (typeof enableAdminMode === 'function') {
                    enableAdminMode();
                }
                console.log('🔧 Usuario admin verificado correctamente');
            }
            
        } else {
            console.log(' Token inválido, limpiando datos...');
            clearAuthData();
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        clearAuthData();
    }
}

// ===== VALIDAR ADMINISTRADOR =====
function isValidAdmin(user) {
    // Solo usuarios específicos pueden ser admins
    const validAdmins = ['admin@bodega.com'];
    return validAdmins.includes(user.email) && user.role === 'admin';
}

// ===== LIMPIAR DATOS DE AUTENTICACIÓN =====
function clearAuthData() {
    localStorage.removeItem('bodega_token');
    localStorage.removeItem('bodega_user');
    window.authToken = null;
    window.currentUser = null;
    
    if (typeof disableAdminMode === 'function') {
        disableAdminMode();
    }
    
    updateAuthUI();
}

// ===== MANEJO DE MODALES =====
function showAuthModal(type) {
    hideUserDropdown();
    
    const authOverlay = document.getElementById('authOverlay');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (!authOverlay || !loginModal) return;
    
    authOverlay.classList.add('active');
    
    if (type === 'login') {
        loginModal.classList.add('active');
        registerModal.classList.remove('active');
        document.getElementById('loginForm')?.reset();
    } else if (type === 'register') {
        registerModal.classList.add('active');
        loginModal.classList.remove('active');
        document.getElementById('registerForm')?.reset();
    }
}

function hideAuthModals() {
    const authOverlay = document.getElementById('authOverlay');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (authOverlay) authOverlay.classList.remove('active');
    if (loginModal) loginModal.classList.remove('active');
    if (registerModal) registerModal.classList.remove('active');
}

// ===== MANEJAR LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
        showNotification(' Por favor completa todos los campos', 'error');
        return;
    }
    
    try {
        // Mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
        
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Guardar token y datos de usuario
            window.authToken = data.token;
            window.currentUser = data.user;
            localStorage.setItem('bodega_token', window.authToken);
            
            // Asignar rol
            if (!window.currentUser.role) {
                if (email === 'admin@bodega.com') {
                    window.currentUser.role = 'admin';
                } else {
                    window.currentUser.role = 'user';
                }
            }
            
            // Validar rol de admin
            if (window.currentUser.role === 'admin' && !isValidAdmin(window.currentUser)) {
                window.currentUser.role = 'user';
                console.warn(' Intento de acceso admin no autorizado:', email);
            }
            
            // Guardar en localStorage
            localStorage.setItem('bodega_user', JSON.stringify(window.currentUser));
            
            // Actualizar UI
            updateAuthUI();
            hideAuthModals();
            
            // Activar modo admin si corresponde
            if (window.currentUser.role === 'admin' && isValidAdmin(window.currentUser)) {
                if (typeof enableAdminMode === 'function') {
                    enableAdminMode();
                }
                
                // Mostrar vista admin después de login
                setTimeout(() => {
                    if (typeof showView === 'function') {
                        showView('admin');
                    }
                }, 300);
                
                showNotification(` ¡Bienvenido Administrador ${window.currentUser.nombre}!`, 'success');
            } else {
                // Asegurar que usuarios normales no estén en modo admin
                if (typeof disableAdminMode === 'function') {
                    disableAdminMode();
                }
                showNotification(` Bienvenido, ${window.currentUser.nombre}!`);
            }
            
            // Notificar si hay productos en carrito
            if (window.cart && window.cart.length > 0) {
                showNotification('🛒 Tus productos del carrito están listos para pedir');
            }
            
        } else {
            showNotification(` ${data.error || 'Error en el login'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showNotification(' Error de conexión', 'error');
    } finally {
        // Restaurar botón
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
        showNotification(' Por favor completa todos los campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification(' La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        // Mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
        
        const response = await fetch('https://bodega-backend-nuevo.onrender.com/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Guardar token y datos de usuario
            window.authToken = data.token;
            window.currentUser = data.user;
            localStorage.setItem('bodega_token', window.authToken);
            
            // Asignar rol (solo admin@bodega.com puede ser admin)
            let userRole = 'user';
            if (email === 'admin@bodega.com') {
                userRole = 'admin';
                console.log('🔧 Creando cuenta de administrador');
            }
            
            window.currentUser.role = userRole;
            localStorage.setItem('bodega_user', JSON.stringify(window.currentUser));
            
            // Actualizar UI
            updateAuthUI();
            hideAuthModals();
            
            // Activar modo admin si corresponde
            if (userRole === 'admin' && isValidAdmin(window.currentUser)) {
                if (typeof enableAdminMode === 'function') {
                    enableAdminMode();
                }
                
                // Mostrar vista admin después de registro
                setTimeout(() => {
                    if (typeof showView === 'function') {
                        showView('admin');
                    }
                }, 300);
                
                showNotification(` ¡Cuenta de Administrador creada exitosamente! Bienvenido, ${window.currentUser.nombre}`, 'success');
            } else {
                // Asegurar que usuarios normales no estén en modo admin
                if (typeof disableAdminMode === 'function') {
                    disableAdminMode();
                }
                showNotification(` Cuenta creada exitosamente! Bienvenido, ${window.currentUser.nombre}`);
            }
            
        } else {
            showNotification(` ${data.error || 'Error en el registro'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification(' Error de conexión', 'error');
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Crear Cuenta';
    }
}

// ===== MANEJAR LOGOUT =====
function handleLogout() {
    // Limpiar todos los datos
    window.authToken = null;
    window.currentUser = null;
    localStorage.removeItem('bodega_token');
    localStorage.removeItem('bodega_user');
    
    // Desactivar modo admin
    if (typeof disableAdminMode === 'function') {
        disableAdminMode();
    }
    
    // Actualizar UI
    updateAuthUI();
    hideUserDropdown();
    
    // Volver al catálogo si estaba en admin
    if (window.currentView === 'admin' && typeof showView === 'function') {
        showView('catalogo');
    }
    
    showNotification(' Sesión cerrada correctamente');
}

// ===== ACTUALIZAR UI DE AUTENTICACIÓN =====
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');
    const adminMenuItem = document.getElementById('adminMenuItem');
    
    if (!loginBtn || !userMenu) return;
    
    if (window.currentUser) {
        // Usuario logueado
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        
        // Mostrar información del usuario
        if (window.currentUser.role === 'admin' && isValidAdmin(window.currentUser)) {
            userName.textContent = ' Admin';
            if (dropdownUserName) {
                dropdownUserName.innerHTML = `${window.currentUser.nombre} <span class="admin-badge"> Administrador</span>`;
            }
            if (adminMenuItem) {
                adminMenuItem.style.display = 'block';
            }
        } else {
            userName.textContent = 'Cuenta';
            if (dropdownUserName) {
                dropdownUserName.textContent = window.currentUser.nombre;
            }
            if (adminMenuItem) {
                adminMenuItem.style.display = 'none';
            }
        }
        
        if (dropdownUserEmail) {
            dropdownUserEmail.textContent = window.currentUser.email;
        }
    } else {
        // Usuario no logueado
        loginBtn.style.display = 'flex';
        userMenu.style.display = 'none';
        
        if (adminMenuItem) {
            adminMenuItem.style.display = 'none';
        }
    }
}

// ===== MANEJO DEL DROPDOWN DE USUARIO =====
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function hideUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// ===== EXPONER FUNCIONES GLOBALES =====
window.initializeAuth = initializeAuth;
window.showAuthModal = showAuthModal;
window.handleLogout = handleLogout;
window.updateAuthUI = updateAuthUI;

console.log(' app-auth.js cargado correctamente');
