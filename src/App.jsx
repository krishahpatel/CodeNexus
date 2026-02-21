import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

function App() {
  const [code, setCode] = useState(`console.log("Hello CodeNexus");`);
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    fetch("http://localhost:3000/api/status")
      .then((res) => res.json())
      .then((data) => console.log("Backend response:", data))
      .catch((error) =>
        console.error("Error connecting to backend:", error)
      );

    loadCode();
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      autoSave();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [code]);

  const autoSave = async () => {
    try {
      setIsSaving(true);
      await fetch("http://localhost:3000/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setIsSaving(false);
    } catch (error) {
      console.error("Auto save failed:", error);
      setIsSaving(false);
    }
  };

  const runCode = async () => {
    setOutput("Running...");
    setIsError(false);

    try {
      const response = await fetch("http://localhost:3000/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.output || "No output");
        setIsError(false);
      } else {
        setOutput(data.error || "An error occurred.");
        setIsError(true);
      }
    } catch (error) {
      setOutput("Error: Could not connect to execution server.");
      setIsError(true);
    }
  };

  const loadCode = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/load");
      const data = await response.json();
      if (data.code) setCode(data.code);
    } catch (error) {
      console.error("Error loading code:", error);
    }
  };

  const saveCode = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("http://localhost:3000/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      console.log(data.message);
      setIsSaving(false);
    } catch (error) {
      console.error("Error saving code:", error);
      setIsSaving(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="toolbar">
        <div className="brand-title">CodeNexus Editor</div>

        {isSaving && <span className="saving-text">Saving...</span>}

        <button onClick={saveCode} className="btn btn-secondary">
          Save
        </button>

        <button onClick={runCode} className="btn btn-run">
          ▶ Run
        </button>
      </div>

      <div className="editor-container">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            smoothScrolling: true,
          }}
        />
      </div>

      <div className="terminal-wrapper">
        <div className="terminal-header">Terminal Output</div>
        <pre
          className={`terminal-output ${
            isError ? "terminal-error" : ""
          }`}
        >
          {output || "Waiting for output..."}
        </pre>
      </div>
    </div>
  );
}

export default App;