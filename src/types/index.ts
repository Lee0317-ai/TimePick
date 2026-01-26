export interface Section {
  id: string;
  name: string;
  type: 'webpage' | 'document' | 'image' | 'video';
  sort_order: number;
  created_at: string;
}

export interface Module {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  module_sections?: { section_id: string }[];
}

export interface Resource {
  id: string;
  user_id: string;
  section_id: string;
  module_id: string | null;
  folder_id: string | null;
  parent_id: string | null;
  name: string;
  url: string | null;
  content: string | null;
  file_type: string | null;
  file_size: number;
  thumbnail_url: string | null;
  notes: string | null;
  tags: string[] | null;
  source_inspiration_id: string | null;
  created_at: string;
  updated_at: string;
  sections?: Section;
  modules?: Module;
}

export interface Profile {
  id: string;
  username: string;
  nickname: string;
  birth_date: string | null;
  created_at: string;
  storage_used: number;
  storage_limit: number;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Inspiration {
  id: string;
  user_id: string;
  content: string;
  location: string | null;
  status: 'active' | 'converted' | 'archived';
  converted_to_resource_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeNode {
  type: 'all' | 'folder' | 'tags';
  data: Folder | { id: string; name: string; tags?: string[] };
  folder?: Folder;
}

export type ViewType = 'grid' | 'list' | 'thumbnail';

export interface TagGroup {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TagStat {
  tag: string;
  count: number;
  group?: TagGroup;
}

export interface ResourceInitData {
  name: string;
  notes?: string;
  location?: string | null;
  inspirationId?: string;
}

export interface FortuneDraw {
  id: string;
  user_id: string;
  birth_date: string;
  draw_date: string;
  image_url: string;
  fortune_content: string;
  created_at: string;
}

export interface FortuneDrawResponse {
  success: boolean;
  cached: boolean;
  data: {
    image_url: string;
    fortune_content: string;
    draw_date: string;
  };
}

export interface FortuneDraw {
  id: string;
  user_id: string;
  birth_date: string;
  draw_date: string;
  image_url: string;
  fortune_content: string;
  created_at: string;
}

export interface FortuneDrawResponse {
  success: boolean;
  cached: boolean;
  data: {
    image_url: string;
    fortune_content: string;
    draw_date: string;
  };
}
