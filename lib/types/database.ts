export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          bio: string | null
          profile_icon: string | null
          role_state_os: string | null
          is_suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          bio?: string | null
          profile_icon?: string | null
          role_state_os?: string | null
          is_suspended?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          bio?: string | null
          profile_icon?: string | null
          role_state_os?: string | null
          is_suspended?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
