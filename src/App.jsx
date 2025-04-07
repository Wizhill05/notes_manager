import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ReactQuill from "react-quill";
import { Document, Page, pdfjs } from "react-pdf";
import "react-quill/dist/quill.snow.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "./App.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [page, setPage] = useState("notebooks");
  const [notebooks, setNotebooks] = useState([]);
  const [currentNotebook, setCurrentNotebook] = useState(null);
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [databaseTables, setDatabaseTables] = useState([]);

  // Form states
  const [notebookForm, setNotebookForm] = useState({
    title: "",
    description: "",
  });

  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    is_pinned: false,
    selectedTags: [],
    pdf: null,
  });

  const [tagForm, setTagForm] = useState({
    name: "",
    color: "#1a73e8",
  });

  const backendUrl = "http://localhost:5000";

  // Fetch data based on current page
  useEffect(() => {
    if (page === "notebooks") {
      fetchNotebooks();
      fetchTags();
    } else if (page === "search") {
      handleSearch();
    } else if (page === "database") {
      fetchDatabaseTables();
    }
  }, [page, searchQuery]);

  // Fetch database tables
  const fetchDatabaseTables = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/database/tables`);
      const data = await res.json();
      setDatabaseTables(data);
    } catch (err) {
      setMessage("Error fetching database tables");
      console.error(err);
    }
  };

  // Render database page
  const renderDatabase = () => (
    <div className="database-page">
      <div className="list-container">
        <h2>Database Tables</h2>
        {databaseTables.map((table) => (
          <div key={table.table_name} className="table-section">
            <h3>{table.table_name}</h3>
            <div className="schema-info">
              <h4>Schema:</h4>
              <pre>{table.table_schema}</pre>
            </div>
            <div className="table-data">
              <h4>Data:</h4>
              {table.rows.length > 0 ? (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(table.rows[0]).map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, i) => (
                            <td key={i}>{JSON.stringify(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-message">No data in this table</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Fetch notebooks
  const fetchNotebooks = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/notebooks`);
      const data = await res.json();
      setNotebooks(data);
    } catch (err) {
      setMessage("Error fetching notebooks");
      console.error(err);
    }
  };

  // Fetch notes for a notebook
  const fetchNotes = async (notebookId) => {
    try {
      const res = await fetch(
        `${backendUrl}/api/notebooks/${notebookId}/notes`
      );
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      setMessage("Error fetching notes");
      console.error(err);
    }
  };

  // Fetch tags
  const fetchTags = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/tags`);
      const data = await res.json();
      setTags(data);
    } catch (err) {
      setMessage("Error fetching tags");
      console.error(err);
    }
  };

  // Handle notebook form submission
  const handleNotebookSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/notebooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notebookForm),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Notebook created successfully");
        setNotebookForm({ title: "", description: "" });
        fetchNotebooks();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("Error creating notebook");
      console.error(err);
    }
  };

  // Handle note form submission
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("notebook_id", currentNotebook.id);
    formData.append("title", noteForm.title);
    formData.append("content", noteForm.content);
    formData.append("is_pinned", noteForm.is_pinned);
    noteForm.selectedTags.forEach((tagId) => {
      formData.append("tag_ids[]", tagId);
    });
    if (noteForm.pdf) {
      formData.append("pdf", noteForm.pdf);
    }

    try {
      const res = await fetch(`${backendUrl}/api/notes`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Note created successfully");
        setNoteForm({
          title: "",
          content: "",
          is_pinned: false,
          selectedTags: [],
          pdf: null,
        });
        fetchNotes(currentNotebook.id);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("Error creating note");
      console.error(err);
    }
  };

  // Handle tag form submission
  const handleTagSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagForm),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Tag created successfully");
        setTagForm({ name: "", color: "#1a73e8" });
        fetchTags();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("Error creating tag");
      console.error(err);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(
        `${backendUrl}/api/search?query=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      setMessage("Error performing search");
      console.error(err);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    try {
      const res = await fetch(`${backendUrl}/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Note deleted successfully");
        fetchNotes(currentNotebook.id);
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("Error deleting note");
      console.error(err);
    }
  };

  // Delete notebook
  const handleDeleteNotebook = async (notebookId) => {
    try {
      const res = await fetch(`${backendUrl}/api/notebooks/${notebookId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Notebook deleted successfully");
        setCurrentNotebook(null);
        fetchNotebooks();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("Error deleting notebook");
      console.error(err);
    }
  };

  // Render notebooks page
  const renderNotebooks = () => (
    <div className="notebooks-page">
      <div className="form-container">
        <h2>Create New Notebook</h2>
        <form onSubmit={handleNotebookSubmit}>
          <div className="form-group">
            <label>Title*</label>
            <input
              type="text"
              value={notebookForm.title}
              onChange={(e) =>
                setNotebookForm({ ...notebookForm, title: e.target.value })
              }
              required
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={notebookForm.description}
              onChange={(e) =>
                setNotebookForm({
                  ...notebookForm,
                  description: e.target.value,
                })
              }
              className="input"
            />
          </div>
          <button type="submit" className="button primary">
            Create Notebook
          </button>
        </form>
      </div>

      <div className="list-container">
        <h2>Your Notebooks</h2>
        {notebooks.length === 0 ? (
          <p className="empty-message">No notebooks created yet</p>
        ) : (
          <div className="notebooks-grid">
            {notebooks.map((notebook) => (
              <div key={notebook.id} className="notebook-card">
                <h3>{notebook.title}</h3>
                <p>{notebook.description || "No description"}</p>
                <div className="notebook-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      setCurrentNotebook(notebook);
                      fetchNotes(notebook.id);
                      setPage("notes");
                    }}
                  >
                    Open
                  </button>
                  <button
                    className="button warning"
                    onClick={() => handleDeleteNotebook(notebook.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render notes page
  const renderNotes = () => (
    <div className="notes-page">
      <div className="notes-header">
        <button
          className="button secondary"
          onClick={() => {
            setCurrentNotebook(null);
            setPage("notebooks");
          }}
        >
          ← Back to Notebooks
        </button>
        <h2>{currentNotebook?.title} - Notes</h2>
      </div>

      <div className="form-container">
        <h3>Create New Note</h3>
        <form onSubmit={handleNoteSubmit}>
          <div className="form-group">
            <label>Title*</label>
            <input
              type="text"
              value={noteForm.title}
              onChange={(e) =>
                setNoteForm({ ...noteForm, title: e.target.value })
              }
              required
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Content</label>
            <ReactQuill
              value={noteForm.content}
              onChange={(content) => setNoteForm({ ...noteForm, content })}
              className="quill-editor"
            />
          </div>

          <div className="form-group">
            <label>PDF Attachment</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                setNoteForm({ ...noteForm, pdf: e.target.files[0] })
              }
              className="input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tags</label>
              <select
                multiple
                value={noteForm.selectedTags}
                onChange={(e) =>
                  setNoteForm({
                    ...noteForm,
                    selectedTags: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    ),
                  })
                }
                className="select"
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={noteForm.is_pinned}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, is_pinned: e.target.checked })
                  }
                />
                Pin this note
              </label>
            </div>
          </div>

          <button type="submit" className="button primary">
            Create Note
          </button>
        </form>
      </div>

      <div className="list-container">
        <h3>Notes</h3>
        {notes.length === 0 ? (
          <p className="empty-message">No notes in this notebook</p>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`note-card ${note.is_pinned ? "pinned" : ""}`}
              >
                <h4>{note.title}</h4>
                <div
                  className="note-content"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />

                {note.pdf_path && (
                  <div className="pdf-preview">
                    <Document file={`${backendUrl}/${note.pdf_path}`}>
                      <Page pageNumber={1} width={200} />
                    </Document>
                    <button
                      className="button secondary"
                      onClick={() =>
                        window.open(`${backendUrl}/${note.pdf_path}`, "_blank")
                      }
                    >
                      Open PDF
                    </button>
                  </div>
                )}

                <div className="note-tags">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="tag"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <div className="note-footer">
                  <span className="note-date">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                  <button
                    className="button warning"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render tags page
  const renderTags = () => (
    <div className="tags-page">
      <div className="form-container">
        <h2>Create New Tag</h2>
        <form onSubmit={handleTagSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Name*</label>
              <input
                type="text"
                value={tagForm.name}
                onChange={(e) =>
                  setTagForm({ ...tagForm, name: e.target.value })
                }
                required
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Color*</label>
              <input
                type="color"
                value={tagForm.color}
                onChange={(e) =>
                  setTagForm({ ...tagForm, color: e.target.value })
                }
                required
                className="input color-input"
              />
            </div>
          </div>
          <button type="submit" className="button primary">
            Create Tag
          </button>
        </form>
      </div>

      <div className="list-container">
        <h2>All Tags</h2>
        {tags.length === 0 ? (
          <p className="empty-message">No tags created yet</p>
        ) : (
          <div className="tags-grid">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="tag-card"
                style={{ borderColor: tag.color }}
              >
                <span className="tag" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render search page
  const renderSearch = () => (
    <div className="search-page">
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="search-input"
        />
      </div>

      <div className="list-container">
        <h2>Search Results</h2>
        {searchResults.length === 0 ? (
          <p className="empty-message">
            {searchQuery ? "No results found" : "Enter a search term"}
          </p>
        ) : (
          <div className="notes-grid">
            {searchResults.map((note) => (
              <div key={note.id} className="note-card">
                <div className="note-notebook">{note.notebook_title}</div>
                <h4>{note.title}</h4>
                <div
                  className="note-content"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />

                {note.pdf_path && (
                  <div className="pdf-preview">
                    <Document file={`${backendUrl}/${note.pdf_path}`}>
                      <Page pageNumber={1} width={200} />
                    </Document>
                    <button
                      className="button secondary"
                      onClick={() =>
                        window.open(`${backendUrl}/${note.pdf_path}`, "_blank")
                      }
                    >
                      Open PDF
                    </button>
                  </div>
                )}

                <div className="note-tags">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="tag"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <div className="note-footer">
                  <span className="note-date">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="header">
        <h1>Notes Management System</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${page === "notebooks" ? "active" : ""}`}
            onClick={() => setPage("notebooks")}
          >
            Notebooks
          </button>
          <button
            className={`nav-btn ${page === "tags" ? "active" : ""}`}
            onClick={() => setPage("tags")}
          >
            Tags
          </button>
          <button
            className={`nav-btn ${page === "search" ? "active" : ""}`}
            onClick={() => setPage("search")}
          >
            Search
          </button>
          <button
            className={`nav-btn ${page === "database" ? "active" : ""}`}
            onClick={() => setPage("database")}
          >
            Database
          </button>
        </nav>
      </header>

      <main className="main">
        {message && (
          <div
            className={`message ${
              message.includes("Error") ? "error" : "success"
            }`}
          >
            {message}
            <button className="close-btn" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}

        {page === "notebooks" && renderNotebooks()}
        {page === "notes" && currentNotebook && renderNotes()}
        {page === "tags" && renderTags()}
        {page === "search" && renderSearch()}
        {page === "database" && renderDatabase()}
      </main>
    </div>
  );
}

export default App;
