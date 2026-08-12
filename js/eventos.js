// --------------------------------------------
// RENDERIZADO DE LISTA + acciones editar/eliminar
// --------------------------------------------
const listaEventosEl = document.getElementById('listaEventos');

const modalEliminar = document.getElementById('modalEliminar');
const textoEventoAEliminar = document.getElementById('textoEventoAEliminar');
const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
let eventoAEliminar = null;


function renderizarEventos() {
  const eventos = leerCache();
  listaEventosEl.innerHTML = '';

  // Segun la vista activa se muestran los eventos de ese dia,
  // de esa semana o de ese mes (siempre de hoy o futuros).
  const fechaHoy = fechaString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let eventosVisibles = [];

  if (vistaActual === 'mes') {
    const fechaInicioMes = fechaString(anioActual, mesActual, 1);
    const fechaFinMes = fechaString(anioActual, mesActual, new Date(anioActual, mesActual + 1, 0).getDate());
    eventosVisibles = eventos.filter(e => e.fecha >= fechaHoy && e.fecha >= fechaInicioMes && e.fecha <= fechaFinMes);
  } else if (vistaActual === 'semana') {
    const lunes = new Date(anioActual, mesActual, diaActual);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    const domingo = new Date(lunes);
    domingo.setDate(domingo.getDate() + 6);
    const fechaInicioSem = fechaString(lunes.getFullYear(), lunes.getMonth(), lunes.getDate());
    const fechaFinSem = fechaString(domingo.getFullYear(), domingo.getMonth(), domingo.getDate());
    eventosVisibles = eventos.filter(e => e.fecha >= fechaHoy && e.fecha >= fechaInicioSem && e.fecha <= fechaFinSem);
  } else {
    eventosVisibles = eventosDeFecha(anioActual, mesActual, diaActual);
  }

  eventosVisibles.sort((a, b) => (a.fecha + ' ' + (a.hora || '')).localeCompare(b.fecha + ' ' + (b.hora || '')));

  if (eventosVisibles.length === 0) {
    const mensaje = vistaActual === 'mes'
      ? 'No hay eventos para este mes.'
      : (vistaActual === 'semana' ? 'No hay eventos para esta semana.' : 'No hay eventos para este día.');
    listaEventosEl.textContent = mensaje;
  } else {
    eventosVisibles.forEach(evento => {
      const item = document.createElement('div');
      item.className = 'evento-item';

      const info = document.createElement('span');
      info.textContent = `${evento.titulo} — ${evento.fecha} ${evento.hora} (${evento.tipo})`;

      const btnEditar = document.createElement('button');
      btnEditar.textContent = 'Editar';
      btnEditar.addEventListener('click', () => manejarEditar(evento));

      const btnEliminar = document.createElement('button');
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.addEventListener('click', () => manejarEliminar(evento));

      item.appendChild(info);
      item.appendChild(btnEditar);
      item.appendChild(btnEliminar);
      listaEventosEl.appendChild(item);
    });
  }

  // Refresca la vista de calendario cuando cambian los eventos
  if (typeof pintarCalendario === 'function') {
    pintarCalendario();
  }
}
function limpiarEventos() {
  localStorage.removeItem('gea_eventos_cache');
  listaEventosEl.innerHTML = ''; // vacío y sin mensaje, no hay sesión activa
  salidaEl.style.display = 'none';
  salidaEl.textContent = '';
}


function manejarEditar(evento) {
  abrirModalEditar(evento);
}

function manejarEliminar(evento) {
  eventoAEliminar = evento;
  textoEventoAEliminar.textContent = '"' + evento.titulo + '"';
  modalEliminar.classList.add('abierto');
}

function cerrarModalEliminar() {
  modalEliminar.classList.remove('abierto');
  eventoAEliminar = null;
}

function confirmarEliminar() {
  if (!eventoAEliminar) return;
  const evento = eventoAEliminar;
  cerrarModalEliminar();

  eliminarEvento(evento.id)
    .then(() => {
      mostrarSalida('Evento eliminado correctamente.');
      renderizarEventos();
    })
    .catch(err => mostrarSalida('Error: ' + err));
}

btnCancelarEliminar.addEventListener('click', cerrarModalEliminar);
btnConfirmarEliminar.addEventListener('click', confirmarEliminar);
modalEliminar.addEventListener('click', (e) => {
  if (e.target === modalEliminar) cerrarModalEliminar();
});

function alIniciarSesionExitosamente() {
  // ... tu lógica de guardar token, mostrar UI post-login, etc.
  renderizarEventos(); // aquí sí se pinta "No hay eventos." si aplica
  
} 

document.addEventListener('DOMContentLoaded', () => {
  listaEventosEl.innerHTML = ''; 
});
