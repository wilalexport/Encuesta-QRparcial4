// types/database.types.ts
// Definición completa de tipos que reflejan el esquema de Supabase

export type UserRole = 'admin' | 'creator' | 'viewer';

export type SurveyStatus = 'draft' | 'published' | 'closed';

export type QuestionType = 'single' | 'multiple' | 'likert' | 'text';

export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole | null;
  phone: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: number;
  user_id: string;
  role: UserRole;
  assigned_at: string;
  assigned_by: string | null;
}

export interface Survey {
  id: number;
  owner_id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  public_slug: string;
  slug: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: number;
  survey_id: number;
  type: QuestionType;
  question_text: string;
  required: boolean;
  order_index: number;
  options: Record<string, any> | null; // Campo JSON para configuraciones internas
  created_at: string;
}

export interface SurveyOption {
  id: number;
  question_id: number;
  label: string;
  value: string;
  order_index: number;
  created_at: string;
}

export interface Response {
  id: number;
  survey_id: number;
  user_id: string | null; // null para respuestas anónimas
  submitted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ResponseItem {
  id: number;
  response_id: number;
  question_id: number;
  value_text: string | null;
  value_numeric: number | null;
  value_json: Record<string, any> | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action: 'create' | 'publish' | 'update' | 'delete';
  table_name: string;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

// Tipos extendidos para vistas con joins

export interface SurveyWithOwner extends Survey {
  owner?: Profile;
  questions_count?: number;
  responses_count?: number;
}

export interface QuestionWithOptions extends SurveyQuestion {
  options_list?: SurveyOption[];
}

export interface ResponseWithItems extends Response {
  items?: ResponseItem[];
  survey?: Survey;
}

// Tipos para formularios y creación

export interface CreateSurveyDTO {
  title: string;
  description?: string;
  status?: SurveyStatus;
}

export interface CreateQuestionDTO {
  survey_id: number;
  type: QuestionType;
  question_text: string;
  required: boolean;
  order_index: number;
  options?: Record<string, any>;
}

export interface CreateOptionDTO {
  question_id: number;
  label: string;
  value: string;
  order_index: number;
}

export interface SubmitResponseDTO {
  survey_id: number;
  user_id?: string | null;
  items: {
    question_id: number;
    value_text?: string;
    value_numeric?: number;
    value_json?: Record<string, any>;
  }[];
}

// Tipos para el contexto de autenticación

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
  roles: UserRole[];
  isAdmin: boolean;
  isCreator: boolean;
  isViewer: boolean;
}

// Tipos para KPIs del Dashboard

export interface DashboardStats {
  total_surveys: number;
  total_responses: number;
  active_surveys: number;
  recent_responses: number;
}

export interface RecentActivity {
  id: number;
  survey_id: number;
  survey_title: string;
  action: string;
  timestamp: string;
  user_name: string;
}
