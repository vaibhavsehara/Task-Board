from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskModel(BaseModel):
    id: int | None = None
    title: str
    description: str = ""
    status: str

# Use lowercase status for frontend compatibility
# Initial tasks for demo
_tasks = [
  {
    "id": 1,
    "title": "Design login page",
    "description": "Create a responsive login form with validation",
    "status": "todo"
  },
  {
    "id": 2,
    "title": "Set up backend API",
    "description": "Initialize FastAPI server and basic routes",
    "status": "todo"
  },
  {
    "id": 3,
    "title": "Drag-and-drop demo",
    "description": "Implement task movement between columns",
    "status": "inprogress"
  },
  {
    "id": 4,
    "title": "Connect frontend to API",
    "description": "Use fetch/axios to get and update tasks",
    "status": "inprogress"
  },
  {
    "id": 5,
    "title": "Fix input focus issue",
    "description": "Ensure form inputs don't lose focus during drag",
    "status": "done"
  },
  {
    "id": 6,
    "title": "Style task board",
    "description": "Add gradients and animations with Tailwind CSS",
    "status": "done"
  }
]


def get_next_id():
    return max((t["id"] for t in _tasks), default=0) + 1

@app.get("/tasks")
def get_tasks():
    return _tasks

@app.post("/tasks")
def add_task(task: TaskModel):
    new_task = task.model_dump()
    new_task["id"] = get_next_id()
    _tasks.append(new_task)
    return new_task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    global _tasks
    for t in _tasks:
        if t["id"] == task_id:
            _tasks.remove(t)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Task not found")

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, task: TaskModel):
    for t in _tasks:
        if t["id"] == task_id:
            t["title"] = task.title
            t["description"] = task.description
            t["status"] = task.status
            return t
    raise HTTPException(status_code=404, detail="Task not found")
