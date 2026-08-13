// ============================================
// js/calendar.js — API Google Calendar + CRUD + Vistas
// ============================================

let fechaActual = new Date();
let vistaActual = 'semana';
let eventoAEliminarId = null;
let eventoEdicionId = null;

// Variable global para lectura desde filtros.js
window.textoBusqueda = '';

// 1. AUTENTICACIÓN Y TOKEN OAUTH2
function obtenerTokenAcceso() {
  if (typeof hayTokenValido === 'function' && !hayTokenValido()) {
    console.warn('El token ha expirado o no es válido.');
    return null;
  }
  const guardado = localStorage.getItem('gea_token');
  return guardado ? JSON.parse(guardado).access_token : null;
}

// 2. CACHÉ LOCAL Y FILTRADO
function leerCache() {
  const data = localStorage.getItem('gea_eventos_cache');
  const eventos = data ? JSON.parse(data) : [];

  const busqueda = window.textoBusqueda || '';

  if (busqueda.trim() !== '') {
    const termino = busqueda.toLowerCase().trim();
    return eventos.filter(e => 
      (e.titulo && e.titulo.toLowerCase().includes(termino)) || 
      (e.descripcion && e.descripcion.toLowerCase().includes(termino))
    );
  }

  return eventos;
}

function guardarCache(eventos) {
  localStorage.setItem('gea_eventos_cache', JSON.stringify(eventos));
}

function mapearEventoAEstandar(e) {
  const fechaHoraInicio = e.start?.dateTime || e.start?.date || '';
  const fechaHoraFin = e.end?.dateTime || e.end?.date || '';

  const [fechaInicio, horaInicioConZona] = fechaHoraInicio.split('T');
  const [fechaFin, horaFinConZona] = fechaHoraFin.split('T');

  return {
    id: e.id,
    titulo: e.summary || '(Sin título)',
    fecha: fechaInicio || '',
    hora: horaInicioConZona ? horaInicioConZona.substring(0, 5) : '00:00',
    fechaFin: fechaFin || fechaInicio || '',
    horaFin: horaFinConZona ? horaFinConZona.substring(0, 5) : '01:00',
    descripcion: e.description || '',
    tipo: e.extendedProperties?.private?.tipo || 'general'
  };
}

// 3. OBTENER EVENTOS DESDE LA API DE GOOGLE CALENDAR
function obtenerEventosGoogleCalendar() {
  const token = obtenerTokenAcceso();
  if (!token) return Promise.reject('Sin token de acceso');

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error.message);
      const eventosEstandar = (data.items || []).map(mapearEventoAEstandar);
      guardarCache(eventosEstandar);
      
      renderizarCalendario();
      return eventosEstandar;
    })
    .catch(err => console.error('Error al sincronizar con Google Calendar:', err));
}

