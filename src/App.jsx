import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

function App() {
  const [code, setCode] = useState(() => {
    const savedCode = localStorage.getItem("codenexus-code");
    return savedCode !== null
      ? savedCode
      : `console.log("Hello CodeNexus");`;
  });

  useEffect(() => {
    fetch("http://localhost:3000/api/status")
      .then((res) => res.json())
      .then((data) => {
        console.log("Backend response:", data);
      })
      .catch((error) => {
        console.error("Error connecting to backend:", error);
      });
  }, []);


  const [output, setOutput] = useState("");

  useEffect(() => {
    localStorage.setItem("codenexus-code", code);
  }, [code]);

  const runCode = async () => {
    console.log("Run button clicked");
    try {
      const response = await fetch("http://localhost:3000/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if(response.ok) {
        setOutput(data.output);
      } else {
        setOutput(data.error);
      }
    } catch (error) {
      setOutput("Error connecting to server");
    }
  };

  return (
    <div style={{ 
      height: "100vh", 
      width: "100vw",
      display: "flex",
      flexDirection: "column"
    }}>

      <button onClick={runCode} style={{ padding: "10px" }}>
        Run Code
      </button>

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value)}
        />
      </div>

      <div style={{
        height: "150px",
        background: "#111",
        color: "lime",
        padding: "10px",
        overflowY: "auto",
        whiteSpace: "pre-wrap"
      }}>
        {output}
      </div>

    </div>
  );

}

export default App;
