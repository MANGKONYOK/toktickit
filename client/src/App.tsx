import { useState } from "react";
import * as api from "./api.js";
import type { Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await api.checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setErrorMessage("Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <div className="mb-4">
        <button
          className="btn btn-success"
          onClick={handleCheck}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Loading…" : "Check System"}
        </button>
      </div>

      {state === "success" && (
        <div className="mt-4">
          <p className="fs-5 mb-3">
            <strong>System Status:</strong>{" "}
            <span className="text-success fw-bold">Online</span>
          </p>
          <h2 className="h5 mb-3">Supported Request Categories:</h2>
          <ol className="list-group list-group-numbered">
            {categories.map((cat) => (
              <li key={cat.id} className="list-group-item">
                {cat.name}
              </li>
            ))}
          </ol>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p className="fs-5 mb-2">
            <strong>System Status:</strong>{" "}
            <span className="text-danger fw-bold">Offline</span>
          </p>
          <div className="alert alert-danger" role="alert">
            {errorMessage || "Unable to connect to TokTickIT API"}
          </div>
        </div>
      )}
    </div>
  );
}