// 4. CREAR Y ACTUALIZAR (PATCH / POST) EN GOOGLE CALENDAR
function guardarEventoEnGoogleCalendar(estructuraGoogle, eventId = null) {
  const token = obtenerTokenAcceso();
  if (!token) return Promise.reject('Sin token de acceso');

  const esEdicion = Boolean(eventId);
  const url = esEdicion 
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}` 
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  return fetch(url, {
    method: esEdicion ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(estructuraGoogle)
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        console.log('ERROR DE GOOGLE (crear):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventoEstandar = mapearEventoAEstandar(data);
      actualizarEventoEnCache(eventoEstandar);
      return eventoEstandar;
    });
}

const modalCrear = document.getElementById('modalCrear');
const formCrearEvento = document.getElementById('formCrearEvento');
const btnCancelar = document.getElementById('btnCancelar');
const modalTitulo = document.getElementById('modalTitulo');
const btnModalCrear = document.getElementById('btnModalCrear');

let eventoEnEdicion = null;

function cerrarModalCrear() {
  modalCrear.classList.remove('abierto');
  formCrearEvento.reset();
  eventoEnEdicion = null;
  modalTitulo.textContent = 'Crear Evento';
  btnModalCrear.textContent = 'Crear Evento';
}

function abrirModalCrear() {
  eventoEnEdicion = null;
  modalTitulo.textContent = 'Crear Evento';
  btnModalCrear.textContent = 'Crear Evento';
  formCrearEvento.reset();
  modalCrear.classList.add('abierto');
}

function abrirModalEditar(evento) {
  eventoEnEdicion = evento;
  modalTitulo.textContent = 'Editar Evento';
  btnModalCrear.textContent = 'Guardar Cambios';

  const [fechaInicio, horaInicio] = evento.fechaHoraInicio ? evento.fechaHoraInicio.split('T') : [evento.fecha, evento.hora];
  const [fechaFinal, horaFinal] = evento.fechaHoraFin ? evento.fechaHoraFin.split('T') : [evento.fecha, evento.hora];

  document.getElementById('campoTitulo').value = evento.titulo;
  document.getElementById('campoDescripcion').value = evento.descripcion;
  document.getElementById('campoFechaInicio').value = fechaInicio;
  document.getElementById('campoHoraInicio').value = horaInicio ? horaInicio.substring(0, 5) : '';
  document.getElementById('campoFechaFinal').value = fechaFinal;
  document.getElementById('campoHoraFinal').value = horaFinal ? horaFinal.substring(0, 5) : '';
  document.getElementById('campoTipo').value = evento.tipo;

  modalCrear.classList.add('abierto');
}

crearBtn.addEventListener('click', abrirModalCrear);

btnCancelar.addEventListener('click', cerrarModalCrear);
modalCrear.addEventListener('click', (e) => {
  if (e.target === modalCrear) cerrarModalCrear();
});

formCrearEvento.addEventListener('submit', (e) => {
  e.preventDefault();

  const titulo = document.getElementById('campoTitulo').value.trim();
  if (!titulo) return;

  const descripcion = document.getElementById('campoDescripcion').value.trim();
  const fechaInicio = document.getElementById('campoFechaInicio').value;
  const horaInicio = document.getElementById('campoHoraInicio').value;
  const fechaFinal = document.getElementById('campoFechaFinal').value;
  const horaFinal = document.getElementById('campoHoraFinal').value;
  const tipo = document.getElementById('campoTipo').value;

  if (!titulo || !fechaInicio || !horaInicio || !fechaFinal || !horaFinal) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  const estructuraGoogle = {
    summary: titulo,
    description: descripcion,
    start: { dateTime: `${fechaInicio}T${horaInicio}:00-05:00` },
    end: { dateTime: `${fechaFinal}T${horaFinal}:00-05:00` },
    extendedProperties: {
      private: { tipo: tipo }
    }
  };

  // Evita que el doble clic en "Guardar" duplique el evento
  btnModalCrear.disabled = true;

  const guardar = eventoEnEdicion
    ? editarEvento(eventoEnEdicion.id, datosEvento)
    : crearEvento(datosEvento);

  guardar
    .then(() => {
      renderizarEventos();
      cerrarModalCrear();
    })
    .catch(err => mostrarSalida('Error: ' + err));
});

// --------------------------------------------
// EDITAR EVENTO (PATCH)
// --------------------------------------------
function editarEvento(eventoId, cambios) {
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cambios)
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        console.log('ERROR DE GOOGLE (editar):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventoEstandar = mapearEventoAEstandar(data);
      actualizarEventoEnCache(eventoEstandar);
      return eventoEstandar;
    });
}

// VISTA SEMANA
function renderizarVistaSemana(contenedor, titulo, eventos) {
  const inicioSemana = new Date(fechaActual);
  const diaSemana = inicioSemana.getDay();
  const dif = inicioSemana.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
  inicioSemana.setDate(dif);

  if (titulo) {
    titulo.textContent = `Semana del ${inicioSemana.getDate()} de ${inicioSemana.toLocaleDateString('es-ES', { month: 'long' })}`;
  }

  const contenedorSemana = document.createElement('div');
  contenedorSemana.style.display = 'flex';
  contenedorSemana.style.flexDirection = 'column';
  contenedorSemana.style.gap = '10px';

  for (let i = 0; i < 7; i++) {
    const diaI = new Date(inicioSemana);
    diaI.setDate(inicioSemana.getDate() + i);
    const fechaISO = diaI.toISOString().split('T')[0];

    const tarjetaDia = document.createElement('div');
    tarjetaDia.style.background = '#f8fafc';
    tarjetaDia.style.border = '1px solid #e2e8f0';
    tarjetaDia.style.borderRadius = '8px';
    tarjetaDia.style.padding = '10px 14px';

    const nombreDia = diaI.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    const evs = eventos.filter(e => e.fecha === fechaISO);

    let htmlEvs = '<span style="color:#94a3b8; font-size:12px;">Sin eventos</span>';
    if (evs.length > 0) {
      htmlEvs = evs.map(e => `
        <div style="background:#ffffff; border-left: 3px solid #4b2a85; padding:6px 10px; margin-top:6px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#0f172a; font-size:13px;">${e.titulo}</strong>
            <span style="font-size:11px; color:#64748b;"> (⏰ ${e.hora})</span>
          </div>
          <div>
            <button onclick="abrirModalEditar('${e.id}')" style="background:#e0e7ff; color:#3730a3; border:none; padding:3px 6px; border-radius:4px; cursor:pointer; font-size:11px; margin-right:4px;">✏️</button>
            <button onclick="solicitarEliminarEvento('${e.id}', '${e.titulo}')" style="background:#fee2e2; color:#ef4444; border:none; padding:3px 6px; border-radius:4px; cursor:pointer; font-size:11px;">✕</button>
          </div>
        </div>
      `).join('');
    }

    tarjetaDia.innerHTML = `
      <div style="font-weight:700; color:#334155; text-transform:capitalize; font-size:13px;">${nombreDia}</div>
      ${htmlEvs}
    `;
    contenedorSemana.appendChild(tarjetaDia);
  }
  contenedor.appendChild(contenedorSemana);
}

// VISTA MES
function renderizarVistaMes(contenedor, titulo, eventos) {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();

  if (titulo) {
    titulo.textContent = fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  const totalDiasMes = new Date(año, mes + 1, 0).getDate();
  const gridMes = document.createElement('div');
  gridMes.style.display = 'grid';
  gridMes.style.gridTemplateColumns = 'repeat(7, 1fr)';
  gridMes.style.gap = '6px';

  const diasNombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  diasNombres.forEach(d => {
    const cabecera = document.createElement('div');
    cabecera.style.fontWeight = 'bold';
    cabecera.style.textAlign = 'center';
    cabecera.style.fontSize = '12px';
    cabecera.style.color = '#64748b';
    cabecera.textContent = d;
    gridMes.appendChild(cabecera);
  });

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const celda = document.createElement('div');
    celda.style.background = '#ffffff';
    celda.style.border = '1px solid #cbd5e1';
    celda.style.borderRadius = '6px';
    celda.style.padding = '6px';
    celda.style.minHeight = '55px';
    celda.style.cursor = 'pointer';

    const fechaFormat = `${año}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
    const evs = eventos.filter(e => e.fecha === fechaFormat);

    celda.innerHTML = `
      <div style="font-weight:700; font-size:11px; color:#334155;">${dia}</div>
      ${evs.length > 0 ? `<span style="display:inline-block; margin-top:4px; font-size:10px; background:#4b2a85; color:#fff; padding:2px 5px; border-radius:8px;">${evs.length} ev</span>` : ''}
    `;
    celda.onclick = () => abrirModalCrear(fechaFormat);
    gridMes.appendChild(celda);
  }

  contenedor.appendChild(gridMes);
}

// 10. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  const formCrear = document.getElementById('formCrearEvento');
  if (formCrear) formCrear.addEventListener('submit', procesarGuardadoEvento);

  document.getElementById('crearBtn')?.addEventListener('click', () => abrirModalCrear());
  document.getElementById('btnCancelar')?.addEventListener('click', cerrarModalCrear);

  document.getElementById('btnConfirmarEliminar')?.addEventListener('click', confirmarEliminarEvento);
  document.getElementById('btnCancelarEliminar')?.addEventListener('click', cerrarModalEliminar);

  document.getElementById('btnVistaDia')?.addEventListener('click', () => cambiarVista('dia'));
  document.getElementById('btnVistaSemana')?.addEventListener('click', () => cambiarVista('semana'));
  document.getElementById('btnVistaMes')?.addEventListener('click', () => cambiarVista('mes'));

  document.getElementById('mesAnterior')?.addEventListener('click', () => navegarFecha(-1));
  document.getElementById('mesSiguiente')?.addEventListener('click', () => navegarFecha(1));
  document.getElementById('btnHoy')?.addEventListener('click', () => {
    fechaActual = new Date();
    renderizarCalendario();
  });

  obtenerEventosGoogleCalendar();
}); 