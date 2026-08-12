let accessToken = null;
let tokenClient = null;

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

function inicializarAuth() {
    if (window.google && google.accounts && google.accounts.oauth2) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                    console.error("Error OAuth:", tokenResponse.error);
                    return;
                }

                accessToken = tokenResponse.access_token;
                const duracionSegundos = tokenResponse.expires_in || 3600;
                localStorage.setItem('gea_token', JSON.stringify({
                    access_token: accessToken,
                    expira_en: Date.now() + (duracionSegundos * 1000)
                }));

                mostrarPantallaApp();
                await cargarPerfilUsuario();
                if (window.cargarEventos) window.cargarEventos();
            },
        });
    } else {
        setTimeout(inicializarAuth, 300);
    }
}

async function cargarPerfilUsuario() {
    if (!accessToken) return;
    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const profile = await res.json();
            const avatar = document.getElementById('avatarUsuario');
            const nombre = document.getElementById('usuarioLogueado');
            if (avatar) { avatar.src = profile.picture; avatar.style.display = 'block'; }
            if (nombre) nombre.textContent = profile.name;
        }
    } catch (e) {
        console.error("Error al cargar perfil:", e);
    }
}

function mostrarPantallaApp() {
    document.getElementById('pantallaLogin').style.display = 'none';
    document.getElementById('pantallaApp').style.display = 'block';
}

function cerrarSesion() {
    if (accessToken && window.google) {
        google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    localStorage.removeItem('gea_token');
    document.getElementById('pantallaApp').style.display = 'none';
    document.getElementById('pantallaLogin').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarAuth();

    const loginBtn = document.getElementById('loginButton');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (tokenClient) tokenClient.requestAccessToken();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }

    if (hayTokenValido()) {
        const datos = JSON.parse(localStorage.getItem('gea_token'));
        accessToken = datos.access_token;
        mostrarPantallaApp();
        cargarPerfilUsuario();
    }
});