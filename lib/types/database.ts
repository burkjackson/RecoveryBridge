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
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  quiet_hours_timezone: string
  phone_number: string | null
  sms_notifications_enabled: boolean
  email_notifications_enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface Session {
  id: string
  listener_id: string
  seeker_id: string
  status: 'active' | 'ended'
  ended_at: string | null
  created_at: string
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
  read_at: string | null
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
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  created_at: string
}

export interface SessionFeedback {
  id: string
  session_id: string
  from_user_id: string
  to_user_id: string
  helpful: boolean
  created_at: string
}

export interface UserFavorite {
  id: string
  user_id: string
  favorite_user_id: string
  created_at: string
}

export interface FavoriteWithProfile extends UserFavorite {
  favorite_profile: {
    display_name: string
    bio: string | null
    tagline: string | null
    avatar_url: string | null
    role_state: 'available' | 'requesting' | 'offline' | null
    always_available: boolean
    last_heartbeat_at: string | null
    tags: string[] | null
    user_role: string | null
  }
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  reaction: 'heart' | 'hug' | 'pray' | 'strong' | 'sparkles' | 'thumbsup' | 'clap' | 'blue_heart'
  created_at: string
}

// Type for profile update operations
export interface ProfileUpdateData {
  role_state?: Profile['role_state']
  last_heartbeat_at?: string
  always_available?: boolean
  quiet_hours_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  quiet_hours_timezone?: string
  phone_number?: string | null
  sms_notifications_enabled?: boolean
  email_notifications_enabled?: boolean
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
      session_feedback: {
        Row: SessionFeedback
        Insert: Omit<SessionFeedback, 'id' | 'created_at'>
        Update: Partial<Omit<SessionFeedback, 'id' | 'created_at'>>
      }
      user_favorites: {
        Row: UserFavorite
        Insert: Omit<UserFavorite, 'id' | 'created_at'>
        Update: never
      }
      message_reactions: {
        Row: MessageReaction
        Insert: Omit<MessageReaction, 'id' | 'created_at'>
        Update: Partial<Omit<MessageReaction, 'id' | 'created_at'>>
      }
    }
  }
}
