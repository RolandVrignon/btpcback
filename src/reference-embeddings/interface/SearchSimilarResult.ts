export interface SearchSimilarResult {
  id: string;
  referenceChunkId: string;
  text: string;
  referenceDocumentId: string;
  referenceDocumentTitle: string;
  page: number;
  score: number;
}
