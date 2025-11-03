import "./App.css";
import { useState, useEffect } from "react";
import { 
  readTextFile, 
  writeTextFile, 
  BaseDirectory, 
  exists, 
  mkdir,
  readDir
} from "@tauri-apps/plugin-fs";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");

  // Initialize notes directory and load notes
  useEffect(() => {
    initNotesDirectory();
    loadNotes();
  }, []);

  const initNotesDirectory = async () => {
    try {
      const dirExists = await exists("notes", { baseDir: BaseDirectory.AppData });
      if (!dirExists) {
        await mkdir("notes", { baseDir: BaseDirectory.AppData, recursive: true });
      }
    } catch (error) {
      console.error("Error initializing notes directory:", error);
    }
  };

  const loadNotes = async () => {
    try {
      const dirExists = await exists("notes", { baseDir: BaseDirectory.AppData });
      if (!dirExists) {
        return;
      }

      const entries = await readDir("notes", { baseDir: BaseDirectory.AppData });
      const loadedNotes: Note[] = [];

      for (const entry of entries) {
        if (entry.name && entry.name.endsWith(".json")) {
          try {
            const content = await readTextFile(`notes/${entry.name}`, {
              baseDir: BaseDirectory.AppData,
            });
            const note = JSON.parse(content) as Note;
            loadedNotes.push(note);
          } catch (error) {
            console.error(`Error loading note ${entry.name}:`, error);
          }
        }
      }

      // Sort by creation date (newest first)
      loadedNotes.sort((a, b) => b.createdAt - a.createdAt);
      setNotes(loadedNotes);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "",
      content: "",
      createdAt: Date.now(),
    };
    setCurrentNote(newNote);
    setNoteTitle("");
    setNoteContent("");
  };

  const saveNote = async () => {
    if (!currentNote) return;

    try {
      const noteToSave: Note = {
        ...currentNote,
        title: noteTitle || "Untitled Note",
        content: noteContent,
      };

      await writeTextFile(
        `notes/${noteToSave.id}.json`,
        JSON.stringify(noteToSave, null, 2),
        { baseDir: BaseDirectory.AppData }
      );

      // Reload notes to update the list
      await loadNotes();
      
      // Clear current note
      setCurrentNote(null);
      setNoteTitle("");
      setNoteContent("");
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const loadNote = (note: Note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  return (
    <main>
      <h1>Lit</h1>
      <p>The world's best notetaking app!</p>

      <div>
        <button onClick={createNewNote}>New Note</button>
        {currentNote && <button onClick={saveNote}>Save</button>}
      </div>

      {currentNote && (
        <div>
          <h2>Editing Note</h2>
          <div>
            <input
              type="text"
              placeholder="Note title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </div>
          <div>
            <textarea
              placeholder="Note content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={10}
              cols={50}
            />
          </div>
        </div>
      )}

      <div>
        <h2>Saved Notes</h2>
        {notes.length === 0 ? (
          <p>No notes yet. Create your first note!</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <button onClick={() => loadNote(note)}>
                  {note.title || "Untitled Note"} - {new Date(note.createdAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default App;

