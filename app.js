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

io.on("connection", (socket) => {
  console.log(`User connected with id ${socket.id}`);

  socket.on("joinGame", (username) => {
    users.push({
      id: socket.id,
      username,
      points: 0,
    });
    io.emit("welcomingUser", {
      message: `Welcome to the RPS Game, ${username}`,
      users,
    });

    if (users.length === 2) {
      io.emit("startGame", { message: "Game is starting!" });
    }
  });

  socket.on("makeChoice", ({ userChoice, username }) => {
    const opponent = users.find((user) => user.id !== socket.id);
    const opponentChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];

    let resultMessage = `${username} chose ${userChoice}. Opponent chose ${opponentChoice}. `;

    if (userChoice === opponentChoice) {
      users = users.map((user) => {
        user.points += 1;
        return user;
      });
      resultMessage += "It's a tie! Both gain 1 point.";
    } else if (
      (userChoice === "rock" && opponentChoice === "scissors") ||
      (userChoice === "scissors" && opponentChoice === "paper") ||
      (userChoice === "paper" && opponentChoice === "rock")
    ) {
      users = users.map((user) => {
        if (user.id === socket.id) user.points += 3;
        return user;
      });
      resultMessage += `${username} wins this round! Gains 3 points.`;
    } else {
      users = users.map((user) => {
        if (user.id === opponent.id) user.points += 3;
        return user;
      });
      resultMessage += `Opponent wins this round and gains 3 points.`;
    }

    io.emit("gameResult", {
      users,
      message: resultMessage,
    });

    
    const userWithMaxPoints = users.find((user) => user.points >= 10);
    if (userWithMaxPoints) {
      io.emit("gameOver", { message: `${userWithMaxPoints.username} wins the game!` });
      users = [];
    }
  });

  socket.on("disconnect", () => {
    users = users.filter((user) => user.id !== socket.id);
    io.emit("resetGame", { message: "A player has left. The game has been reset." });
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
