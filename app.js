const express = require("express");
const app = express();
const port = 3000;
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

let users = [];
let RPS = [];

io.on("connection", (socket) => {
  console.log(`User is connected with id ${socket.id}`);

  socket.on("joinGame", (username) => {
    users.push({
      id: socket.id,
      username,
    });
    io.emit("welcomingUser", {
      message: `Welcome to this RPS Game, ${username}`,
      users,
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected with id ${socket.id}`);
    users = users.filter((user) => {
      return user.id !== socket.id;
    });
    console.log(users, "<-- users left");
    io.emit("Users remaining", users);
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
