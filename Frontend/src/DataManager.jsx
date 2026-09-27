import { useState } from "react";

function AddTodo() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const newTodo = await res.json();
      setStatus(`Added: "${newTodo.task}"`);
      setTask("");
    } catch {
      setStatus("Failed to add todo");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="New task"
        />
        <button type="submit">Add</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}

export default AddTodo;