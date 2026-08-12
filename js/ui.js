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
    document.getElementById('pantallaLogin').style.display = 'block';
    document.getElementById('pantallaApp').style.display = 'none';
    document.getElementById('usuarioLogueado').textContent = '';
    document.getElementById('avatarUsuario').style.display = 'none';
    logoutBtn.style.display = 'none';
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
    document.getElementById('pantallaLogin').style.display = 'none';
    document.getElementById('pantallaApp').style.display = 'block';
    document.getElementById('usuarioLogueado').textContent = datosUsuario.name;
    const avatarEl = document.getElementById('avatarUsuario');
    avatarEl.src = datosUsuario.picture;
    avatarEl.style.display = 'block';
    logoutBtn.style.display = 'block';
    loginButton.style.display = 'none';
    calendarBotones.style.display = 'block';
  
    resultadoDiv.style.display = 'none';
    resultadoDiv.innerHTML = '';
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


  // ============================================
  // VISTA CALENDARIO (Día / Semana / Mes)
  // Era el ejemplo inline de index.html; se movió aquí
  // para tener todo el JS de la interfaz en js/ui.js.
  // ============================================

  var anioActual = new Date().getFullYear();
  var mesActual = new Date().getMonth();
  var diaActual = new Date().getDate();
  var vistaActual = 'dia';
  var meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  function dosDigitos(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function fechaString(anio, mes, dia) {
    return anio + '-' + dosDigitos(mes + 1) + '-' + dosDigitos(dia);
  }

  function eventosDeFecha(anio, mes, dia) {
    var eventos = leerCache();
    var resultado = [];
    var fecha = fechaString(anio, mes, dia);
    var fechaHoy = fechaString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    for (var i = 0; i < eventos.length; i++) {
      // Solo eventos de hoy o futuros, nunca de dias anteriores
      if (eventos[i].fecha >= fechaHoy && eventos[i].fecha === fecha) {
        resultado.push(eventos[i]);
      }
    }
    return resultado;
  }

  function pintarCalendario() {
    if (vistaActual === 'dia') {
      pintarDia();
    } else if (vistaActual === 'semana') {
      pintarSemana();
    } else {
      pintarMes();
    }
  }

  function pintarMes() {
    var contenido = document.getElementById('contenidoCalendario');
    document.getElementById('tituloCalendario').textContent = meses[mesActual] + ' ' + anioActual;

    var primerDia = new Date(anioActual, mesActual, 1);
    var ultimoDia = new Date(anioActual, mesActual + 1, 0).getDate();
    var diaInicial = (primerDia.getDay() + 6) % 7;

    var html = '<table class="tabla-calendario">';
    html = html + '<thead><tr><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr></thead><tbody><tr>';

    for (var i = 0; i < diaInicial; i++) {
      html = html + '<td></td>';
    }

    for (var dia = 1; dia <= ultimoDia; dia++) {
      var conEvento = eventosDeFecha(anioActual, mesActual, dia).length > 0;
      var hoy = (anioActual === new Date().getFullYear() && mesActual === new Date().getMonth() && dia === new Date().getDate());
      var clase = (conEvento ? ' dia-evento' : '') + (hoy ? ' dia-hoy' : '') + (dia === diaActual ? ' dia-seleccionado' : '');
      html = html + '<td class="' + clase + '"><span class="numero-dia">' + dia + '</span></td>';
      if ((diaInicial + dia) % 7 === 0) {
        html = html + '</tr><tr>';
      }
    }

    html = html + '</tr></tbody></table>';
    contenido.innerHTML = html;

    var celdas = contenido.querySelectorAll('.tabla-calendario td');
    for (var c = 0; c < celdas.length; c++) {
      if (celdas[c].querySelector('.numero-dia')) {
        celdas[c].addEventListener('click', seleccionarDia);
      }
    }
  }

  function pintarSemana() {
    var contenido = document.getElementById('contenidoCalendario');

    var lunes = new Date(anioActual, mesActual, diaActual);
    var diff = (lunes.getDay() + 6) % 7;
    lunes.setDate(lunes.getDate() - diff);

    var html = '<div class="vista-semana">';
    for (var d = 0; d < 7; d++) {
      var dia = new Date(lunes);
      dia.setDate(lunes.getDate() + d);
      var eventos = eventosDeFecha(dia.getFullYear(), dia.getMonth(), dia.getDate());
      var esHoy = (dia.getFullYear() === new Date().getFullYear() && dia.getMonth() === new Date().getMonth() && dia.getDate() === new Date().getDate());

      var nombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dia.getDay()];
      var claseDia = esHoy ? ' dia-hoy' : '';
      html = html + '<div class="columna-dia' + claseDia + '">';
      html = html + '<div class="cabecera-dia">' + nombre + ' ' + dia.getDate() + '</div>';

      if (eventos.length === 0) {
        html = html + '<div class="sin-eventos">Sin eventos</div>';
      } else {
        for (var e = 0; e < eventos.length; e++) {
          html = html + '<div class="mini-evento">' + eventos[e].hora + ' ' + eventos[e].titulo + '</div>';
        }
      }
      html = html + '</div>';
    }
    html = html + '</div>';
    contenido.innerHTML = html;
    document.getElementById('tituloCalendario').textContent = 'Semana del ' + lunes.getDate() + ' de ' + meses[lunes.getMonth()];
  }

  function pintarDia() {
    var contenido = document.getElementById('contenidoCalendario');
    var fecha = new Date(anioActual, mesActual, diaActual);
    document.getElementById('tituloCalendario').textContent = diasSemana[fecha.getDay()] + ' ' + diaActual + ' de ' + meses[mesActual] + ' de ' + anioActual;

    var eventos = eventosDeFecha(anioActual, mesActual, diaActual);
    var html = '<div class="linea-horas">';

    for (var h = 0; h < 24; h++) {
      var horaTexto = dosDigitos(h) + ':00';
      html = html + '<div class="fila-hora">';
      html = html + '<span class="hora">' + horaTexto + '</span>';
      html = html + '<div class="celda-hora">';

      for (var i = 0; i < eventos.length; i++) {
        if (eventos[i].hora && parseInt(eventos[i].hora.substring(0, 2), 10) === h) {
          html = html + '<div class="evento-dia">' + eventos[i].hora + ' ' + eventos[i].titulo + '</div>';
        }
      }

      html = html + '</div></div>';
    }

    html = html + '</div>';
    contenido.innerHTML = html;
  }

  function seleccionarDia(e) {
    var numero = e.currentTarget.querySelector('.numero-dia');
    if (!numero) return;
    diaActual = parseInt(numero.textContent, 10);
    renderizarEventos();
  }

  function navegarAdelante() {
    if (vistaActual === 'dia') {
      var d = new Date(anioActual, mesActual, diaActual + 1);
      anioActual = d.getFullYear(); mesActual = d.getMonth(); diaActual = d.getDate();
    } else if (vistaActual === 'semana') {
      var s = new Date(anioActual, mesActual, diaActual + 7);
      anioActual = s.getFullYear(); mesActual = s.getMonth(); diaActual = s.getDate();
    } else {
      mesActual = mesActual + 1;
      if (mesActual > 11) { mesActual = 0; anioActual = anioActual + 1; }
    }
    renderizarEventos();
  }

  function navegarAtras() {
    if (vistaActual === 'dia') {
      var d = new Date(anioActual, mesActual, diaActual - 1);
      anioActual = d.getFullYear(); mesActual = d.getMonth(); diaActual = d.getDate();
    } else if (vistaActual === 'semana') {
      var s = new Date(anioActual, mesActual, diaActual - 7);
      anioActual = s.getFullYear(); mesActual = s.getMonth(); diaActual = s.getDate();
    } else {
      mesActual = mesActual - 1;
      if (mesActual < 0) { mesActual = 11; anioActual = anioActual - 1; }
    }
    renderizarEventos();
  }

  function irHoy() {
    anioActual = new Date().getFullYear();
    mesActual = new Date().getMonth();
    diaActual = new Date().getDate();
    renderizarEventos();
  }

  function cambiarVista(nuevaVista) {
    vistaActual = nuevaVista;
    var botones = document.querySelectorAll('.vistas-botones button');
    for (var i = 0; i < botones.length; i++) {
      botones[i].classList.remove('activa');
    }
    document.getElementById('btnVista' + nuevaVista.charAt(0).toUpperCase() + nuevaVista.slice(1)).classList.add('activa');
    pintarCalendario();
  }

  document.getElementById('mesAnterior').addEventListener('click', navegarAtras);
  document.getElementById('mesSiguiente').addEventListener('click', navegarAdelante);
  document.getElementById('btnHoy').addEventListener('click', irHoy);
  document.getElementById('btnVistaDia').addEventListener('click', function () { cambiarVista('dia'); });
  document.getElementById('btnVistaSemana').addEventListener('click', function () { cambiarVista('semana'); });
  document.getElementById('btnVistaMes').addEventListener('click', function () { cambiarVista('mes'); });

  // Ocultar/mostrar el calendario
  document.getElementById('btnColapsar').addEventListener('click', function () {
    var calendario = document.getElementById('vistaCalendario');
    if (calendario.style.display === 'none') {
      calendario.style.display = 'block';
    } else {
      calendario.style.display = 'none';
    }
  });

  // Buscar eventos (lupa)
  document.getElementById('btnBuscar').addEventListener('click', function () {
    var barra = document.getElementById('barraBuscar');
    if (barra.style.display === 'none') {
      barra.style.display = 'block';
      barra.focus();
    } else {
      barra.style.display = 'none';
      barra.value = '';
      renderizarEventos();
    }
  });

  document.getElementById('barraBuscar').addEventListener('input', function () {
    var texto = this.value.toLowerCase();
    var items = document.querySelectorAll('#listaEventos .evento-item');
    for (var i = 0; i < items.length; i++) {
      if (items[i].textContent.toLowerCase().indexOf(texto) !== -1) {
        items[i].style.display = '';
      } else {
        items[i].style.display = 'none';
      }
    }
  });

  document.getElementById('exportarBtn').addEventListener('click', function () {
    var eventos = leerCache();
    var texto = 'Titulo,Fecha,Hora,Tipo\n';
    for (var i = 0; i < eventos.length; i++) {
      texto = texto + eventos[i].titulo + ',' + eventos[i].fecha + ',' + eventos[i].hora + ',' + eventos[i].tipo + '\n';
    }

    // Aqui iria el codigo real de Google Sheets API (en js/sheets.js).
    // Ejemplo simple: descarga un archivo CSV que se abre en Google Sheets.
    var enlace = document.createElement('a');
    enlace.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(texto);
    enlace.download = 'eventos.csv';
    enlace.click();
  });

  cambiarVista('dia');