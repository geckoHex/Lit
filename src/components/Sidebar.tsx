import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { Note, Folder } from "../types";

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  currentFolderId: string | null;
  onNoteSelect: (note: Note) => void;
  onNewNote: () => void;
  onNewFolder: (parentId: string | null) => void;
  onFolderSelect: (folderId: string | null) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

function Sidebar({ 
  notes, 
  folders,
  currentFolderId,
  onNoteSelect, 
  onNewNote,
  onNewFolder,
  onFolderSelect,
  onRenameNote,
  onDeleteNote,
  onRenameFolder,
  onDeleteFolder
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "folder" | "note";
    id: string;
    label: string;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: "folder" | "note"; id: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const cancelEditRef = useRef(false);

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

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("contextmenu", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("contextmenu", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (editingItem) {
      requestAnimationFrame(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      });
    }
  }, [editingItem]);

  const handleContextMenu = (
    event: ReactMouseEvent,
    type: "folder" | "note",
    id: string,
    label: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type,
      id,
      label,
    });
    setEditingItem(null);
  };

  const startEditing = (type: "folder" | "note", id: string, value: string) => {
    cancelEditRef.current = false;
    setEditingItem({ type, id });
    setEditValue(value);
    setContextMenu(null);
  };

  const handleEditSubmit = () => {
    if (!editingItem) {
      return;
    }

    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }

    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      setEditingItem(null);
      return;
    }

    if (editingItem.type === "folder") {
      onRenameFolder(editingItem.id, trimmedValue);
    } else {
      onRenameNote(editingItem.id, trimmedValue);
    }

    setEditingItem(null);
    setEditValue("");
  };

  const handleEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleEditSubmit();
    } else if (event.key === "Escape") {
      cancelEditRef.current = true;
      setEditingItem(null);
      setEditValue("");
    }
  };

  const handleDelete = () => {
    if (!contextMenu) return;

    if (contextMenu.type === "folder") {
      onDeleteFolder(contextMenu.id);
    } else {
      onDeleteNote(contextMenu.id);
    }

    setContextMenu(null);
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
            <div
              key={folder.id}
              style={{ marginLeft: `${depth * 20}px` }}
              onContextMenu={(event) => handleContextMenu(event, "folder", folder.id, folder.name)}
            >
              {editingItem?.type === "folder" && editingItem.id === folder.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <img src={folderIcon} alt="" width={16} height={16} aria-hidden="true" />
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditSubmit}
                    style={{ flex: 1 }}
                    aria-label="Rename folder"
                  />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
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
              )}
              {isExpanded && renderTreeItem(folder.id, depth + 1)}
            </div>
          );
        })}

        {folderNotes.map((note) => (
          <div
            key={note.id}
            style={{ marginLeft: `${depth * 20}px` }}
            onContextMenu={(event) => handleContextMenu(event, "note", note.id, note.title || "Untitled Note")}
          >
            {editingItem?.type === "note" && editingItem.id === note.id ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img src="/icons/sidebar/file.svg" alt="" width={16} height={16} aria-hidden="true" />
                <input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleEditSubmit}
                  style={{ flex: 1 }}
                  aria-label="Rename note"
                />
              </div>
            ) : (
              <button
                onClick={() => onNoteSelect(note)}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <img src="/icons/sidebar/file.svg" alt="" width={16} height={16} aria-hidden="true" />
                <span>{note.title || "Untitled Note"}</span>
              </button>
            )}
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

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#ffffff",
            border: "1px solid #ccc",
            borderRadius: "6px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            padding: "4px 0",
            minWidth: "180px",
            zIndex: 1000,
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            onClick={() => startEditing(contextMenu.type, contextMenu.id, contextMenu.label)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <img src="/icons/right-click-menu/pencil.svg" alt="" width={16} height={16} aria-hidden="true" />
            <span>Rename</span>
          </button>
          <button
            onClick={handleDelete}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              color: "#c83d2b",
            }}
          >
            <img src="/icons/right-click-menu/trash.svg" alt="" width={16} height={16} aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
