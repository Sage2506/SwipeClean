export interface Project {
  id: string;
  name: string;
  targetFolder: string;
  currentIndex: number;
  totalFiles: number;
  markedForDeletion: string[];
  lastAccessed: number;
}
