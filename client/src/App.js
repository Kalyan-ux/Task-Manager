import React, { Component } from "react";
import "./App.css";

class App extends Component {
  state = {
    token: "",
    username: "",
    password: "",
    taskInput: "",
    description: "",
    reminder: "",
    tasks: [],
    isLoggedIn: false,
    editId: null,
    editText: "",
    editDescription: "",
    editReminder: "",
  };

  componentDidMount() {
    const token = localStorage.getItem("token");
    const tokenExpiry = localStorage.getItem("tokenExpiry");

    if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry, 10)) {
      this.setState({ token, isLoggedIn: true }, this.fetchTasks);
    } else {
      // Token is missing or expired
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiry");
      this.setState({ token: null, isLoggedIn: false });
    }
    this.fetchTasks();
  }


  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  register = () => {
    const { username, password } = this.state;
    fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => res.text())
      .then((message) => alert(message));
  };

  login = () => {
    const { username, password } = this.state;
    fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          alert(errorData.message || "Login failed");
          return;
        }
        const data = await res.json();

        const expiryTime = Date.now() + 60 * 60 * 1000; // 1 hour in milliseconds
        localStorage.setItem("token", data.token);
        localStorage.setItem("tokenExpiry", expiryTime);

        this.setState({ token: data.token, isLoggedIn: true }, this.fetchTasks);
      })
      .catch((err) => {
        alert("An error occurred during login.");
        console.error(err);
      });
  };


  fetchTasks = () => {
    if (!this.state.token) {
      console.warn("No token available to fetch tasks.");
      return;
    }

    fetch("http://localhost:3000/tasks", {
      headers: { Authorization: `Bearer ${this.state.token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch tasks.");
        }
        return res.json();
      })
      .then((tasks) => {
        console.log(tasks)
        const updatedTasks = tasks.map((task) => {
          const currentDate = new Date();
          const reminderDate = new Date(task.reminder);

          let status = "upcoming";
          if (reminderDate < currentDate && !task.completed) {
            status = "uncompleted";
          } else if (task.completed) {
            status = "completed";
          }

          return { ...task, status };
        });

        this.setState({ tasks: updatedTasks });
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err);
        alert("Session expired or network error. Please login again.");
        this.logout(); // Optional: log out the user if token fails
      });
  };




  addTask = () => {
    const { taskInput, description, reminder, token } = this.state;
    fetch("http://localhost:3000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: taskInput, description, reminder }),
    })
      .then((res) => res.json())
      .then((task) => {
        this.setState(
          {
            tasks: [...this.state.tasks, task],
            taskInput: "",
            description: "",
            reminder: "",
          },
          this.fetchTasks
        );
      });
  };

  deleteTask = (id) => {
    fetch(`http://localhost:3000/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.state.token}` },
    }).then(() => {
      this.setState({
        tasks: this.state.tasks.filter((task) => task.id !== id),
      });
    });
  };

  startEdit = (task) => {
    this.setState({
      editId: task.id,
      editText: task.title,
      editDescription: task.description,
      editReminder: task.reminder,
    });
  };

  markCompleted = (id) => {
    fetch(`http://localhost:3000/tasks/completed/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${this.state.token}` },
    })
      .then((res) => res.json())
      .then(() => {
        this.fetchTasks(); // Refresh the task list
      });
  };


  submitEdit = () => {
    const { editId, editText, editDescription, editReminder, token } =
      this.state;

    fetch(`http://localhost:3000/tasks/${editId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: editText,
        description: editDescription,
        reminder: editReminder,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to update task");
        }
        return res.json();
      })
      .then((updatedTask) => {
        // Recalculate status based on updated reminder and completion
        const currentDate = new Date();
        const reminderDate = new Date(updatedTask.reminder);

        let status = "upcoming";
        if (reminderDate < currentDate && !updatedTask.completed) {
          status = "uncompleted";
        } else if (updatedTask.completed) {
          status = "completed";
        }

        const finalUpdatedTask = { ...updatedTask, status };

        const updatedTasks = this.state.tasks.map((task) =>
          task.id === finalUpdatedTask.id ? finalUpdatedTask : task
        );

        this.setState({
          tasks: updatedTasks,
          editId: null,
          editText: "",
          editDescription: "",
          editReminder: "",
        });
      })
      .catch((err) => {
        console.error("Edit failed:", err);
        alert("Failed to update the task. Please try again.");
      });
  };

  logout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");

    this.setState({
      token: null,
      isLoggedIn: false,
      tasks: [],
    });

    window.location.href = "/login";
  };



  render() {
    const {
      username,
      password,
      taskInput,
      description,
      reminder,
      tasks,
      isLoggedIn,
      editId,
      editText,
      editDescription,
      editReminder,
    } = this.state;

    return (
      <div>

        {!isLoggedIn ? (
          <>
            <div className="body">
              <div className="registerForm">
                <h2>Register/Login</h2>
                <input
                  name="username"
                  value={username}
                  onChange={this.handleChange}
                  placeholder="Username"
                />
                <input
                  name="password"
                  type="password"
                  value={password}
                  onChange={this.handleChange}
                  placeholder="Password"
                />
                <button
                  onClick={this.register}
                  className="registerLogin-btn register-btn"
                >
                  Register
                </button>
                <button
                  onClick={this.login}
                  className="registerLogin-btn login-btn"
                >
                  Login
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="main-container">
            <div className="container">
              <button
                onClick={this.logout}
                style={{
                  backgroundColor: '#ff4d4d',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  marginLeft:'90%'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e60000'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#ff4d4d'}
                onFocus={(e) => e.target.style.outline = 'none'}
                onActive={(e) => e.target.style.backgroundColor = '#cc0000'}
              >
                Logout
              </button>
              <h2 className="heading">Task Manager</h2>
              <div className="top-container">
                <div className="input-container">
                  <label for="title">Title</label>
                  <input
                    id="title"
                    name="taskInput"
                    type="text"
                    value={taskInput}
                    onChange={this.handleChange}
                    placeholder="New Task Title"
                  />
                  <label for="desc">Description</label>
                  <textarea
                    id="desc"
                    name="description"
                    value={description}
                    onChange={this.handleChange}
                    placeholder="Description"
                    rows="6"
                    cols=""
                  ></textarea>

                  <label for="reminder">Reminder</label>
                  <input
                    id="reminder"
                    name="reminder"
                    type="datetime-local"
                    value={reminder}
                    onChange={this.handleChange}
                  />
                  <button onClick={this.addTask} className="add-btn">
                    Add Task
                  </button>
                </div>
                <div className="img-container">
                  <img
                    src="https://assets.ccbp.in/frontend/react-js/appointments-app/appointments-img.png"
                    alt="appointments"
                  />
                </div>
              </div>
              <hr></hr>
              <ul className="bottom-container">
                {tasks.map((task) => (
                  <li key={task.id} className={`each-list ${task.status}`}>
                    {editId === task.id ? (
                      <div className="edit-card">
                        <input
                          value={editText}
                          onChange={(e) =>
                            this.setState({ editText: e.target.value })
                          }
                        />
                        <textarea
                          value={editDescription}
                          cols=""
                          rows="4"
                          onChange={(e) =>
                            this.setState({ editDescription: e.target.value })
                          }
                        />
                        <input
                          type="datetime-local"
                          value={editReminder}
                          onChange={(e) =>
                            this.setState({ editReminder: e.target.value })
                          }
                        />
                        <button className="save-btn" onClick={this.submitEdit}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`list-card ${task.completed === 1 ? "task-blur" : ""
                          }`}
                        style={{ position: "relative" }}
                      >
                        <div className="check-box-container">
                          <h1 className="title">{task.title}</h1>
                          <input
                            type="checkbox"
                            checked={task.completed === 1}
                            disabled={task.completed === 1} // Prevent re-click
                            onChange={() => this.markCompleted(task.id)}
                          />
                        </div>
                        <p className="desc">{task.description}</p>
                        <p className="reminder">
                          Reminder: {new Date(task.reminder).toLocaleString()}
                        </p>
                        <p className={`status ${task.status}`}>
                          Status: {task.status}
                        </p>
                        <div className="action-buttons btns">
                          <button
                            className="edit"
                            onClick={() => this.startEdit(task)}
                          >
                            Edit
                          </button>
                          <button
                            className=".delete"
                            onClick={() => this.deleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </div>
                        {task.completed === 1 && (
                          <div className="completed-overlay">✅ Completed</div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;

