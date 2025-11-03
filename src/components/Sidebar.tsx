import type { Note } from "../types";

interface SidebarProps {
  notes: Note[];
  onNoteSelect: (note: Note) => void;
  onNewNote: () => void;
}

function Sidebar({ notes, onNoteSelect, onNewNote }: SidebarProps) {
  return (
    <div>
      <h2>Notes</h2>
      <button onClick={onNewNote}>New Note</button>
      
      <div>
        {notes.length === 0 ? (
          <p>No notes yet. Create your first note!</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <button onClick={() => onNoteSelect(note)}>
                  <div>{note.title || "Untitled Note"}</div>
                  <div>{new Date(note.createdAt).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
