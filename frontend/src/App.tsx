import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
}

const COLUMN_TITLES = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
} as const;

type ColumnType = keyof typeof COLUMN_TITLES;

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuTaskId, setMenuTaskId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' as Task["status"] });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<ColumnType | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const addTitleRef = useRef<HTMLInputElement | null>(null);
  const renameTitleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/tasks')
      .then(res => res.json())
      .then(data => setTasks(data));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuTaskId !== null && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuTaskId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuTaskId]);

  useEffect(() => {
    if (showAdd && addTitleRef.current) {
      addTitleRef.current.focus();
      addTitleRef.current.select();
    }
  }, [showAdd, newTask.status]);

  useEffect(() => {
    if (editingTaskId !== null && renameTitleRef.current) {
      renameTitleRef.current.focus();
      renameTitleRef.current.select();
    }
  }, [editingTaskId]);

  // Only PointerSensor, handle-only drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Memoized columns
  const columns = useMemo(() => {
    const cols: Record<ColumnType, Task[]> = { todo: [], inprogress: [], done: [] };
    tasks.forEach(t => cols[t.status]?.push(t));
    return cols;
  }, [tasks]);

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    const res = await fetch('http://localhost:8000/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    const data = await res.json();
    setTasks((prev) => [...prev, data]);
    setShowAdd(false);
    setNewTask({ title: '', description: '', status: 'todo' });
  };

  // Delete Task
  const handleDeleteTask = async (id: number) => {
    await fetch(`http://localhost:8000/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMenuTaskId(null);
  };

  // Rename/Move Task
  const handleUpdateTask = async (task: Task) => {
    const res = await fetch(`http://localhost:8000/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        status: task.status
      }),
    });
    const data = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    setMenuTaskId(null);
  };

  const handleMenuClick = (id: number) => {
    setMenuTaskId(menuTaskId === id ? null : id);
  };

  // --- DND HANDLERS ---
  const handleDragEnd = async (event: DragEndEvent) => {
    setOverCol(null);
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;
    const activeTask = tasks.find(t => t.id === Number(active.id));
    if (!activeTask) return;

    // dropped onto column
    if (typeof over.id === 'string' && over.id in COLUMN_TITLES) {
      const dest = over.id as Task['status'];
      if (activeTask.status === dest) return;
      const filtered = tasks.filter(t => t.id !== activeTask.id);
      const lastIdx = filtered.map(t => t.status).lastIndexOf(dest);
      if (lastIdx === -1) {
        filtered.push({ ...activeTask, status: dest });
      } else {
        filtered.splice(lastIdx + 1, 0, { ...activeTask, status: dest });
      }
      setTasks(filtered);
      await handleUpdateTask({ ...activeTask, status: dest });
      return;
    }
    // dropped onto another task
    if (typeof over.id === 'number') {
      const overTask = tasks.find(t => t.id === over.id);
      if (!overTask) return;
      const dest = overTask.status;
      const filtered = tasks.filter(t => t.id !== activeTask.id);
      const idx = filtered.findIndex(t => t.id === overTask.id);
      filtered.splice(idx, 0, { ...activeTask, status: dest });
      setTasks(filtered);
      if (activeTask.status !== dest) {
        await handleUpdateTask({ ...activeTask, status: dest });
      }
    }
  };

  // --- UI ---
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Toolbar */}
      <div className="w-full h-16 bg-blue-700 text-white flex items-center px-6 shadow z-10">
        <button
          className="mr-4 focus:outline-none"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span className="material-icons align-middle">{sidebarOpen ? 'menu_open' : 'menu'}</span>
        </button>
        <span className="text-2xl font-bold tracking-wide">Task Board</span>
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className={`bg-blue-800 text-white transition-all duration-300 h-full ${sidebarOpen ? 'w-56' : 'w-16'} flex flex-col items-center py-6 shadow-lg z-10`}>
          <div className="flex flex-col gap-6 w-full items-center">
            <span className="material-icons text-3xl">dashboard</span>
            {sidebarOpen && <span className="text-lg font-semibold">Dashboard</span>}
            <span className="material-icons text-3xl">assignment</span>
            {sidebarOpen && <span className="text-lg font-semibold">Tasks</span>}
            {/* Add more sidebar items as needed */}
          </div>
        </div>
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 taskboard-bg">
          <div className="flex flex-col items-center w-full h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e: DragStartEvent) => setActiveTaskId(Number(e.active.id))}
              onDragOver={(e: DragOverEvent) => {
                const o = e.over;
                setOverCol((o && typeof o.id === 'string' && o.id in COLUMN_TITLES) ? o.id as ColumnType : null);
              }}
              onDragEnd={handleDragEnd}
            >
              <div className="flex flex-1 gap-8 w-full justify-center items-start min-h-0">
                {(Object.keys(COLUMN_TITLES) as ColumnType[]).map(col => (
                  <ColumnWrapper key={col} col={col} isOver={overCol === col}>
                    <SortableContext
                      items={columns[col].map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columns[col].length === 0
                        ? <div className="taskboard-empty">No tasks</div>
                        : columns[col].map(task => (
                            <DraggableTask key={task.id} task={task}>
                              <div className="taskboard-task-title flex justify-between items-center">
                                {editingTaskId === task.id ? (
                                  <form
                                    onSubmit={async e => {
                                      e.preventDefault();
                                      await handleUpdateTask({ ...task, title: editTitle, description: editDescription });
                                      setEditingTaskId(null);
                            }}
                            className="rename-task-form"
                          >
                            <input
                              id={`rename-title-${task.id}`}
                              className=""
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              required
                              type="text"
                              placeholder="Task title"
                              ref={renameTitleRef}
                            />
                            <input
                              id={`rename-desc-${task.id}`}
                              className=""
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              placeholder="Description (optional)"
                              type="text"
                            />
                            <div className="rename-actions">
                              <button type="submit" className="rename-save-btn">Save</button>
                              <button type="button" className="rename-cancel-btn" onClick={() => setEditingTaskId(null)}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <span>{task.title}</span>
                            <button
                              className="option-menu-btn ml-2 p-1 rounded-full hover:bg-blue-200 focus:outline-none"
                              onClick={() => handleMenuClick(task.id)}
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="5" cy="12" r="2" fill="#64748b" />
                                <circle cx="12" cy="12" r="2" fill="#64748b" />
                                <circle cx="19" cy="12" r="2" fill="#64748b" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      {editingTaskId !== task.id && task.description && <div className="taskboard-task-desc">{task.description}</div>}
                      {menuTaskId === task.id && editingTaskId !== task.id && (
                        <div ref={menuRef} className="option-menu absolute right-2 top-8 bg-white rounded shadow-lg z-20 min-w-[140px] p-2 flex flex-col">
                          <button className="option-menu-item" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                          <button className="option-menu-item" onClick={() => {
                            setEditingTaskId(task.id);
                            setEditTitle(task.title);
                            setEditDescription(task.description || '');
                            setMenuTaskId(null);
                          }}>Rename</button>
                          <div className="option-menu-divider" />
                          <span className="text-xs text-gray-400 px-2 py-1">Move to:</span>
                          {(Object.keys(COLUMN_TITLES) as ColumnType[]).filter(s => s !== task.status).map(s => (
                            <button key={s} className="option-menu-item" onClick={() => handleUpdateTask({ ...task, status: s })}>{COLUMN_TITLES[s]}</button>
                          ))}
                        </div>
                      )}
                    </DraggableTask>
                  ))
              }
            </SortableContext>
            <div className="mt-4">
              {showAdd && newTask.status === col ? (
                <form onSubmit={handleAddTask} className="add-task-form">
                  <label htmlFor={`task-title-${col}`}>Task Title</label>
                  <input
                    id={`task-title-${col}`}
                    type="text"
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    ref={addTitleRef}
                  />
                  <label htmlFor={`task-desc-${col}`}>Description (optional)</label>
                  <input
                    id={`task-desc-${col}`}
                    type="text"
                    placeholder="Enter description"
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  />
                  <div className="add-task-actions">
                    <button type="submit" className="add-task-btn">Add</button>
                    <button type="button" className="cancel-task-btn" onClick={() => setShowAdd(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded w-full hover:bg-blue-600"
                  onClick={() => {
                    setShowAdd(true);
                    setNewTask({ ...newTask, status: col });
                  }}
                >
                  + Add Task
                </button>
              )}
            </div>
          </ColumnWrapper>
        ))}
      </div>
      <DragOverlay>
        { activeTaskId != null && (() => {
            const t = tasks.find(x => x.id === activeTaskId);
            return t ? (
              <div className="taskboard-task dragging-task">
                <div className="taskboard-task-title">{t.title}</div>
                {t.description && <div className="taskboard-task-desc">{t.description}</div>}
              </div>
            ) : null;
        })() }
      </DragOverlay>
    </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}

// ColumnWrapper as a proper droppable
interface ColumnWrapperProps {
  col: ColumnType;
  isOver: boolean;
  children: React.ReactNode;
}
function ColumnWrapper({ col, isOver, children }: ColumnWrapperProps) {
  const { setNodeRef } = useDroppable({ id: col });
  return (
    <div
      ref={setNodeRef}
      className={
        `taskboard-col flex flex-col min-h-0 max-h-full w-full md:w-96 ${isOver ? 'drag-over-col' : ''}`
      }
    >
      <h2 className="taskboard-col-title">{COLUMN_TITLES[col]}</h2>
      <div className="taskboard-tasks flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// DraggableTask with handle-only activation
interface DraggableTaskProps {
  task: Task;
  children: React.ReactNode;
}
const DraggableTask = ({ task, children }: DraggableTaskProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : undefined,
      }}
      className={`taskboard-task relative group${isDragging ? ' dragging-task' : ''}`}
    >
      <button
        {...listeners}
        {...attributes}
        className="drag-handle-btn absolute left-2 top-2 p-1 rounded hover:bg-blue-200 cursor-grab z-10"
        aria-label="Drag task"
        style={{ touchAction: 'none' }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="2" cy="6" r="1.5" fill="#64748b" />
          <circle cx="2" cy="10" r="1.5" fill="#64748b" />
          <circle cx="2" cy="14" r="1.5" fill="#64748b" />
          <circle cx="7" cy="6" r="1.5" fill="#64748b" />
          <circle cx="7" cy="10" r="1.5" fill="#64748b" />
          <circle cx="7" cy="14" r="1.5" fill="#64748b" />
        </svg>
      </button>
      <div className="pl-8">{children}</div>
    </div>
  );
};

export default App;