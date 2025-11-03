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
import Sidebar from "./components/Sidebar";
import NoteView from "./components/NoteView";
import type { Note, Folder } from "./types";


function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Initialize notes directory and load notes
  useEffect(() => {
    initNotesDirectory();
    loadData();
  }, []);

  const initNotesDirectory = async () => {
    try {
      const dirExists = await exists("notes", { baseDir: BaseDirectory.AppData });
      if (!dirExists) {
        await mkdir("notes", { baseDir: BaseDirectory.AppData, recursive: true });
      }
      const foldersFileExists = await exists("notes/folders.json", { baseDir: BaseDirectory.AppData });
      if (!foldersFileExists) {
        await writeTextFile("notes/folders.json", JSON.stringify([]), { baseDir: BaseDirectory.AppData });
      }
    } catch (error) {
      console.error("Error initializing notes directory:", error);
    }
  };

  const loadData = async () => {
    await loadNotes();
    await loadFolders();
  };

  const loadFolders = async () => {
    try {
      const content = await readTextFile("notes/folders.json", {
        baseDir: BaseDirectory.AppData,
      });
      const loadedFolders = JSON.parse(content) as Folder[];
      setFolders(loadedFolders);
    } catch (error) {
      console.error("Error loading folders:", error);
      setFolders([]);
    }
  };

  const saveFolders = async (foldersToSave: Folder[]) => {
    try {
      await writeTextFile(
        "notes/folders.json",
        JSON.stringify(foldersToSave, null, 2),
        { baseDir: BaseDirectory.AppData }
      );
      setFolders(foldersToSave);
    } catch (error) {
      console.error("Error saving folders:", error);
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
        if (entry.name && entry.name.endsWith(".json") && entry.name !== "folders.json") {
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
      folderId: currentFolderId,
    };
    setCurrentNote(newNote);
    setNoteTitle("");
    setNoteContent("");
  };

  const generateFolderName = (parentId: string | null) => {
    const baseName = "New Folder";
    const siblingNames = new Set(
      folders
        .filter((folder) => folder.parentId === parentId)
        .map((folder) => folder.name.trim())
    );

    if (!siblingNames.has(baseName)) {
      return baseName;
    }

    let counter = 2;
    while (siblingNames.has(`${baseName} ${counter}`)) {
      counter += 1;
    }
    return `${baseName} ${counter}`;
  };

  const createNewFolder = async (parentId: string | null) => {
    const folderName = generateFolderName(parentId);

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: folderName,
      parentId: parentId,
      createdAt: Date.now(),
    };

    const updatedFolders = [...folders, newFolder];
    await saveFolders(updatedFolders);
  };

  const saveNote = async () => {
    if (!currentNote) return;

    try {
      const noteToSave: Note = {
        ...currentNote,
        title: noteTitle || "Untitled Note",
        content: noteContent,
        folderId: currentNote.folderId,
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
      <div style={{ display: 'flex', gap: '20px' }}>
        <Sidebar 
          notes={notes}
          folders={folders}
          currentFolderId={currentFolderId}
          onNoteSelect={loadNote}
          onNewNote={createNewNote}
          onNewFolder={createNewFolder}
          onFolderSelect={setCurrentFolderId}
        />
        
        <NoteView
          note={currentNote}
          title={noteTitle}
          content={noteContent}
          onTitleChange={setNoteTitle}
          onContentChange={setNoteContent}
          onSave={saveNote}
        />
      </div>
    </main>
  );
}

export default App;
