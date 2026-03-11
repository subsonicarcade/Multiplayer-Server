const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

let waitingPlayer = null;
let rooms = {};

io.on("connection", (socket) => {

  console.log("player connected:", socket.id);

  // RANDOM MATCHMAKING
  socket.on("randomMatch", () => {

    if (waitingPlayer) {

      const room = waitingPlayer.id + "#" + socket.id;

      socket.join(room);
      waitingPlayer.join(room);

      rooms[room] = {
        players: [waitingPlayer.id, socket.id],
        health: {
          [waitingPlayer.id]: 100,
          [socket.id]: 100
        }
      };

      io.to(room).emit("startGame", room);

      waitingPlayer = null;

    } else {
      waitingPlayer = socket;
    }

  });


  // CREATE ROOM
  socket.on("createRoom", (code) => {

    rooms[code] = {
      players: [socket.id],
      health: { [socket.id]: 100 }
    };

    socket.join(code);

    console.log("room created:", code);

  });


  // JOIN ROOM
  socket.on("joinRoom", (code) => {

    if (!rooms[code]) return;

    rooms[code].players.push(socket.id);
    rooms[code].health[socket.id] = 100;

    socket.join(code);

    io.to(code).emit("startGame", code);

    console.log("player joined room:", code);

  });


  // PLAYER MOVEMENT
  socket.on("move", (data) => {

    socket.to(data.room).emit("opponentMove", data);

  });


  // ATTACK SYSTEM
  socket.on("attack", (data) => {

    const room = data.room;
    if (!rooms[room]) return;

    const players = rooms[room].players;

    const opponent = players.find(p => p !== socket.id);

    if (!opponent) return;

    rooms[room].health[opponent] -= 5;

    if (rooms[room].health[opponent] < 0)
      rooms[room].health[opponent] = 0;

    io.to(room).emit("healthUpdate", rooms[room].health);

    socket.to(room).emit("opponentAttack");

  });


  // DISCONNECT
  socket.on("disconnect", () => {

    console.log("player disconnected:", socket.id);

    if (waitingPlayer && waitingPlayer.id === socket.id)
      waitingPlayer = null;

  });

});

http.listen(3000, () => {
  console.log("server running on port 3000");
});
