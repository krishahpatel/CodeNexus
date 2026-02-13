import { useState } from "react";
import Editor from "@monaco-editor/react";

function App() {
  const [code, setCode] = useState(`// CodeNexus Engine Boot Sequence

function optimizeSystem(load) {
  if (load > 0.8) {
    return scaleHorizontally();
  }
  return maintainStability();
}

console.log("CodeNexus initialized.");
`);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value)}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
        }}
      />
    </div>
  );
}

export default App;
