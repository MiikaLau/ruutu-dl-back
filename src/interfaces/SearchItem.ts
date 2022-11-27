export interface SearchItem {
  id: number;
  parent_id: number | null;
  uuid: string;
  type: string;
  source_item_type: string;
  source_feed_type: string;
  title: string;
  title_original: string;
  alias: string;
  label: string | null;
  logo: string | null;
}
