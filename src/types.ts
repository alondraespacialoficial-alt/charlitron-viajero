export interface Story {
  id: string;
  title: string;
  description: string;
  fullNarrative: string;
  year: string;
  category: string;
  thumbnail: string;
  videoUrl: string;
  audioUrl?: string;
  mapsUrl?: string;
  likes?: number;
  gallery: string[];
  isPrivate?: boolean;
  isVideoVertical?: boolean;
  password?: string;
  expires_at?: string;
  slug?: string; // URL-friendly identifier (e.g., "la-bodega-el-pasado-1920")
  historian_id?: string;
  historian_name?: string;
  historian_photo?: string;
}

export interface Historian {
  id: string;
  name: string;
  bio: string;
  photo: string;
  specialty: string;
  books: { title: string; url: string; cover?: string }[];
  contact_link?: string;
  social_link?: string;
  created_at?: string;
}

export interface RestoredPhoto {
  id: string;
  title: string;
  url: string;
  place?: string;
  era?: string;
  intervention_type?: string;
  description?: string;
  category?: string;
  is_vertical?: boolean;
  created_at?: string;
  images?: { url: string; title: string; is_vertical?: boolean }[];
}

export interface TravelPhoto {
  id: string;
  url: string;
  character_name: string;
  year?: string;
  description?: string;
  external_link?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  image_url: string;
  is_sold_out: boolean;
  category?: string;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  is_active: boolean;
  created_at?: string;
}

// ==========================================
// TIPOS PARA MURAL DE ENCUENTROS
// ==========================================
export interface MuralPhoto {
  id: string;
  person_name: string;
  encounter_text?: string;
  photo_url: string;
  is_vertical?: boolean;
  display_order?: number;
  created_at?: string;
}

// ==========================================
// TIPOS PARA CONCURSOS
// ==========================================
export interface Contest {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  question: string;
  is_active: boolean;
  winner_name?: string;
  winner_code_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContestAnswer {
  id: string;
  contest_id: string;
  answer_text: string;
  is_correct: boolean;
  answer_order: number;
  created_at?: string;
}

export interface ContestParticipation {
  id: string;
  contest_id: string;
  user_session_id: string;
  selected_answer_id: string;
  is_correct: boolean;
  created_at?: string;
}

export interface ContestCode {
  id: string;
  contest_id: string;
  code: string;
  is_used: boolean;
  used_by_session?: string;
  used_at?: string;
  created_at?: string;
}

export interface ContestWinner {
  id: string;
  contest_id: string;
  user_session_id: string;
  code_id: string;
  user_name?: string;
  shared_on_social: boolean;
  created_at?: string;
}

// ==========================================
// TIPOS PARA COLABORADORES
// ==========================================
export interface Collaborator {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface PendingStory {
  id: string;
  collaborator_id?: string;
  collaborator_name?: string;
  historian_id?: string;
  historian_name?: string;
  historian_photo?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  title: string;
  description?: string;
  full_narrative?: string;
  year?: string;
  category?: string;
  thumbnail?: string;
  video_url?: string;
  audio_url?: string;
  maps_url?: string;
  gallery?: string[];
  is_private?: boolean;
  is_video_vertical?: boolean;
  expires_at?: string;
  created_at?: string;
  reviewed_at?: string;
}

// ==========================================
// TIPOS PARA AVATARES INTERACTIVOS
// ==========================================
export interface Avatar {
  id: string;
  slug: string;
  label: string;
  description?: string;
  emoji: string;
  image_url?: string;
  pub_key: string;
  access_code?: string | null;
  is_private?: boolean;
  private_client_label?: string | null;
  is_active: boolean;
  order_index: number;
  era?: string;           // Período histórico (ej: 'Virreinato', 'Revolución')
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// TIPOS PARA JARDÍN DE LA MEMORIA
// ==========================================
export type MemorialVisibility = 'public' | 'shareable' | 'private';

export interface Memorial {
  id: string;
  slug: string;
  full_name: string;
  family_label?: string | null;
  photo_url?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  epitaph?: string | null;
  bio_short?: string | null;
  visibility: MemorialVisibility;
  access_code?: string | null;
  story_id?: string | null;
  family_member_id?: string | null;
  tribute_song_url?: string | null;
  spotify_link?: string | null;
  requires_approval: boolean;
  client_name?: string | null;
  client_contact?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MemorialGestureType = 'flower_rose' | 'flower_lily' | 'flower_sunflower' | 'flower_daisy' | 'candle';

export interface MemorialGesture {
  id: string;
  memorial_id: string;
  gesture_type: MemorialGestureType;
  visitor_name?: string | null;
  created_at?: string;
}

export interface MemorialGuestbookEntry {
  id: string;
  memorial_id: string;
  visitor_name: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}


// ==========================================
// TIPOS PARA CONFERENCIAS Y BOLETOS
// ==========================================
export interface Conference {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  event_date?: string;
  location?: string;
  price: number;
  capacity: number;
  is_active: boolean;
  notes?: string;
  speaker_name?: string;
  speaker_name_2?: string;
  logo_url?: string;
  certificate_bg_url?: string;
  signature_url?: string;
  duration_hours?: number;
  federation_legend?: string;
  promo_badge?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConferenceTicket {
  id: string;
  conference_id: string;
  folio: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_notes?: string;
  paid_at?: string;
  collaborator_id?: string;
  collaborator_name?: string;
  registered_by?: 'client' | 'collaborator';
  collaborator_paid_at?: string;
  created_at?: string;
}

// ==========================================
// TIPOS PARA CURSOS
// ==========================================
export interface Course {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  price: number;
  is_active: boolean;
  order_index?: number;
  collaborator_code?: string;
  instructor_share?: number;
  instructor_name?: string;
  duration_text?: string;
  level?: 'basico' | 'intermedio' | 'avanzado';
  what_you_learn?: string;
  certificate_bg_url?: string;
  logo_url?: string;
  signature_url?: string;
  federation_legend?: string;
  pending_review?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url?: string;
  audio_url?: string;
  pdf_url?: string;
  images?: string[];
  text_content?: string;
  order_index: number;
  is_free_preview: boolean;
  created_at?: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  status: 'pending' | 'paid' | 'cancelled';
  access_code?: string;
  payment_notes?: string;
  paid_at?: string;
  collab_paid?: boolean;     // Admin marcó que ya le pagó al colaborador
  collab_paid_at?: string;   // Fecha en que se registró ese pago
  created_at?: string;
}

export interface CourseQuestion {
  id: string;
  course_id: string;
  lesson_id?: string;
  enrollment_id?: string;
  student_name: string;
  question_text: string;
  answer_text?: string;
  answered_by?: string;
  answered_at?: string;
  created_at?: string;
}
