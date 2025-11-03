import { useState } from "react";
import type { Note, Folder } from "../types";

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  currentFolderId: string | null;
  onNoteSelect: (note: Note) => void;
  onNewNote: () => void;
  onNewFolder: (parentId: string | null) => void;
  onFolderSelect: (folderId: string | null) => void;
}

function Sidebar({ 
  notes, 
  folders,
  currentFolderId,
  onNoteSelect, 
  onNewNote,
  onNewFolder,
  onFolderSelect
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFoldersByParent = (parentId: string | null) => {
    return folders.filter(f => f.parentId === parentId);
  };

  const getNotesByFolder = (folderId: string | null) => {
    return notes.filter(n => n.folderId === folderId);
  };

  const renderTreeItem = (folderId: string | null, depth: number = 0) => {
    const childFolders = getFoldersByParent(folderId);
    const folderNotes = getNotesByFolder(folderId);

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          return (
            <div key={folder.id} style={{ marginLeft: `${depth * 20}px` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button onClick={() => toggleFolder(folder.id)}>
                  {isExpanded ? '▼' : '▶'}
                </button>
                <button onClick={() => onFolderSelect(folder.id)}>
                  📁 {folder.name}
                </button>
                <button onClick={() => onNewFolder(folder.id)} title="New subfolder">
                  +📁
                </button>
              </div>
              {isExpanded && renderTreeItem(folder.id, depth + 1)}
            </div>
          );
        })}
        
        {folderNotes.map((note) => (
          <div key={note.id} style={{ marginLeft: `${depth * 20}px` }}>
            <button onClick={() => onNoteSelect(note)}>
              📄 {note.title || "Untitled Note"}
            </button>
          </div>
        ))}
      </>
    );
  };

  return (
    <div style={{ width: '300px', borderRight: '1px solid #ccc', padding: '10px' }}>
      <h2>Notes</h2>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '5px' }}>
        <button onClick={onNewNote}>New Note</button>
        <button onClick={() => onNewFolder(currentFolderId)}>New Folder</button>
      </div>
      
      <div>
        {currentFolderId && (
          <button onClick={() => onFolderSelect(null)} style={{ marginBottom: '10px' }}>
            ⬅ Back to Root
          </button>
        )}
        
        {notes.length === 0 && folders.length === 0 ? (
          <p>No notes yet. Create your first note!</p>
        ) : (
          <div>
            {renderTreeItem(currentFolderId)}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
