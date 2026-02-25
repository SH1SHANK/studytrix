export type SmartCollection = {
  id: string;
  name: string;
  fileIds: string[];
  fileCount: number;
  generatedAt: number;
  dismissed: boolean;
  pinned: boolean;
  colourIndex: number;
};
