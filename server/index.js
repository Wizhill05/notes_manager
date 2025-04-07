import express from "express";
import cors from "cors";
import { getDatabase } from "./db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
import fs from "fs";
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));

let db;

// Initialize database before starting the server
const initializeApp = async () => {
  try {
    db = await getDatabase();

    // Start the server only after database is initialized
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
};

// Initialize the application
initializeApp();

// NOTEBOOK ENDPOINTS

// Get all notebooks
app.get("/api/notebooks", (req, res) => {
  db.all(
    "SELECT * FROM notebooks ORDER BY updated_at DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Create new notebook
app.post("/api/notebooks", (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const id = uuidv4();
  const query = `
    INSERT INTO notebooks (id, title, description)
    VALUES (?, ?, ?)
  `;

  db.run(query, [id, title, description], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: "Notebook created successfully",
      notebook_id: id,
    });
  });
});

// Update notebook
app.put("/api/notebooks/:id", (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const query = `
    UPDATE notebooks
    SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [title, description, req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Notebook not found" });
    }
    res.json({ message: "Notebook updated successfully" });
  });
});

// Delete notebook
app.delete("/api/notebooks/:id", (req, res) => {
  db.run("DELETE FROM notebooks WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Notebook not found" });
    }
    res.json({ message: "Notebook deleted successfully" });
  });
});

// NOTES ENDPOINTS

// Get all notes for a notebook
app.get("/api/notebooks/:notebookId/notes", (req, res) => {
  const query = `
    SELECT n.*, GROUP_CONCAT(t.id) as tag_ids, GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.color) as tag_colors
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.notebook_id = ?
    GROUP BY n.id
    ORDER BY n.is_pinned DESC, n.updated_at DESC
  `;

  db.all(query, [req.params.notebookId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Process the results to format tags
    const notes = rows.map((row) => {
      const tags = row.tag_ids
        ? row.tag_ids.split(",").map((id, index) => ({
            id,
            name: row.tag_names.split(",")[index],
            color: row.tag_colors.split(",")[index],
          }))
        : [];

      delete row.tag_ids;
      delete row.tag_names;
      delete row.tag_colors;

      return { ...row, tags };
    });

    res.json(notes);
  });
});

// Create new note
app.post("/api/notes", upload.single("pdf"), (req, res) => {
  const { notebook_id, title, content, is_pinned, tag_ids } = req.body;
  const pdf_path = req.file ? req.file.filename : null;

  if (!notebook_id || !title) {
    return res.status(400).json({
      error: "Notebook ID and title are required",
    });
  }

  const id = uuidv4();
  const query = `
    INSERT INTO notes (id, notebook_id, title, content, is_pinned, pdf_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [id, notebook_id, title, content, is_pinned ? 1 : 0, pdf_path],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // If tags were provided, create the relationships
      if (tag_ids && tag_ids.length > 0) {
        const tagValues = tag_ids
          .map((tag_id) => `('${id}', '${tag_id}')`)
          .join(",");
        db.run(
          `INSERT INTO note_tags (note_id, tag_id) VALUES ${tagValues}`,
          [],
          (err) => {
            if (err) {
              console.error("Error adding tags:", err);
            }
          }
        );
      }

      res.status(201).json({
        message: "Note created successfully",
        note_id: id,
      });
    }
  );
});

// Update note
app.put("/api/notes/:id", upload.single("pdf"), (req, res) => {
  const { title, content, is_pinned, tag_ids } = req.body;
  const pdf_path = req.file ? req.file.filename : null;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  let updateQuery = `
    UPDATE notes
    SET title = ?, content = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
  `;
  let params = [title, content, is_pinned ? 1 : 0];

  if (pdf_path) {
    updateQuery += `, pdf_path = ?`;
    params.push(pdf_path);
  }

  updateQuery += ` WHERE id = ?`;
  params.push(req.params.id);

  db.run(updateQuery, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Update tags if provided
    if (tag_ids) {
      db.run(
        "DELETE FROM note_tags WHERE note_id = ?",
        [req.params.id],
        (err) => {
          if (err) {
            console.error("Error removing old tags:", err);
          }

          if (tag_ids.length > 0) {
            const tagValues = tag_ids
              .map((tag_id) => `('${req.params.id}', '${tag_id}')`)
              .join(",");
            db.run(
              `INSERT INTO note_tags (note_id, tag_id) VALUES ${tagValues}`,
              [],
              (err) => {
                if (err) {
                  console.error("Error adding new tags:", err);
                }
              }
            );
          }
        }
      );
    }

    res.json({ message: "Note updated successfully" });
  });
});

