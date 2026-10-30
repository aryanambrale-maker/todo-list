// 1. Todo & Project Classes (with method restoration after JSON.parse)
class Todo {
  constructor(title, description, dueDate, priority, notes = "", completed = false, id = crypto.randomUUID()) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.priority = priority;
    this.notes = notes;
    this.completed = completed;
  }

  toggleComplete() {
    this.completed = !this.completed;
  }

  updateDetails(title, description, dueDate, priority, notes) {
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.priority = priority;
    this.notes = notes;
  }
}

class Project {
  constructor(name, id = crypto.randomUUID(), todos = []) {
    this.id = id;
    this.name = name;
    this.todos = todos.map(
      (t) => new Todo(t.title, t.description, t.dueDate, t.priority, t.notes, t.completed, t.id)
    );
  }

  addTodo(todo) {
    this.todos.push(todo);
  }

  removeTodo(todoId) {
    this.todos = this.todos.filter((t) => t.id !== todoId);
  }

  getTodo(todoId) {
    return this.todos.find((t) => t.id === todoId);
  }
}

// 2. Application Logic & LocalStorage Module
const AppLogic = (() => {
  const STORAGE_KEY = "odin_todo_projects_v1";
  let projects = [];
  let activeProjectId = null;

  const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  };

  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        projects = parsed.map((p) => new Project(p.name, p.id, p.todos));
      }
    } catch (err) {
      projects = [];
    }

    if (projects.length === 0) {
      const defaultProj = new Project("Default");
      defaultProj.addTodo(
        new Todo(
          "Finish Odin Todo Project",
          "Build modular todo list with localStorage support",
          "2026-11-05",
          "high",
          "Push to GitHub and enable GitHub Pages"
        )
      );
      projects.push(defaultProj);
      saveToStorage();
    }
    activeProjectId = projects[0].id;
  };

  const getProjects = () => projects;
  const getActiveProject = () => projects.find((p) => p.id === activeProjectId) || projects[0];
  const setActiveProject = (id) => { activeProjectId = id; };

  const createProject = (name) => {
    const newProj = new Project(name);
    projects.push(newProj);
    activeProjectId = newProj.id;
    saveToStorage();
  };

  const addOrUpdateTodo = (todoData, editId = null) => {
    const project = getActiveProject();
    if (editId) {
      const existing = project.getTodo(editId);
      if (existing) {
        existing.updateDetails(
          todoData.title,
          todoData.description,
          todoData.dueDate,
          todoData.priority,
          todoData.notes
        );
      }
    } else {
      project.addTodo(
        new Todo(todoData.title, todoData.description, todoData.dueDate, todoData.priority, todoData.notes)
      );
    }
    saveToStorage();
  };

  const deleteTodo = (todoId) => {
    getActiveProject().removeTodo(todoId);
    saveToStorage();
  };

  const toggleTodo = (todoId) => {
    const todo = getActiveProject().getTodo(todoId);
    if (todo) {
      todo.toggleComplete();
      saveToStorage();
    }
  };

  loadFromStorage();

  return {
    getProjects,
    getActiveProject,
    setActiveProject,
    createProject,
    addOrUpdateTodo,
    deleteTodo,
    toggleTodo
  };
})();

// 3. DOM Controller Module
const DOMController = (() => {
  const projectListEl = document.getElementById("project-list");
  const projectForm = document.getElementById("project-form");
  const projectInput = document.getElementById("project-name-input");
  const currentProjectTitle = document.getElementById("current-project-title");
  const todoListEl = document.getElementById("todo-list");

  const dialog = document.getElementById("todo-dialog");
  const todoForm = document.getElementById("todo-form");
  const modalTitle = document.getElementById("modal-title");
  const editTodoIdInput = document.getElementById("edit-todo-id");

  const renderProjects = () => {
    projectListEl.innerHTML = "";
    const activeProject = AppLogic.getActiveProject();

    AppLogic.getProjects().forEach((proj) => {
      const li = document.createElement("li");
      li.className = `project-item ${proj.id === activeProject.id ? "active" : ""}`;
      li.innerHTML = `<span>${proj.name}</span><span>(${proj.todos.length})</span>`;
      li.addEventListener("click", () => {
        AppLogic.setActiveProject(proj.id);
        renderAll();
      });
      projectListEl.appendChild(li);
    });
  };

  const renderTodos = () => {
    const activeProject = AppLogic.getActiveProject();
    currentProjectTitle.textContent = activeProject.name;
    todoListEl.innerHTML = "";

    activeProject.todos.forEach((todo) => {
      const card = document.createElement("div");
      card.className = `todo-card priority-${todo.priority}`;

      card.innerHTML = `
        <div class="todo-summary">
          <div class="todo-left">
            <input type="checkbox" class="toggle-check" ${todo.completed ? "checked" : ""}>
            <strong class="todo-title ${todo.completed ? "completed" : ""}">${todo.title}</strong>
          </div>
          <div class="todo-right">
            <span class="due-date">Due: ${todo.dueDate}</span>
            <button class="btn secondary-btn expand-btn">Details</button>
            <button class="btn secondary-btn edit-btn">Edit</button>
            <button class="btn danger-btn delete-btn">Delete</button>
          </div>
        </div>
        <div class="todo-details">
          <p><strong>Priority:</strong> ${todo.priority.toUpperCase()}</p>
          <p><strong>Description:</strong> ${todo.description || "None"}</p>
          <p><strong>Notes:</strong> ${todo.notes || "None"}</p>
        </div>
      `;

      card.querySelector(".toggle-check").addEventListener("change", () => {
        AppLogic.toggleTodo(todo.id);
        renderAll();
      });

      card.querySelector(".expand-btn").addEventListener("click", () => {
        card.querySelector(".todo-details").classList.toggle("expanded");
      });

      card.querySelector(".edit-btn").addEventListener("click", () => {
        openModalForEdit(todo);
      });

      card.querySelector(".delete-btn").addEventListener("click", () => {
        AppLogic.deleteTodo(todo.id);
        renderAll();
      });

      todoListEl.appendChild(card);
    });
  };

  const openModalForEdit = (todo) => {
    modalTitle.textContent = "Edit Todo";
    editTodoIdInput.value = todo.id;
    document.getElementById("todo-title").value = todo.title;
    document.getElementById("todo-desc").value = todo.description;
    document.getElementById("todo-date").value = todo.dueDate;
    document.getElementById("todo-priority").value = todo.priority;
    document.getElementById("todo-notes").value = todo.notes;
    dialog.showModal();
  };

  const renderAll = () => {
    renderProjects();
    renderTodos();
  };

  // Event Listeners
  projectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = projectInput.value.trim();
    if (name) {
      AppLogic.createProject(name);
      projectInput.value = "";
      renderAll();
    }
  });

  document.getElementById("open-todo-modal-btn").addEventListener("click", () => {
    modalTitle.textContent = "Add Todo";
    todoForm.reset();
    editTodoIdInput.value = "";
    document.getElementById("todo-date").valueAsDate = new Date();
    dialog.showModal();
  });

  document.getElementById("cancel-todo-btn").addEventListener("click", () => dialog.close());

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const todoData = {
      title: document.getElementById("todo-title").value.trim(),
      description: document.getElementById("todo-desc").value.trim(),
      dueDate: document.getElementById("todo-date").value,
      priority: document.getElementById("todo-priority").value,
      notes: document.getElementById("todo-notes").value.trim()
    };
    const editId = editTodoIdInput.value || null;
    AppLogic.addOrUpdateTodo(todoData, editId);
    dialog.close();
    renderAll();
  });

  renderAll();
})();