const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Puerto predeterminado de Vite
    methods: ['GET', 'POST']
  }
});

app.use(cors());

const connectedUsers = {}; // Diccionario para almacenar userId -> socketId

// Eventos de Socket.IO para señalización
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Registrar el userId en el servidor cuando un usuario se conecta
  socket.on('register-user', (userId) => {
    connectedUsers[userId] = socket.id;
    console.log(`User registered: ${userId} -> ${socket.id}`);
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
  });

  socket.on('offer', (roomId, offer) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', (roomId, answer) => {
    socket.to(roomId).emit('answer', answer);
  });

  // Escucha la llamada y envía la notificación al receptor
  socket.on('call-user', ({ callerId, receiverId, roomId }) => {
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', { callerId, roomId });
    } else {
      console.log(`User ${receiverId} not connected`);
    }
  });

  // Manejo de candidatos ICE
  socket.on('candidate', (roomId, candidate) => {
    socket.to(roomId).emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  });
});

server.listen(5000, () => {
  console.log('Servidor escuchando en el puerto 5000');
});
