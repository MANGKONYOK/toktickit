import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export default function App() {
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    void categories;
    async function handleCheck() {
        // TODO(Issue 4): set loading, call checkSystem(), then either
        //   - success: store categories and show Online + the list, or
        //   - error: show Offline + a useful message.
        setState("loading");
    }
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [_jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }), _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" })] }));
}
