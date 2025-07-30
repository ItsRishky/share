document.addEventListener("DOMContentLoaded", function() {
    let receiverID;
    const socket = io();
    let fileQueue = [];
    let isSending = false;

    // Debugging connection
    socket.on("connect", () => {
        console.log("Connected to server with socket id:", socket.id);
    });

    socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
    });

    function generateID() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    document.querySelector("#sender-start-con-btn").addEventListener("click", function() {
        console.log("Create Room button clicked");
        let joinID = generateID();
        document.querySelector("#join-id").innerHTML = `
        <b>Room ID</b>
        <span>${joinID}</span>
        `;
        
        socket.emit("sender-join", {
            uid: joinID
        });
    });

    // Add event listener for Join Room button
    document.querySelector("#join-room-btn").addEventListener("click", function() {
        window.location.href = "receiver.html";
    });

    socket.on("init", function(uid) {
        console.log("Receiver connected with ID:", uid);
        receiverID = uid;
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    document.querySelector("#file-input").addEventListener("change", function(e) {
        const files = Array.from(e.target.files);
        if(files.length === 0) return;
        
        fileQueue = [...fileQueue, ...files];
        if(!isSending) processQueue();
    });

    function processQueue() {
        if(fileQueue.length === 0) {
            isSending = false;
            return;
        }
        
        isSending = true;
        const file = fileQueue.shift();
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const buffer = new Uint8Array(reader.result);
            const el = document.createElement("div");
            el.classList.add("item");
            el.innerHTML = `
                <div class="progress">0%</div>
                <div class="filename">${file.name}</div>
            `;
            document.querySelector(".files-list").appendChild(el);
            
            shareFile({
                filename: file.name,
                total_buffer_size: buffer.length,
                buffer_size: 64 * 1024 // 64KB chunks
            }, buffer, el.querySelector(".progress"), function() {
                processQueue(); // Process next file after completion
            });
        };
        reader.readAsArrayBuffer(file);
    }

    function shareFile(metadata, buffer, progress_node, onComplete) {
        let offset = 0;
        const chunkSize = metadata.buffer_size;
        
        socket.emit("file-meta", {
            uid: receiverID,
            metadata: metadata
        });

        function sendChunk() {
            const chunk = buffer.slice(offset, offset + chunkSize);
            offset += chunkSize;
            
            progress_node.innerHTML = Math.trunc(
                Math.min(offset, metadata.total_buffer_size) / 
                metadata.total_buffer_size * 100
            ) + "%";
            
            if(chunk.length > 0) {
                socket.emit("file-raw", {
                    uid: receiverID,
                    buffer: chunk
                });
            }
            
            if(offset < metadata.total_buffer_size) {
                socket.once("fs-share", sendChunk);
            } else {
                if(onComplete) onComplete();
            }
        }
        
        socket.once("fs-share", sendChunk);
    }
});