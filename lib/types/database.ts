// Database types for Supabase tables

export interface Profile {
  id: string
  display_name: string
  email: string
  bio: string | null
  tagline: string | null
  role_state: 'available' | 'requesting' | 'offline' | null
  tags: string[] | null
  avatar_url: string | null
  user_role: 'person_in_recovery' | 'professional' | 'ally' | null
  is_admin: boolean | null
  last_heartbeat_at: string | null
  always_available: boolean
  created_at?: string
  updated_at?: string
}

export interface Session {
  id: string
  listener_id: string
  seeker_id: string
  status: 'active' | 'ended'
  started_at: string
  ended_at: string | null
  created_at?: string
  updated_at?: string
}

export interface SessionWithUserName extends Session {
  otherUserName: string
}

export interface ChatMessage {
  id: string
  session_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string | null
  reported_user_id: string | null
  session_id: string | null
  reason: string
  description: string | null
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
}

export interface UserBlock {
  id: string
  user_id: string
  blocked_by: string | null
  reason: string
  block_type: 'temporary' | 'permanent'
  blocked_at: string
  expires_at: string | null
  is_active: boolean
  notes: string | null
}

export interface AdminLog {
  id: string
  admin_id: string | null
  action_type: string
  target_user_id: string | null
  target_session_id: string | null
  target_report_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  created_at: string
}

// Type for profile update operations
export interface ProfileUpdateData {
  role_state?: Profile['role_state']
  last_heartbeat_at?: string
  display_name?: string
  bio?: string
  tagline?: string
  avatar_url?: string
  tags?: string[]
  user_role?: Profile['user_role']
}

// Database schema types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<ProfileUpdateData>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>
      }
      messages: {
        Row: ChatMessage
        Insert: Omit<ChatMessage, 'id' | 'created_at'>
        Update: Partial<Omit<ChatMessage, 'id' | 'created_at'>>
      }
      reports: {
        Row: Report
        Insert: Omit<Report, 'id' | 'created_at'>
        Update: Partial<Omit<Report, 'id' | 'created_at'>>
      }
      user_blocks: {
        Row: UserBlock
        Insert: Omit<UserBlock, 'id' | 'blocked_at'>
        Update: Partial<Omit<UserBlock, 'id' | 'blocked_at'>>
      }
      admin_logs: {
        Row: AdminLog
        Insert: Omit<AdminLog, 'id' | 'created_at'>
        Update: Partial<Omit<AdminLog, 'id' | 'created_at'>>
      }
      push_subscriptions: {
        Row: PushSubscription
        Insert: Omit<PushSubscription, 'id' | 'created_at'>
        Update: Partial<Omit<PushSubscription, 'id' | 'created_at'>>
      }
    }
  }
}
