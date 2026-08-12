// ============================================
// js/filtros.js — Búsqueda y filtrado de eventos
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const btnBuscar = document.getElementById('btnBuscar');
    const barraBuscar = document.getElementById('barraBuscar');

    if (btnBuscar && barraBuscar) {
        // 1. Mostrar/Ocultar la barra al dar clic en la lupa
        btnBuscar.addEventListener('click', () => {
            const estiloActual = window.getComputedStyle(barraBuscar).display;
            const estaOculto = estiloActual === 'none';

            barraBuscar.style.display = estaOculto ? 'inline-block' : 'none';

            if (estaOculto) {
                barraBuscar.focus();
            } else {
                barraBuscar.value = '';
                aplicarFiltroGlobal('');
            }
        });

        // 2. Escuchar la escritura en el input
        barraBuscar.addEventListener('input', (e) => {
            aplicarFiltroGlobal(e.target.value);
        });
    }

    // Aplica el filtro tanto en la columna derecha como en las vistas del calendario
    function aplicarFiltroGlobal(texto) {
        const termino = texto.toLowerCase().trim();

        // Filtrar lista lateral (#listaEventos)
        const items = document.querySelectorAll('#listaEventos .evento-item');
        items.forEach(item => {
            const contenido = item.textContent.toLowerCase();
            if (contenido.includes(termino)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // Actualizar la variable global de búsqueda y volver a renderizar el calendario
        if (typeof textoBusqueda !== 'undefined') {
            textoBusqueda = termino;
        }

        if (typeof renderizarCalendario === 'function') {
            renderizarCalendario();
        }
    }
});