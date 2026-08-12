const crearBtn = document.getElementById('crearBtn');
const salidaEl = document.getElementById('salida');

function mostrarSalida(texto) {
  salidaEl.style.display = 'block';
  salidaEl.textContent = texto;
}

// --------------------------------------------
// CACHÉ localStorage (gea_eventos_cache)
// --------------------------------------------
function leerCache() {
  const data = localStorage.getItem('gea_eventos_cache');
  return data ? JSON.parse(data) : [];
}

function guardarCache(eventos) {
  localStorage.setItem('gea_eventos_cache', JSON.stringify(eventos));
}

function actualizarEventoEnCache(eventoEstandar) {
  const eventos = leerCache();
  const idx = eventos.findIndex(e => e.id === eventoEstandar.id);
  if (idx !== -1) {
    eventos[idx] = eventoEstandar;
  } else {
    eventos.push(eventoEstandar);
  }
  guardarCache(eventos);
}

function eliminarEventoDeCache(id) {
  const eventos = leerCache().filter(e => e.id !== id);
  guardarCache(eventos);
}

// --------------------------------------------
// Mapeo: evento de Google Calendar -> formato estándar del caché
// (id, titulo, fecha, hora, descripcion, tipo)
// --------------------------------------------
function mapearEventoAEstandar(eventoGoogle) {
  const fechaHora = eventoGoogle.start?.dateTime || eventoGoogle.start?.date || '';
  const [fecha, horaConZona] = fechaHora.split('T');
  const hora = horaConZona ? horaConZona.substring(0, 5) : '';

  return {
    id: eventoGoogle.id,
    titulo: eventoGoogle.summary || '(sin título)',
    fecha: fecha || '',
    hora: hora || '',
    descripcion: eventoGoogle.description || '',
    tipo: eventoGoogle.extendedProperties?.private?.tipo || 'general'
  };
}

// --------------------------------------------
// LISTAR EVENTOS (GET) - se llama automático desde auth.js tras login
// --------------------------------------------
function listarEventos() {
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status !== 200) {
        console.log('ERROR DE GOOGLE (listar):', data);
        throw new Error(JSON.stringify(data));
      }
      const eventosEstandar = (data.items || []).map(mapearEventoAEstandar);
      guardarCache(eventosEstandar);
      return eventosEstandar;
    });
}

// --------------------------------------------
// CREAR EVENTO (POST)
// --------------------------------------------
function crearEvento(nuevoEvento) {
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AppState.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nuevoEvento)
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

  const datosEvento = {
    summary: titulo,
    description: descripcion,
    start: { dateTime: `${fechaInicio}T${horaInicio}:00-05:00` },
    end: { dateTime: `${fechaFinal}T${horaFinal}:00-05:00` },
    extendedProperties: {
      private: { tipo }
    }
  };

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

// --------------------------------------------
// ELIMINAR EVENTO (DELETE)
// --------------------------------------------
function eliminarEvento(eventoId) {
  const token = obtenerTokenValido();
  if (!token) {
    mostrarSalida('Tu sesión ya no es válida. Inicia sesión de nuevo.');
    return Promise.reject('no auth');
  }

  return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventoId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${AppState.accessToken}` }
  })
    .then(res => {
      if (res.status === 204 || res.ok) {
        eliminarEventoDeCache(eventoId);
        return true;
      }
      throw new Error('Status: ' + res.status);
    });
}