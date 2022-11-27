export interface Episode {
  id: number;
  title: string;
  description: string;
}
export interface Episodes {
  [key: string]: Episode[];
}
