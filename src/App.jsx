import { useEffect, useRef, useState } from "react";
import CollaborativeEditor from './CollaborativeEditor';
import "./App.css";

function App() {
  const [code, setCode] = useState(`console.log("Hello CodeNexus");`);
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const roomId = 'test-room';

  const isInitialLoad = useRef(true);

  useEffect(() => {
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
  }, [code, language]);

  const autoSave = async () => {
    if (!code || !code.trim()) return;
    try {
      setIsSaving(true);
      await fetch("http://localhost:3000/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
    }
  };

  const runCode = async () => {
    if (!code || !code.trim()) return;
    setOutput("Running...");
    setIsError(false);

    try {
      const response = await fetch("http://localhost:3000/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.output || "No output");
      } else {
        setOutput(data.error || "Execution error.");
        setIsError(true);
      }
    } catch (error) {
      setOutput("Server connection failed.");
      setIsError(true);
    }
  };

  const loadCode = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/load");
      const data = await response.json();
      if (data.code) setCode(data.code);
      if (data.language) setLanguage(data.language);
    } catch (error) {
      console.error("Load failed:", error);
    }
  };

  const saveCode = async () => {
    try {
      setIsSaving(true);
      await fetch("http://localhost:3000/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="toolbar">
        <div className="brand-title">CodeNexus IDE</div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="language-select"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="c">C</option>
          <option value="cpp">C++</option>
        </select>

        {isSaving && <span className="saving-text">Saving...</span>}

        <button onClick={saveCode} className="btn btn-secondary">
          Save
        </button>

        <button onClick={runCode} className="btn btn-run">
          ▶ Run
        </button>
      </div>

      <div className="editor-container">
        <CollaborativeEditor
          roomId={roomId}
          language={language}
          onCodeChange={(value) => setCode(value)}
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