(function () {
    let senderID;
    const socket = io();

    function generateID() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    document.querySelector("#receiver-start-con-btn").addEventListener("click", function () {
        senderID = document.querySelector("#join-id").value;
        if (senderID.length == 0) return;
        
        let joinID = generateID();
        socket.emit("receiver-join", {
            uid: joinID,
            sender_uid: senderID
        });
        
        document.querySelector(".join-screen").classList.remove("active");
        document.querySelector(".fs-screen").classList.add("active");
    });

    let currentFile = {};

    socket.on("fs-meta", function(metadata) {
        currentFile = {
            metadata: metadata,
            buffer: [],
            received: 0
        };
        
        const el = document.createElement("div");
        el.classList.add("item");
        el.innerHTML = `
            <div class="progress">0%</div>
            <div class="filename">${metadata.filename}</div>
        `;
        document.querySelector(".files-list").appendChild(el);
        currentFile.progress_node = el.querySelector(".progress");
        
        socket.emit("fs-start", { uid: senderID });
    });

    socket.on("fs-share", function(buffer) {
        currentFile.buffer.push(buffer);
        currentFile.received += buffer.byteLength;
        
        const percent = Math.trunc(
            currentFile.received / 
            currentFile.metadata.total_buffer_size * 100
        );
        
        currentFile.progress_node.innerHTML = percent + "%";
        
        if(currentFile.received === currentFile.metadata.total_buffer_size) {
            // Create and auto-download file
            const blob = new Blob(currentFile.buffer);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = currentFile.metadata.filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            // Reset for next file
            currentFile = {};
        } else {
            socket.emit("fs-start", { uid: senderID });
        }
    });
})();