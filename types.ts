
export interface Paragraph {
  id: string;
  text: string;
  sourceDraftIndex?: number;
  sourceParaIndex?: number; // 0-based index of paragraph within its draft
  originalId?: string;      // ID of the source paragraph for reflection tracking
}

export interface ManuscriptDraft {
  id: number;
  title: string;
  customTitle?: string;
  paragraphs: Paragraph[];
}
