// ============================================
// ui.js — Coordinador de interfaz
//
// Este archivo NO sabe cómo hacer login, ni cómo hablar con Calendar,
// ni cómo convertir eventos en tarjetas. Eso ya lo saben auth.js,
// calendar.js y eventos.js. ui.js solo decide QUÉ pantalla se ve
// y CUÁNDO, llamando a las funciones que esos archivos ya exponen.
// ============================================


// --------------------------------------------
// iniciarApp()
// Parámetros: ninguno
// Se ejecuta una sola vez, cuando el HTML ya terminó de cargar
// (ver el addEventListener de DOMContentLoaded al final del archivo).
// Decide si mostrar la pantalla de login o la app principal,
// según si ya hay una sesión guardada en localStorage.
// --------------------------------------------
function iniciarApp() {
    // Ocultamos el botón de login mientras decidimos qué mostrar.
    // Esto evita que el usuario le dé clic mientras la app todavía
    // está revisando si ya había sesión (una de las causas del bug
    // de doble solicitud de token que vamos a corregir en el Issue 2).
    loginButton.style.display = 'none';
  
    const token = obtenerTokenValido();
    // NOTA para cuando resolvamos el Issue 1: esta línea va a cambiar
    // a leer 'gea_token' (un objeto con access_token + expira_en),
    // no un string plano como ahora.
  
    if (token) {
      restaurarSesion(token);
    } else {
      mostrarPantallaLogin();
    }
  }
  
  
  // --------------------------------------------
  // mostrarPantallaLogin()
  // Parámetros: ninguno
  // Deja visible solo lo necesario para iniciar sesión, y limpia
  // cualquier resto de una sesión anterior (lista de eventos, avatar, etc).
  // --------------------------------------------
  function mostrarPantallaLogin() {
    loginButton.style.display = 'block';
    calendarBotones.style.display = 'none';
    resultadoDiv.style.display = 'none';
    resultadoDiv.innerHTML = '';
    listaEventosEl.innerHTML = '';
  }
  
  
  // --------------------------------------------
  // mostrarPantallaApp(datosUsuario)
  // Parámetros:
  //   datosUsuario: objeto { name, email, picture } que devuelve
  //   el endpoint de userinfo de Google.
  // Deja visible la app principal ya con la sesión iniciada.
  // --------------------------------------------
  function mostrarPantallaApp(datosUsuario) {
    loginButton.style.display = 'none';
    calendarBotones.style.display = 'block';
  
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
      <img src="${datosUsuario.picture}" alt="avatar">
      <strong>${datosUsuario.name}</strong><br>
      ${datosUsuario.email}
    `;
  }
  
  
  // --------------------------------------------
  // restaurarSesion(token)
  // Parámetros:
  //   token: string, el access_token que estaba guardado en localStorage
  // Le pregunta a Google si ese token todavía sirve. Según la respuesta,
  // decide si mostrar la app principal o mandar de vuelta al login.
  // --------------------------------------------
  function restaurarSesion(token) {
    AppState.accessToken = token;
  
    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Token expirado o inválido');
        return res.json();
      })
      .then(datosUsuario => {
        mostrarPantallaApp(datosUsuario);
        cargarEventosIniciales();
      })
      .catch(() => {
        // El token guardado ya no sirve: limpiamos todo y regresamos al login
        localStorage.removeItem('gea_Token');
        AppState.accessToken = null;
        mostrarPantallaLogin();
      });
  }
  
  
  // --------------------------------------------
  // cargarEventosIniciales()
  // Parámetros: ninguno
  // Pide la lista de eventos a Calendar (listarEventos, de calendar.js)
  // y los pinta en pantalla (renderizarEventos, de eventos.js).
  // Se usa tanto al restaurar sesión como al hacer login por primera vez,
  // así que vive aquí en vez de repetirse en dos lugares distintos.
  // --------------------------------------------
  function cargarEventosIniciales() {
    listarEventos()
      .then(eventos => {
        mostrarSalida('Eventos:\n' + JSON.stringify(eventos, null, 2));
        renderizarEventos();
      })
      .catch(err => mostrarSalida('Error: ' + err));
  }
  
  
  // --------------------------------------------
  // Punto de entrada: arranca todo cuando el HTML ya está listo.
  // DOMContentLoaded se dispara cuando el navegador terminó de leer
  // el HTML (no espera imágenes ni nada externo), momento seguro para
  // empezar a buscar elementos del DOM y decidir qué mostrar.
  // --------------------------------------------
  document.addEventListener('DOMContentLoaded', iniciarApp);