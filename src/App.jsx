import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

function App() {
  const [code, setCode] = useState(() => {
    const savedCode = localStorage.getItem("codenexus-code");
    return savedCode !== null
      ? savedCode
      : `console.log("Hello CodeNexus");`;
  });

  const [output, setOutput] = useState("");

  useEffect(() => {
    localStorage.setItem("codenexus-code", code);
  }, [code]);

  const runCode = () => {
    try {
      const logs = [];
      const originalLog = console.log;

      console.log = (...args) => {
        logs.push(args.join(" "));
      };

      eval(code);

      console.log = originalLog;
      setOutput(logs.join("\n"));
    } catch (error) {
      setOutput(error.toString());
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
