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

io.on("connection", (socket) => {
  console.log(`User is connected with id ${socket.id}`);
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
