

const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

app.use(cors());
app.use(bodyParser.json());

// Create SQLite database
const db = new sqlite3.Database("./tasks.db", (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Database connected successfully");
  }
});

// Create tables if they don't exist
db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`
);

db.run(
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    reminder DATETIME,
    completed BOOLEAN DEFAULT 0,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`
);

// Helper function to authenticate JWT tokens
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.sendStatus(403);

  jwt.verify(token, "your_jwt_secret", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Register new user
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Server error");
      }
      res.send("User registered successfully");
    }
  );
});

// Login user and send JWT token
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err || !user) {
        return res.status(401).send({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, "your_jwt_secret", {
        expiresIn: "1h",
      });
      res.json({ token });
    }
  );
});

// Add a new task
app.post("/tasks", authenticateJWT, (req, res) => {
  const { title, description, reminder } = req.body;
  const { user } = req;

  db.run(
    "INSERT INTO tasks (title, description, reminder, user_id) VALUES (?, ?, ?, ?)",
    [title, description, reminder, user.id],
    function (err) {
      if (err) {
        return res.status(500).send("Error adding task");
      }
      const task = {
        id: this.lastID,
        title,
        description,
        reminder,
        completed: 0,
        status: "upcoming", // New task status logic
      };
      res.json(task);
    }
  );
});

// Fetch tasks for a user
app.get("/tasks", authenticateJWT, (req, res) => {
  const { user } = req;

  db.all(
    "SELECT * FROM tasks WHERE user_id = ?",
    [user.id],
    (err, tasks) => {
      if (err) {
        return res.status(500).send("Error fetching tasks");
      }

      // Modify tasks with status
      const updatedTasks = tasks.map((task) => {
        const currentDate = new Date();
        const reminderDate = new Date(task.reminder);
        let status = "upcoming";
        if (reminderDate < currentDate && task.completed === 0) {
          status = "uncompleted";
        } else if (task.completed === 1) {
          status = "completed";
        }
        return { ...task, status };
      });

      res.json(updatedTasks);
    }
  );
});

// Update task completion status
app.put("/tasks/:id", authenticateJWT, (req, res) => {
  const { title, description, reminder } = req.body;
  const { id } = req.params;
  const { user } = req;

  db.run(
    "UPDATE tasks SET title = ?, description = ?, reminder = ? WHERE id = ? AND user_id = ?",
    [title, description, reminder, id, user.id],
    function (err) {
      if (err) {
        return res.status(500).send("Error updating task");
      }

      res.send({ message: "Task updated successfully" });
    }
  );
});

//Marking as completed
app.put("/tasks/completed/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { user } = req;

  db.run(
    "UPDATE tasks SET completed = 1 WHERE id = ? AND user_id = ?",
    [id, user.id],
    function (err) {
      if (err) {
        return res.status(500).send("Error updating task completion");
      }

      res.send({ message: "Task marked as completed" });
    }
  );
});





// Delete a task
app.delete("/tasks/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { user } = req;

  db.run(
    "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    [id, user.id],
    function (err) {
      if (err) {
        return res.status(500).send("Error deleting task");
      }

      res.send({ message: "Task deleted successfully" });
    }
  );
});

// Mark task as completed
app.put("/tasks/completed/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { user } = req;

  db.run(
    "UPDATE tasks SET completed = 1 WHERE id = ? AND user_id = ?",
    [id, user.id],
    function (err) {
      if (err) {
        return res.status(500).send("Error updating task completion");
      }

      res.send({ message: "Task marked as completed" });
    }
  );
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});