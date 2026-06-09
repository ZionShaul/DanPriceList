// ===== טיפוסים משותפים למערכת מחירון משקי דן =====

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "blocked";
export type UploadStatus = "draft" | "published" | "historical";
export type MaterialStatus = "active" | "inactive";

export interface Organization {
  id: string;
  name: string;
  excel_client_name: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Profile {
  id: string; // = auth.users.id
  full_name: string;
  phone: string;
  email: string;
  organization_id: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface ProfileWithOrg extends Profile {
  organization: Pick<Organization, "id" | "name"> | null;
}

export interface MonthlyUpload {
  id: string;
  file_name: string;
  title: string | null;
  storage_path: string | null;
  status: UploadStatus;
  uploaded_by: string | null;
  uploaded_at: string;
  published_at: string | null;
  // ספירות סיכום טעינה (סעיף 11.3)
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  organizations_count: number;
  materials_count: number;
  unmapped_count: number;
}

export interface PurchaseRow {
  id: string;
  upload_id: string;
  organization_id: string | null;
  supplier: string | null;
  sku: string | null;
  product_description: string;
  material_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string | null;
  invoice_number: string | null;
}

export interface RejectedRow {
  id: string;
  upload_id: string;
  reason: string;
  raw_data: Record<string, unknown>;
}

export interface MaterialCatalog {
  id: string;
  canonical_name: string;
  status: MaterialStatus;
  created_at: string;
  updated_at: string;
}

export interface MaterialAlias {
  id: string;
  material_id: string;
  alias_name: string;
  sku: string | null;
}

export interface SystemSettings {
  id: number;
  clicksense_url: string | null;
  clicksense_enabled: boolean;
}

// ===== טיפוסים מחושבים (RPC) =====

/** שורת מחיר מצרפית לחומר – נמוך / ממוצע משוקלל / גבוה (סעיף 9) */
export interface MaterialPrice {
  material_key: string; // material_id או 'desc:<תיאור>' לחומר לא ממופה
  material_id: string | null;
  display_name: string;
  sku: string | null;
  is_mapped: boolean;
  low_price: number;
  high_price: number;
  weighted_avg: number;
  purchase_count: number;
  total_quantity: number;
}

/** הצעת חיפוש */
export interface SearchSuggestion {
  material_key: string;
  display_name: string;
  is_mapped: boolean;
}
