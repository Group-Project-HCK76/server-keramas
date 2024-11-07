const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "http://localhost:5173" },
});

let rooms = {}; // Object to store active rooms

function createRoom() {
    const roomId = `room-${Date.now()}`; // Unique room ID based on timestamp
    rooms[roomId] = { id: roomId, users: [], choices: {} };
    return rooms[roomId];
}

function getAvailableRoom() {
    return Object.values(rooms).find(room => room.users.length < 2);
}

function getResult(choice1, choice2) {
    if (choice1 === choice2) return "draw";
    if (
        (choice1 === "rock" && choice2 === "scissors") ||
        (choice1 === "scissors" && choice2 === "paper") ||
        (choice1 === "paper" && choice2 === "rock")
    ) {
        return "user1";
    }
    return "user2";
}

io.on("connection", (socket) => {
    console.log("User connected with id", socket.id);

    socket.on("joinGame", (username) => {
        let room = getAvailableRoom();
        
        if (!room) {
            room = createRoom(); // Create a new room if no available room
        }

        room.users.push({ id: socket.id, username, points: 0 });
        socket.join(room.id);
        
        io.to(room.id).emit("welcomingUser", {
            message: `Welcome to this RPS Game, ${username}`,
            users: room.users,
        });

        if (room.users.length === 2) {
            io.to(room.id).emit("startGame", { message: "The game has started!" });
        } else {
            socket.emit("waiting", { message: "Waiting for an opponent to join..." });
        }
    });

    socket.on("makeChoice", (data) => {
        const room = Object.values(rooms).find(r => r.users.some(u => u.id === socket.id));
        if (!room || room.users.length < 2) return;

        if (!room.choices[socket.id]) {
            room.choices[socket.id] = data.userChoice;

            if (Object.keys(room.choices).length === 2) {
                const [user1, user2] = room.users;
                const result = getResult(room.choices[user1.id], room.choices[user2.id]);

                if (result === "user1") {
                    user1.points += 1;
                    io.to(room.id).emit("gameResult", {
                        message: `${user1.username} wins this round!`,
                        users: [user1, user2],
                    });
                } else if (result === "user2") {
                    user2.points += 1;
                    io.to(room.id).emit("gameResult", {
                        message: `${user2.username} wins this round!`,
                        users: [user1, user2],
                    });
                } else {
                    io.to(room.id).emit("gameResult", {
                        message: "This round is a draw!",
                        users: [user1, user2],
                    });
                }

                room.choices = {}; 

                if (user1.points >=  5|| user2.points >= 5) {
                    const winner = user1.points >= 5 ? user1.username : user2.username;
                    io.to(room.id).emit("gameOver", { message: `${winner} wins the game!` });

                    

                    room.users = [];
                    room.choices = {};
                }
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected with id ${socket.id}`);
        
        const room = Object.values(rooms).find(r => r.users.some(u => u.id === socket.id));
        if (!room) return;

        room.users = room.users.filter((user) => user.id !== socket.id);
        room.choices = {};

        if (room.users.length < 2) {
            io.to(room.id).emit("resetGame", { message: "A player disconnected. The game has been reset." });
            room.users.forEach((user) => (user.points = 0));
            room.choices = {}; 
        }

        if (room.users.length === 0) {
            delete rooms[room.id]; // Delete the room if no users are left
        }
    });
});

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
