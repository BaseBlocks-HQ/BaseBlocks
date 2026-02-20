export interface UndoCommand {
  id: string;
  timestamp: number;
  description: string;
  /** If set, this command belongs to a per-page stack; otherwise site-level */
  pageId?: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export interface UndoStack {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
}
