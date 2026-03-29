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
