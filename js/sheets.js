// ============================================
// js/sheets.js — Exportación a Google Sheets
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const btnExportar = document.getElementById('btn-exportar');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarASheets);
  }
});

// Función para obtener el token válido directamente del localStorage
function obtenerTokenParaSheets() {
  const guardado = localStorage.getItem('gea_token');
  if (!guardado) return null;
  try {
    const { access_token, expira_en } = JSON.parse(guardado);
    // Verificamos que el token no haya expirado
    if (Date.now() < expira_en) {
      return access_token;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function exportarASheets() {
  const mensajeEstado = document.getElementById('mensaje-estado');
  const token = obtenerTokenParaSheets();

  if (!token) {
    alert('Tu sesión ha expirado o no has iniciado sesión. Por favor, vuelve a iniciar sesión con Google.');
    return;
  }

  // 1. Obtener los eventos actuales (usamos la caché global o la función de calendar.js)
  const eventosAExportar = typeof leerCache === 'function' ? leerCache() : obtenerEventosDeCache();

  if (!eventosAExportar || eventosAExportar.length === 0) {
    mensajeEstado.textContent = '❌ No hay eventos para exportar.';
    mensajeEstado.style.color = '#ef4444'; // Rojo
    return;
  }

  mensajeEstado.textContent = '⏳ Creando hoja de cálculo, por favor espera...';
  mensajeEstado.style.color = '#2563eb'; // Azul

  // 2. Construir la estructura de filas y columnas (Array de Arrays)
  // Primero agregamos la fila de los encabezados
  const filas = [
    ['ID del Evento', 'Título', 'Descripción', 'Fecha Inicio', 'Hora Inicio', 'Fecha Fin', 'Hora Fin', 'Tipo']
  ];

  // Luego agregamos una fila por cada evento
  eventosAExportar.forEach(ev => {
    filas.push([
      ev.id || '',
      ev.titulo || 'Sin título',
      ev.descripcion || '',
      ev.fecha || '',
      ev.hora || '',
      ev.fechaFin || '',
      ev.horaFin || '',
      ev.tipo || 'general'
    ]);
  });

  // 3. Crear la estructura JSON que pide Google Sheets API para crear un archivo nuevo con datos
  const cuerpoPeticion = {
    properties: {
      title: `Exportación GEA - ${new Date().toLocaleDateString('es-ES')}` // Nombre del archivo en Google Drive
    },
    sheets: [
      {
        properties: {
          title: "Eventos" // Nombre de la pestaña inferior
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: filas.map(fila => ({
              values: fila.map(celda => ({
                userEnteredValue: { stringValue: String(celda) }
              }))
            }))
          }
        ]
      }
    ]
  };

  // 4. Enviar la petición a la API de Google Sheets
  try {
    const respuesta = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cuerpoPeticion)
    });

    if (!respuesta.ok) {
      throw new Error(`Error de la API: ${respuesta.status}`);
    }

    const datosPlanilla = await respuesta.json();
    const urlPlanilla = datosPlanilla.spreadsheetUrl;

    // 5. Mostrar éxito y el enlace para abrir el archivo
    mensajeEstado.innerHTML = `✅ ¡Exportación exitosa! <br> <a href="${urlPlanilla}" target="_blank" style="color: #166534; font-weight: bold; text-decoration: underline;">Haz clic aquí para abrir tu Google Sheets</a>`;
    mensajeEstado.style.color = '#15803d'; // Verde

  } catch (error) {
    console.error('Error al exportar a Sheets:', error);
    mensajeEstado.textContent = '❌ Hubo un error al exportar. Revisa la consola.';
    mensajeEstado.style.color = '#ef4444'; // Rojo
  }
}

// Función de respaldo por si leerCache() de calendar.js falla
function obtenerEventosDeCache() {
  const data = localStorage.getItem('gea_eventos_cache');
  return data ? JSON.parse(data) : [];
}