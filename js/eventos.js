window.eventos = [];

window.cargarEventos = function() {
    // Si manejas almacenamiento local o carga desde API Calendar
    const guardados = localStorage.getItem('gea_eventos_locales');
    if (guardados) {
        try {
            window.eventos = JSON.parse(guardados);
        } catch(e) {
            window.eventos = [];
        }
    }
    if (window.actualizarListaUI) window.actualizarListaUI();
    if (window.renderizarCalendario) window.renderizarCalendario();
};

window.guardarEventoLocal = function(nuevoEvento) {
    window.eventos.push(nuevoEvento);
    localStorage.setItem('gea_eventos_locales', JSON.stringify(window.eventos));
    if (window.actualizarListaUI) window.actualizarListaUI();
    if (window.renderizarCalendario) window.renderizarCalendario();
};

window.eliminarEventoLocal = function(id) {
    window.eventos = window.eventos.filter(e => e.id !== id);
    localStorage.setItem('gea_eventos_locales', JSON.stringify(window.eventos));
    if (window.actualizarListaUI) window.actualizarListaUI();
    if (window.renderizarCalendario) window.renderizarCalendario();
};