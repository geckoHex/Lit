import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { Note, Folder, NoteViewMode } from "../types";
import "./Sidebar.css";

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  currentFolderId: string | null;
  currentNote: Note | null;
  onNoteSelect: (note: Note) => void;
  onNewNote: () => void;
  onNewFolder: (parentId: string | null) => void;
  onFolderSelect: (folderId: string | null) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  viewMode: NoteViewMode;
  onViewModeChange: (mode: NoteViewMode) => void;
}

function Sidebar({ 
  notes, 
  folders,
  currentFolderId,
  currentNote,
  onNoteSelect, 
  onNewNote,
  onNewFolder,
  onFolderSelect,
  onRenameNote,
  onDeleteNote,
  onRenameFolder,
  onDeleteFolder,
  viewMode,
  onViewModeChange
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
              className="tree-item"
              style={{ marginLeft: `${depth * 16}px` }}
            >
              <div
                className="tree-item__content"
                onContextMenu={(event) => handleContextMenu(event, "folder", folder.id, folder.name)}
              >
                {editingItem?.type === "folder" && editingItem.id === folder.id ? (
                  <>
                    <img src={folderIcon} alt="" className="tree-item__icon" aria-hidden="true" />
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleEditSubmit}
                      className="tree-item__input"
                      aria-label="Rename folder"
                    />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="tree-item__button"
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${folder.name}`}
                    >
                      <img src={folderIcon} alt="" className="tree-item__icon" aria-hidden="true" />
                      <span className="tree-item__text">{folder.name}</span>
                    </button>
                    <button
                      onClick={() => onNewFolder(folder.id)}
                      className="tree-item__subfolder-button"
                      title="New subfolder"
                      aria-label="Create subfolder"
                    >
                      <img src="/icons/sidebar/folder-simple-plus.svg" alt="" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
              {isExpanded && (
                <div className="tree-item__children">
                  {renderTreeItem(folder.id, 0)}
                </div>
              )}
            </div>
          );
        })}

        {folderNotes.map((note) => (
          <div
            key={note.id}
            className="tree-item"
            style={{ marginLeft: `${depth * 16}px` }}
          >
            <div
              className={`tree-item__content ${currentNote?.id === note.id ? 'tree-item__content--selected' : ''}`}
              onContextMenu={(event) => handleContextMenu(event, "note", note.id, note.title || "Untitled Note")}
            >
              {editingItem?.type === "note" && editingItem.id === note.id ? (
                <>
                  <img src="/icons/sidebar/file.svg" alt="" className="tree-item__icon" aria-hidden="true" />
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(event) => setEditValue(event.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditSubmit}
                    className="tree-item__input"
                    aria-label="Rename note"
                  />
                </>
              ) : (
                <button
                  onClick={() => onNoteSelect(note)}
                  className="tree-item__button"
                >
                  <img src="/icons/sidebar/file.svg" alt="" className="tree-item__icon" aria-hidden="true" />
                  <span className="tree-item__text">{note.title || "Untitled Note"}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <h2 className="sidebar__title">LIT NOTES</h2>
        <div className="sidebar__mode-toggle">
          <span className="sidebar__mode-label">Mode</span>
          <div className="sidebar__mode-buttons">
            <button
              type="button"
              onClick={() => onViewModeChange("edit")}
              aria-pressed={viewMode === "edit"}
              className="sidebar__mode-button"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("view")}
              aria-pressed={viewMode === "view"}
              className="sidebar__mode-button"
            >
              View
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar__actions">
        <button onClick={onNewNote} className="sidebar__action-button">
          <img src="/icons/sidebar/file-plus.svg" alt="" width={18} height={18} />
          <span>New Note</span>
        </button>
        <button
          onClick={() => onNewFolder(null)}
          className="sidebar__action-button"
        >
          <img src="/icons/sidebar/folder-simple-plus.svg" alt="" width={18} height={18} />
          <span>New Folder</span>
        </button>
      </div>
      
      <div className="sidebar__content">
        {notes.length === 0 && folders.length === 0 ? (
          <div className="sidebar__empty">
            <p className="sidebar__empty-text">No notes yet. Create your first note to get started!</p>
          </div>
        ) : (
          renderTreeItem(null)
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            onClick={() => startEditing(contextMenu.type, contextMenu.id, contextMenu.label)}
            className="context-menu__item"
          >
            <img src="/icons/right-click-menu/pencil.svg" alt="" className="context-menu__icon" aria-hidden="true" />
            <span>Rename</span>
          </button>
          <button
            onClick={handleDelete}
            className="context-menu__item context-menu__item--delete"
          >
            <img src="/icons/right-click-menu/trash.svg" alt="" className="context-menu__icon" aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
