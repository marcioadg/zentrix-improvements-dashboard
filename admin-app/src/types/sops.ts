// SOPS Module Type Definitions
export interface SopSpace {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  display_order: number;
}

export interface SopPage {
  id: string;
  company_id: string;
  space_id?: string;
  parent_page_id?: string;
  title: string;
  icon?: string;
  cover_image?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  archived: boolean;
  privacy_level: 'workspace' | 'private';
  display_order: number;
  is_template: boolean;
}

export type BlockType = 
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'checkList'
  | 'toggleList'
  | 'quote'
  | 'callout'
  | 'divider';

export interface BlockContent {
  text?: string;
  checked?: boolean;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
  // For toggle lists
  collapsed?: boolean;
  children?: string[];
  // For callouts
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  calloutIcon?: string;
}

export interface SopBlock {
  id: string;
  page_id: string;
  type: BlockType;
  content: BlockContent;
  position: number;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface SopDatabase {
  id: string;
  page_id: string;
  company_id: string;
  name: string;
  icon?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PropertyType = 'title' | 'text' | 'number' | 'select' | 'date' | 'checkbox';

export interface PropertyOption {
  value: string;
  color: string;
}

export interface SopDatabaseProperty {
  id: string;
  database_id: string;
  name: string;
  type: PropertyType;
  options?: PropertyOption[];
  position: number;
  created_at: string;
}

export interface SopDatabaseRecord {
  id: string;
  database_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  display_order: number;
}

export interface SopDatabaseCell {
  id: string;
  record_id: string;
  property_id: string;
  value: any; // JSON value based on property type
  created_at: string;
  updated_at: string;
}

export interface SopComment {
  id: string;
  page_id: string;
  block_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  resolved: boolean;
}

export interface SopPageActivity {
  id: string;
  page_id: string;
  user_id: string;
  last_seen_at: string;
}

// UI state types
export interface PresenceUser {
  user_id: string;
  online_at: string;
}
