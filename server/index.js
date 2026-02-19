const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 3000;

app.use(cors());

app.use(express.json());

app.post("/api/run", (req, res) => {
  console.log("Request received");
  const { code } = req.body;

  try{
    const logs =[];
    const originalLog = console.log;

    console.log = (...args) => {
      logs.push(args.join(" "));
    };

    eval(code);

    console.log = originalLog;

    res.json({ output: logs.join("\n") });
  } catch (error) {
    res.status(400).json({ error: error.toString() });
  }

});

app.get("/", (req, res) => {
  console.log("Received request on /");
  res.send("CodeNexus backend is running.");
});

app.get("/api/status", (req, res) =>{
  console.log("Status API called.");
  res.json({
    message: "Backend is connected successfully.",
    server: "codenexus",
    status: "running"
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});