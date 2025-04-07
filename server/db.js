import sqlite3 from "sqlite3";

const DBSOURCE = "notes.db";

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DBSOURCE, async (err) => {
      if (err) {
        console.error("Error opening database", err);
        reject(err);
        return;
      }

      console.log("Connected to SQLite database.");

      try {
        await createTables(db);
        await insertSampleData(db);
        resolve(db);
      } catch (error) {
        reject(error);
      }
    });
  });
};

const createTables = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create NOTEBOOKS table
      db.run(
        `CREATE TABLE IF NOT EXISTS notebooks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Create NOTES table
      db.run(
        `CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          is_pinned BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          pdf_path TEXT,
          FOREIGN KEY(notebook_id) REFERENCES notebooks(id)
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Create TAGS table
      db.run(
        `CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Create NOTE_TAGS table
      db.run(
        `CREATE TABLE IF NOT EXISTS note_tags (
          note_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (note_id, tag_id),
          FOREIGN KEY(note_id) REFERENCES notes(id),
          FOREIGN KEY(tag_id) REFERENCES tags(id)
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      resolve();
    });
  });
};

const insertSampleData = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Insert sample notebooks
      db.run(
        `INSERT OR IGNORE INTO notebooks (id, title, description) 
        VALUES ('nb1', 'Work Notes', 'All work-related notes and documents')`,
        (err) => {
          if (err) reject(err);
        }
      );

      db.run(
        `INSERT OR IGNORE INTO notebooks (id, title, description) 
        VALUES ('nb2', 'Personal Notes', 'Personal thoughts and ideas')`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Insert sample tags
      db.run(
        `INSERT OR IGNORE INTO tags (id, name, color) 
        VALUES ('tag1', 'Important', '#ff4444')`,
        (err) => {
          if (err) reject(err);
        }
      );

      db.run(
        `INSERT OR IGNORE INTO tags (id, name, color) 
        VALUES ('tag2', 'Work', '#4444ff')`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Insert sample notes
      db.run(
        `INSERT OR IGNORE INTO notes (id, notebook_id, title, content, is_pinned) 
        VALUES ('n1', 'nb1', 'Meeting Notes', 'Discussion points from team meeting...', 1)`,
        (err) => {
          if (err) reject(err);
        }
      );

      db.run(
        `INSERT OR IGNORE INTO notes (id, notebook_id, title, content) 
        VALUES ('n2', 'nb2', 'Ideas', 'Random thoughts and ideas...')`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Insert sample note tags
      db.run(
        `INSERT OR IGNORE INTO note_tags (note_id, tag_id) 
        VALUES ('n1', 'tag1')`,
        (err) => {
          if (err) reject(err);
        }
      );

      db.run(
        `INSERT OR IGNORE INTO note_tags (note_id, tag_id) 
        VALUES ('n1', 'tag2')`,
        (err) => {
          if (err) reject(err);
        }
      );

      resolve();
    });
  });
};

let db = null;

export const getDatabase = async () => {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
};
