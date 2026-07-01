const { tokenToString } = require("typescript");

const username = localStorage.getItem('username') || 'Invitado';
if( !username ) {
    alert('Por favor, ingresa un nombre de usuario para unirte a las salas PVP.');
    throw new Error('Nombre de usuario requerido');
}

// referencias HTML - para mostrar por ejemplo "listo", "en espera..."
const statusReady = document.querySelector('#status-player-ready');
const statusNotReady = document.querySelector('#status-player-not-ready');

// Obtener el token JWT del localStorage o donde lo tengas guardado
const token = localStorage.getItem('jwt_token');

const socket = io('http://localhost:3000', {
    extraHeaders: {
        Authorization: `Bearer ${token}`
    }
});

socket.on('connection', () => {
    console.log('Conectado al servidor de salas PVP');
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor de salas PVP');
});




