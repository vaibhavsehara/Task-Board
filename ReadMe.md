# Kanban Task Board (Trello-like)

A modern, mobile-friendly Kanban task board built with React (Vite), Tailwind CSS, and FastAPI backend. Supports viewing, creating, editing, deleting, and drag-and-drop moving of tasks between columns (To Do, In Progress, Done).

## Features

- Three columns: To Do, In Progress, Done
- Add, edit (inline rename), and delete tasks
- Drag-and-drop tasks between and within columns (using @dnd-kit/core)
- Responsive, modern UI with sidebar, topbar, and gradient background
- FastAPI backend with REST API for tasks
- State is persisted to backend

## Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, @dnd-kit/core
- **Backend:** FastAPI (Python)

## Setup Instructions

### 1. Clone the Repository

```sh
# Replace <your-repo-url> with your actual repo URL
git clone <your-repo-url>
cd <repo-root>
```

### 2. Backend (FastAPI)

```sh
cd project/backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install fastapi uvicorn
uvicorn main:app --reload
```

- The backend will run at `http://localhost:8000` by default.

### 3. Frontend (React + Vite)

```sh
cd ../frontend
npm install
npm run dev
```

- The frontend will run at `http://localhost:5173` by default.

### 4. Usage

- Open the frontend in your browser.
- Add, edit, delete, and drag tasks between columns.
- All changes are saved to the backend.

## Deployment

- You can deploy the frontend to Vercel/Netlify and the backend to Render/Fly.io or similar.
- Update API URLs in the frontend if deploying to production.

## AI Usage

This project was built with the help of GitHub Copilot and AI chat assistants. See the `chats` folder (if included) for conversation logs.

## Demo Video

- [Add your demo video link here]

## Live Link

- [Add your deployed app link here]

## Contact

For any queries, contact [sanchit@sakshm.com](mailto:sanchit@sakshm.com)
