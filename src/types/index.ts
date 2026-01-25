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
  created_at: string;
  updated_at: string;
  sections?: Section;
  modules?: Module;
}

export interface Profile {
  id: string;
  username: string;
  nickname: string;
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
  created_at: string;
  updated_at: string;
}

export interface TreeNode {
  type: 'section' | 'module' | 'all' | 'folder';
  data: Section | Module | Folder | { id: string; name: string };
  section?: Section;
  module?: Module;
  folder?: Folder;
}
