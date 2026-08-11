const GOOGLE_CLIENT_ID = '657708774079-2rkfa484q5dvbjirv73upkthmesdcm6g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const SPREADSHEET_ID = '1ISA2yVDYsGoF5omyQOVQpdVJkOeszGgfVslQxJWnnZw';

let accessToken = null;
let tokenClient = null;

let eventos = [];
function hayTokenValido() {
    const guardado = localStorage.getItem('gea_token');
    if (!guardado) return false;

    try {
        const { expira_en } = JSON.parse(guardado);
        return Date.now() < expira_en;
    } catch (e) {
        localStorage.removeItem('gea_token');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('loginButton');
    const btnLogout = document.getElementById('btnLogout');
    const btnExportar = document.getElementById('btn-exportar');
    const mensajeEstado = document.getElementById('mensaje-estado');
    const appContenido = document.getElementById('app-contenido');
    const loginContainer = document.getElementById('login-container');
    
    const perfilUsuario = document.getElementById('perfil-usuario');
    const usuarioFoto = document.getElementById('usuario-foto');
    const usuarioNombre = document.getElementById('usuario-nombre');
    const usuarioCorreo = document.getElementById('usuario-correo');

    const formEvento = document.getElementById('form-evento');
    const listaEventosUI = document.getElementById('lista-eventos');
    const formTitulo = document.getElementById('form-titulo');
    const eventoIndexInput = document.getElementById('evento-index');
    const btnGuardarEvento = document.getElementById('btn-guardar-evento');
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');

    function forzarCierreSesion(mensaje = 'Sesión cerrada o token no válido.') {
        accessToken = null;
        localStorage.removeItem('gea_token');

        if (appContenido) appContenido.style.display = 'none';
        if (perfilUsuario) perfilUsuario.style.display = 'none';

        if (loginContainer) loginContainer.style.display = 'flex';
        if (btnLogin) {
            btnLogin.style.display = 'block';
            btnLogin.disabled = false;
        }

        if (mensaje) mostrarMensaje(mensaje, 'red');
    }

    if (loginContainer) loginContainer.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'none';

    if (hayTokenValido()) {
        const datosToken = JSON.parse(localStorage.getItem('gea_token'));
        accessToken = datosToken.access_token;

        if (loginContainer) loginContainer.style.display = 'none';
        if (appContenido) appContenido.style.display = 'block';
        cargarPerfilUsuario();
        actualizarListaUI();
    } else {
        forzarCierreSesion('');
    }

    function inicializarTokenClient() {
        if (window.google && google.accounts && google.accounts.oauth2) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse) => {
                    if (tokenResponse.error !== undefined) {
                        mostrarMensaje('Error en autenticación: ' + tokenResponse.error, 'red');
                        if (btnLogin) btnLogin.disabled = false;
                        return;
                    }

                    accessToken = tokenResponse.access_token;

                    const duracionSegundos = tokenResponse.expires_in || 3600;
                    const geaTokenObj = {
                        access_token: accessToken,
                        expira_en: Date.now() + (duracionSegundos * 1000)
                    };
                    localStorage.setItem('gea_token', JSON.stringify(geaTokenObj));

                    if (loginContainer) loginContainer.style.display = 'none';
                    await cargarPerfilUsuario();
                    
                    if (appContenido) appContenido.style.display = 'block';
                    actualizarListaUI();
                    mostrarMensaje('Autenticado correctamente. Puedes gestionar tus eventos.', 'green');
                },
            });
        } else {
            setTimeout(inicializarTokenClient, 500);
        }
    }

    inicializarTokenClient();

    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            if (tokenClient) {
                btnLogin.disabled = true; 
                tokenClient.requestAccessToken(); 
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (accessToken && window.google && google.accounts && google.accounts.oauth2) {
                google.accounts.oauth2.revoke(accessToken, () => {
                    console.log('Token revocado.');
                });
            }
            forzarCierreSesion('Has cerrado sesión correctamente.');
        });
    }

    if (formEvento) {
        formEvento.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!hayTokenValido()) {
                forzarCierreSesion('Inicia sesión para realizar cambios.');
                return;
            }

            const index = parseInt(eventoIndexInput.value);

            const datosEvento = {
                titulo: document.getElementById('titulo').value,
                descripcion: document.getElementById('descripcion').value,
                fechaInicio: document.getElementById('fecha-inicio').value,
                horaInicio: document.getElementById('hora-inicio').value,
                fechaFin: document.getElementById('fecha-fin').value,
                horaFin: document.getElementById('hora-fin').value
            };

            if (index === -1) {
                eventos.push(datosEvento);
            } else {
                eventos[index] = datosEvento;
            }

            resetearFormulario();
            actualizarListaUI();
        });
    }

    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', resetearFormulario);
    }

    if (btnExportar) {
        btnExportar.addEventListener('click', async () => {
            if (!hayTokenValido()) {
                forzarCierreSesion('Tu sesión ha expirado. Inicia sesión de nuevo.');
                return;
            }

            if (eventos.length === 0) {
                mostrarMensaje('No hay eventos para exportar.', 'orange');
                return;
            }

            mostrarMensaje('Exportando eventos a Google Sheets...', 'blue');
            btnExportar.disabled = true;

            try {
                const values = eventos.map(e => [
                    e.titulo,
                    e.descripcion,
                    e.fechaInicio,
                    e.horaInicio,
                    e.fechaFin,
                    e.horaFin
                ]);

                const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Hoja%201!A1:append?valueInputOption=USER_ENTERED`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        range: "Hoja 1!A1",
                        majorDimension: "ROWS",
                        values: values
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        forzarCierreSesion('Permisos insuficientes o expirados. Inicia sesión de nuevo.');
                        return;
                    }
                    throw new Error(data.error ? data.error.message : 'Error desconocido en la API');
                }

                mostrarMensaje('¡Exportación completada con éxito!', 'green');
            } catch (error) {
                console.error("Error en la exportación:", error);
                mostrarMensaje('Error al exportar: ' + error.message, 'red');
            } finally {
                btnExportar.disabled = false;
            }
        });
    }

    async function cargarPerfilUsuario() {
        if (!accessToken) return;
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    forzarCierreSesion('Sesión no válida o expirada.');
                    return;
                }
            }

            const profile = await res.json();
            
            if (profile) {
                if (usuarioFoto) usuarioFoto.src = profile.picture || 'https://via.placeholder.com/48';
                if (usuarioNombre) usuarioNombre.textContent = profile.name || 'Usuario';
                if (usuarioCorreo) usuarioCorreo.textContent = profile.email || '';
                if (perfilUsuario) perfilUsuario.style.display = 'flex';
            }
        } catch (err) {
            console.error("No se pudo obtener el perfil", err);
        }
    }

    function actualizarListaUI() {
        if (!listaEventosUI) return;
        listaEventosUI.innerHTML = '';

        if (eventos.length === 0) {
            listaEventosUI.innerHTML = '<li style="color: #718096; text-align: center; padding: 12px;">No hay eventos en la lista.</li>';
            return;
        }

        eventos.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'event-card';

            li.innerHTML = `
                <div class="event-details">
                    <h5>${item.titulo}</h5>
                    <p>${item.descripcion}</p>
                    <p style="font-size: 0.78rem; color: #a0aec0; margin-top: 4px;">
                        ${item.fechaInicio} ${item.horaInicio} ➔ ${item.fechaFin} ${item.horaFin}
                    </p>
                </div>
                <div class="event-actions">
                    <button type="button" class="btn-action edit" onclick="editarEvento(${index})">Editar</button>
                    <button type="button" class="btn-action delete" onclick="eliminarEvento(${index})">Eliminar</button>
                </div>
            `;
            listaEventosUI.appendChild(li);
        });
    }

    window.editarEvento = function(index) {
        if (!hayTokenValido()) {
            forzarCierreSesion('Inicia sesión para editar el evento.');
            return;
        }

        const ev = eventos[index];
        document.getElementById('titulo').value = ev.titulo;
        document.getElementById('descripcion').value = ev.descripcion;
        document.getElementById('fecha-inicio').value = ev.fechaInicio;
        document.getElementById('hora-inicio').value = ev.horaInicio;
        document.getElementById('fecha-fin').value = ev.fechaFin;
        document.getElementById('hora-fin').value = ev.horaFin;

        if (eventoIndexInput) eventoIndexInput.value = index;
        if (formTitulo) formTitulo.textContent = 'Modificar evento';
        if (btnGuardarEvento) btnGuardarEvento.textContent = 'Guardar cambios';
        if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'inline-block';
    };

    window.eliminarEvento = function(index) {
        if (!hayTokenValido()) {
            forzarCierreSesion('Inicia sesión para eliminar el evento.');
            return;
        }

        eventos.splice(index, 1);
        resetearFormulario();
        actualizarListaUI();
    };

    function resetearFormulario() {
        if (formEvento) formEvento.reset();
        if (eventoIndexInput) eventoIndexInput.value = -1;
        if (formTitulo) formTitulo.textContent = 'Crear nuevo evento';
        if (btnGuardarEvento) btnGuardarEvento.textContent = 'Agregar a la lista';
        if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'none';
    }

    function mostrarMensaje(texto, color) {
        if (mensajeEstado) {
            mensajeEstado.textContent = texto;
            mensajeEstado.style.color = color;
            mensajeEstado.style.fontWeight = 'bold';
        }
    }
});