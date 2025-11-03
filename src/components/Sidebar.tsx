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
    setExpandedFolders((prevExpanded) => {
      const updated = new Set(prevExpanded);
      if (updated.has(folderId)) {
        updated.delete(folderId);
        if (currentFolderId === folderId) {
          onFolderSelect(null);
        }
      } else {
        updated.add(folderId);
        onFolderSelect(folderId);
      }
      return updated;
    });
  };

  const getFoldersByParent = (parentId: string | null) => {
    return folders.filter((folder) => folder.parentId === parentId);
  };

  const getNotesByFolder = (folderId: string | null) => {
    return notes.filter(n => n.folderId === folderId);
  };

  const renderTreeItem = (parentId: string | null, depth: number = 0) => {
    const childFolders = getFoldersByParent(parentId);
    const folderNotes = getNotesByFolder(parentId);

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          const folderIcon = isExpanded
            ? "/icons/sidebar/folder-open.svg"
            : "/icons/sidebar/folder.svg";

          return (
            <div key={folder.id} style={{ marginLeft: `${depth * 20}px` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                  onClick={() => toggleFolder(folder.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${folder.name}`}
                >
                  <img src={folderIcon} alt="" width={16} height={16} aria-hidden="true" />
                  <span>{folder.name}</span>
                </button>
                <button
                  onClick={() => onNewFolder(folder.id)}
                  title="New subfolder"
                  aria-label="Create subfolder"
                >
                  <img src="/icons/sidebar/folder-simple-plus.svg" alt="" width={16} height={16} aria-hidden="true" />
                </button>
              </div>
              {isExpanded && renderTreeItem(folder.id, depth + 1)}
            </div>
          );
        })}

        {folderNotes.map((note) => (
          <div key={note.id} style={{ marginLeft: `${depth * 20}px` }}>
            <button
              onClick={() => onNoteSelect(note)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <img src="/icons/sidebar/file.svg" alt="" width={16} height={16} aria-hidden="true" />
              <span>{note.title || "Untitled Note"}</span>
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
        <button onClick={onNewNote} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src="/icons/sidebar/file-plus.svg" alt="New note icon" width={16} height={16} />
          <span>New Note</span>
        </button>
        <button
          onClick={() => onNewFolder(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <img src="/icons/sidebar/folder-simple-plus.svg" alt="New folder icon" width={16} height={16} />
          <span>New Folder</span>
        </button>
      </div>
      
      <div>
        {notes.length === 0 && folders.length === 0 ? (
          <p>No notes yet. Create your first note!</p>
        ) : (
          <div>{renderTreeItem(null)}</div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
