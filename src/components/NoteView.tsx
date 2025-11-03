import type { Note } from "../types";

interface NoteViewProps {
  note: Note | null;
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

function NoteView({ 
  note, 
  title, 
  content, 
  onTitleChange, 
  onContentChange, 
  onSave 
}: NoteViewProps) {
  if (!note) {
    return (
      <div>
        <h2>No note selected</h2>
        <p>Select a note from the sidebar or create a new one.</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <button onClick={onSave}>Save</button>
      </div>
      
      <div>
        <input
          type="text"
          placeholder="Note title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      
      <div>
        <textarea
          placeholder="Note content"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={20}
          cols={80}
        />
      </div>
    </div>
  );
}

export default NoteView;
