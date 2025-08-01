const express = require("express");
const path = require("path");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Debugging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

io.on("connection", function(socket) {
  console.log(`New client connected: ${socket.id}`);

  socket.on("sender-join", function(data) {
    console.log(`Sender joined room: ${data.uid}`);
    socket.join(data.uid);
  });

  socket.on("receiver-join", function(data) {
    console.log(`Receiver ${data.uid} joining sender ${data.sender_uid}`);
    socket.join(data.uid);
    socket.in(data.sender_uid).emit("init", data.uid);
  });

  socket.on("file-meta", function(data) {
    console.log(`File metadata received for room ${data.uid}: ${data.metadata.filename}`);
    socket.in(data.uid).emit("fs-meta", data.metadata);
  });

  socket.on("fs-start", function(data) {
    console.log(`File transfer started in room ${data.uid}`);
    socket.in(data.uid).emit("fs-share", {});
  });

  socket.on("file-raw", function(data) {
    socket.in(data.uid).emit("fs-share", data.buffer);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
