const express = require("express");
const cors = require("cors");

const { exec } = require("child_process");
const fs = require("fs");

const http = require("http");
const { attachCollab } = require("./collab");

const app = express();

const PORT = 3000;

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  console.log("Received request on /");
  res.send("CodeNexus backend is running.");
});

app.post("/api/run", (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language required" });
  }

  const fileMap = {
    javascript: { file: "temp.js", run: "node temp.js" },
    python: { file: "temp.py", run: "python temp.py" },

    c: {
      file: "temp.c",
      run: "gcc temp.c -o temp.exe && temp.exe"
    },

    cpp: {
      file: "temp.cpp",
      run: "g++ temp.cpp -o temp.exe && temp.exe"
    }
  };

  const config = fileMap[language];

  if (!config) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  fs.writeFileSync(config.file, code);

  exec(config.run, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(400).json({ error: stderr || error.message });
    }

    return res.json({ output: stdout || "No output" });
  });
});

let savedCode ="";

app.post("/api/save", (req, res) => {
  if(!req.body || !req.body.code){
    return res.status(400).json({ error: "Code is required" });
  }
  const { code } = req.body;
  savedCode = code;

  res.json({ message: "Code saved successfully." });
});

app.get("/api/load", (req, res) => {
  res.json({ code: savedCode });
});

app.get("/api/status", (req, res) =>{
  console.log("Status API called.");
  res.json({
    message: "Backend is connected successfully.",
    server: "codenexus",
    status: "running"
  });
});

const httpServer = http.createServer(app);

attachCollab(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});