// ============================================
// js/auth.js — Manejo de Sesión, OAuth2 y Perfil
// ============================================

let tokenClient;

// 1. Verificar si existe un token válido en localStorage bajo gea_token
function hayTokenValido() {
  const guardado = localStorage.getItem('gea_token');
  if (!guardado) return false;
  try {
    const { expira_en } = JSON.parse(guardado);
    return Date.now() < expira_en;
  } catch (e) {
    return false;
  }
}

// 2. Obtener la cadena del token activo
function obtenerTokenValido() {
  if (!hayTokenValido()) {
    cerrarSesionLocal();
    return null;
  }
  const { access_token } = JSON.parse(localStorage.getItem('gea_token'));
  return access_token;
}

// 3. Inicialización del cliente OAuth2 de Google
function inicializarGoogleAuth() {
  if (!window.google || !google.accounts || !google.accounts.oauth2) return;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error !== undefined) {
        console.error('Error de autenticación:', response);
        return;
      }

      // Estructura acordada: gea_token: { access_token, expira_en }
      const tiempoExpiracion = Date.now() + (response.expires_in ? response.expires_in * 1000 : 3600000);
      const objetoToken = {
        access_token: response.access_token,
        expira_en: tiempoExpiracion
      };

      localStorage.setItem('gea_token', JSON.stringify(objetoToken));
      localStorage.removeItem('accessToken'); // Limpieza de clave previa

      obtenerPerfilUsuario(response.access_token);
      mostrarPantallaApp();

      if (window.listarEventos) window.listarEventos();
    },
  });
}

// 4. Solicitar token
function solicitarToken() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    inicializarGoogleAuth();
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

// 5. Obtener perfil básico del usuario autenticado
function obtenerPerfilUsuario(token) {
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(perfil => {
      const elNombre = document.getElementById('nombreUsuario');
      const elAvatar = document.getElementById('avatarUsuario');

      if (elNombre) elNombre.textContent = perfil.name || perfil.email || 'Usuario';
      if (elAvatar && perfil.picture) elAvatar.src = perfil.picture;
    })
    .catch(err => console.error('Error al obtener perfil:', err));
}

// 6. Cierre de sesión con revocación y fallback
function cerrarSesion() {
  const token = obtenerTokenValido();

  const finalizarLogout = () => {
    cerrarSesionLocal();
  };

  if (token && window.google && google.accounts && google.accounts.oauth2) {
    try {
      google.accounts.oauth2.revoke(token, () => {
        console.log('Token revocado en Google');
        finalizarLogout();
      });
    } catch (e) {
      console.warn('Fallback por error en revocación:', e);
      finalizarLogout();
    }
  } else {
    finalizarLogout();
  }
}

function cerrarSesionLocal() {
  localStorage.removeItem('gea_token');
  localStorage.removeItem('accessToken');
  mostrarPantallaLogin();
}

function mostrarPantallaApp() {
  const pLogin = document.getElementById('pantallaLogin');
  const pApp = document.getElementById('pantallaApp');
  if (pLogin) pLogin.style.display = 'none';
  if (pApp) pApp.style.display = 'block';
}

function mostrarPantallaLogin() {
  const pLogin = document.getElementById('pantallaLogin');
  const pApp = document.getElementById('pantallaApp');
  if (pLogin) pLogin.style.display = 'block';
  if (pApp) pApp.style.display = 'none';
}

// 7. Carga inicial del estado
document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('loginButton');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginButton) loginButton.addEventListener('click', solicitarToken);
  if (logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);

  setTimeout(() => {
    if (window.google) inicializarGoogleAuth();
  }, 500);

  if (hayTokenValido()) {
    const token = obtenerTokenValido();
    obtenerPerfilUsuario(token);
    mostrarPantallaApp();
    if (window.listarEventos) window.listarEventos();
  } else {
    cerrarSesionLocal();
  }
});