// Delete note
app.delete("/api/notes/:id", (req, res) => {
  // First delete related tags
  db.run("DELETE FROM note_tags WHERE note_id = ?", [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Then delete the note
    db.run("DELETE FROM notes WHERE id = ?", [req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json({ message: "Note deleted successfully" });
    });
  });
});

// TAGS ENDPOINTS

// Get all tags
app.get("/api/tags", (req, res) => {
  db.all("SELECT * FROM tags ORDER BY name", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create new tag
app.post("/api/tags", (req, res) => {
  const { name, color } = req.body;

  if (!name || !color) {
    return res.status(400).json({
      error: "Tag name and color are required",
    });
  }

  const id = uuidv4();
  const query = `
    INSERT INTO tags (id, name, color)
    VALUES (?, ?, ?)
  `;

  db.run(query, [id, name, color], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Tag name already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: "Tag created successfully",
      tag_id: id,
    });
  });
});

// Update tag
app.put("/api/tags/:id", (req, res) => {
  const { name, color } = req.body;

  if (!name || !color) {
    return res.status(400).json({ error: "Tag name and color are required" });
  }

  const query = `
    UPDATE tags
    SET name = ?, color = ?
    WHERE id = ?
  `;

  db.run(query, [name, color, req.params.id], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Tag name already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }
    res.json({ message: "Tag updated successfully" });
  });
});

// Delete tag
app.delete("/api/tags/:id", (req, res) => {
  // First delete tag relationships
  db.run("DELETE FROM note_tags WHERE tag_id = ?", [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Then delete the tag
    db.run("DELETE FROM tags WHERE id = ?", [req.params.id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json({ message: "Tag deleted successfully" });
    });
  });
});

// DATABASE INFO ENDPOINT
app.get("/api/database/tables", (req, res) => {
  const query = `
    SELECT 
      name as table_name,
      sql as table_schema
    FROM 
      sqlite_master
    WHERE 
      type='table' AND 
      name NOT LIKE 'sqlite_%'
  `;

  db.all(query, [], (err, tables) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // For each table, get its contents
    const tablePromises = tables.map((table) => {
      return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table.table_name}`, [], (err, rows) => {
          if (err) reject(err);
          resolve({
            ...table,
            rows: rows || [],
          });
        });
      });
    });

    Promise.all(tablePromises)
      .then((tablesWithData) => {
        res.json(tablesWithData);
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });
});

// SEARCH ENDPOINT
app.get("/api/search", (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const searchQuery = `
    SELECT n.*, nb.title as notebook_title,
           GROUP_CONCAT(t.id) as tag_ids,
           GROUP_CONCAT(t.name) as tag_names,
           GROUP_CONCAT(t.color) as tag_colors
    FROM notes n
    JOIN notebooks nb ON n.notebook_id = nb.id
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.title LIKE ? OR n.content LIKE ?
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `;

  const searchPattern = `%${query}%`;

  db.all(searchQuery, [searchPattern, searchPattern], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Process the results to format tags
    const notes = rows.map((row) => {
      const tags = row.tag_ids
        ? row.tag_ids.split(",").map((id, index) => ({
            id,
            name: row.tag_names.split(",")[index],
            color: row.tag_colors.split(",")[index],
          }))
        : [];

      delete row.tag_ids;
      delete row.tag_names;
      delete row.tag_colors;

      return { ...row, tags };
    });

    res.json(notes);
  });
});
