export interface PageResponseComponentContent {
  query: {
    url: string;
    params: {
      [key: string]: number | boolean | string;
    }
  },
  items: Array<PageResponseComponent>;
  default_item_style: string;
}

export interface PageResponseComponent {
  type: string;
  content: PageResponseComponentContent;
  label: { text: string } | null;
  generated: number;

}

export interface PageResponse {

  components: Array<PageResponseComponent>;
}
