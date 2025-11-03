export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  folderId: string | null; // null means root level
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null means root level
  createdAt: number;
}

export type TreeItem = 
  | { type: 'note'; data: Note }
  | { type: 'folder'; data: Folder };

export type NoteViewMode = "edit" | "view";
