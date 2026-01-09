export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          curio_points: number
          current_title: string
          current_streak: number
          longest_streak: number
          last_activity_date: string | null
          preferred_ai_provider: 'openai' | 'anthropic'
          daily_curio_streak: number
          longest_daily_streak: number
          last_daily_completion_date: string | null
          curio_club_eligible_until: string | null
          curio_club_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          curio_points?: number
          current_title?: string
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          preferred_ai_provider?: 'openai' | 'anthropic'
          daily_curio_streak?: number
          longest_daily_streak?: number
          last_daily_completion_date?: string | null
          curio_club_eligible_until?: string | null
          curio_club_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          curio_points?: number
          current_title?: string
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          preferred_ai_provider?: 'openai' | 'anthropic'
          daily_curio_streak?: number
          longest_daily_streak?: number
          last_daily_completion_date?: string | null
          curio_club_eligible_until?: string | null
          curio_club_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      backlog_items: {
        Row: {
          id: string
          user_id: string
          topic: string
          description: string | null
          category: string | null
          source: 'instant_curiosity' | 'manual' | 'suggested'
          status: 'pending' | 'in_progress' | 'completed' | 'archived'
          priority: number
          course_id: string | null
          created_at: string
          updated_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          topic: string
          description?: string | null
          category?: string | null
          source: 'instant_curiosity' | 'manual' | 'suggested'
          status?: 'pending' | 'in_progress' | 'completed' | 'archived'
          priority?: number
          course_id?: string | null
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          topic?: string
          description?: string | null
          category?: string | null
          source?: 'instant_curiosity' | 'manual' | 'suggested'
          status?: 'pending' | 'in_progress' | 'completed' | 'archived'
          priority?: number
          course_id?: string | null
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          user_id: string
          backlog_item_id: string | null
          topic: string
          intensity: 'skim' | 'solid' | 'deep'
          time_budget: number
          ai_provider: string
          content: Json
          quiz_questions: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          backlog_item_id?: string | null
          topic: string
          intensity: 'skim' | 'solid' | 'deep'
          time_budget: number
          ai_provider: string
          content: Json
          quiz_questions?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          backlog_item_id?: string | null
          topic?: string
          intensity?: 'skim' | 'solid' | 'deep'
          time_budget?: number
          ai_provider?: string
          content?: Json
          quiz_questions?: Json | null
          created_at?: string
        }
      }
      learning_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          sections_completed: string[]
          current_section: string | null
          time_spent_seconds: number
          quiz_completed: boolean
          quiz_score: number | null
          quiz_attempts: number
          status: 'in_progress' | 'completed'
          started_at: string
          last_accessed_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          sections_completed?: string[]
          current_section?: string | null
          time_spent_seconds?: number
          quiz_completed?: boolean
          quiz_score?: number | null
          quiz_attempts?: number
          status?: 'in_progress' | 'completed'
          started_at?: string
          last_accessed_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          sections_completed?: string[]
          current_section?: string | null
          time_spent_seconds?: number
          quiz_completed?: boolean
          quiz_score?: number | null
          quiz_attempts?: number
          status?: 'in_progress' | 'completed'
          started_at?: string
          last_accessed_at?: string
          completed_at?: string | null
        }
      }
      showcase_topics: {
        Row: {
          id: string
          topic: string
          description: string
          category: string
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          estimated_minutes: number
          display_order: number
          subcategory_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          topic: string
          description: string
          category: string
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          estimated_minutes: number
          display_order: number
          subcategory_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          topic?: string
          description?: string
          category?: string
          difficulty?: 'beginner' | 'intermediate' | 'advanced'
          estimated_minutes?: number
          display_order?: number
          subcategory_id?: string | null
          created_at?: string
        }
      }
      almanac_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          color: string | null
          parent_id: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          color?: string | null
          parent_id?: string | null
          display_order: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          parent_id?: string | null
          display_order?: number
          created_at?: string
        }
      }
      course_catalog: {
        Row: {
          id: string
          topic: string
          slug: string | null
          source: 'almanac' | 'community' | 'generated'
          creator_type: 'system' | 'user'
          creator_id: string | null
          showcase_topic_id: string | null
          depth: 'quick' | 'solid' | 'deep'
          content: Json
          quiz_questions: Json
          description: string | null
          category: string | null
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null
          estimated_minutes: number
          section_count: number
          stars_count: number
          completions_count: number
          avg_quiz_score: number | null
          is_vetted: boolean
          is_featured: boolean
          is_published: boolean
          ai_provider: string | null
          generation_version: number
          schema_version: number
          trust_tier: 'vetted' | 'verified' | 'unverified'
          quiz_difficulty: 'easy' | 'medium' | 'hard'
          created_at: string
          updated_at: string
          published_at: string
        }
        Insert: {
          id?: string
          topic: string
          slug?: string | null
          source: 'almanac' | 'community' | 'generated'
          creator_type?: 'system' | 'user'
          creator_id?: string | null
          showcase_topic_id?: string | null
          depth: 'quick' | 'solid' | 'deep'
          content: Json
          quiz_questions: Json
          description?: string | null
          category?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          estimated_minutes: number
          section_count: number
          stars_count?: number
          completions_count?: number
          avg_quiz_score?: number | null
          is_vetted?: boolean
          is_featured?: boolean
          is_published?: boolean
          ai_provider?: string | null
          generation_version?: number
          schema_version?: number
          trust_tier?: 'vetted' | 'verified' | 'unverified'
          quiz_difficulty?: 'easy' | 'medium' | 'hard'
          created_at?: string
          updated_at?: string
          published_at?: string
        }
        Update: {
          id?: string
          topic?: string
          slug?: string | null
          source?: 'almanac' | 'community' | 'generated'
          creator_type?: 'system' | 'user'
          creator_id?: string | null
          showcase_topic_id?: string | null
          depth?: 'quick' | 'solid' | 'deep'
          content?: Json
          quiz_questions?: Json
          description?: string | null
          category?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          estimated_minutes?: number
          section_count?: number
          stars_count?: number
          completions_count?: number
          avg_quiz_score?: number | null
          is_vetted?: boolean
          is_featured?: boolean
          is_published?: boolean
          ai_provider?: string | null
          generation_version?: number
          schema_version?: number
          trust_tier?: 'vetted' | 'verified' | 'unverified'
          quiz_difficulty?: 'easy' | 'medium' | 'hard'
          created_at?: string
          updated_at?: string
          published_at?: string
        }
      }
      course_stars: {
        Row: {
          id: string
          user_id: string
          course_id: string
          starred_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          starred_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          starred_at?: string
        }
      }
      user_course_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          sections_completed: string[]
          current_section: string | null
          time_spent_seconds: number
          quiz_completed: boolean
          quiz_score: number | null
          quiz_attempts: number
          quiz_answers: Json | null
          status: 'in_progress' | 'completed'
          started_at: string
          last_accessed_at: string
          completed_at: string | null
          chat_state: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          sections_completed?: string[]
          current_section?: string | null
          time_spent_seconds?: number
          quiz_completed?: boolean
          quiz_score?: number | null
          quiz_attempts?: number
          quiz_answers?: Json | null
          status?: 'in_progress' | 'completed'
          started_at?: string
          last_accessed_at?: string
          completed_at?: string | null
          chat_state?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          sections_completed?: string[]
          current_section?: string | null
          time_spent_seconds?: number
          quiz_completed?: boolean
          quiz_score?: number | null
          quiz_attempts?: number
          quiz_answers?: Json | null
          status?: 'in_progress' | 'completed'
          started_at?: string
          last_accessed_at?: string
          completed_at?: string | null
          chat_state?: string | null
        }
      }
      daily_topics: {
        Row: {
          id: string
          date: string
          topic: string
          description: string | null
          category: string | null
          ai_provider: string
          generated_at: string
        }
        Insert: {
          id?: string
          date: string
          topic: string
          description?: string | null
          category?: string | null
          ai_provider: string
          generated_at?: string
        }
        Update: {
          id?: string
          date?: string
          topic?: string
          description?: string | null
          category?: string | null
          ai_provider?: string
          generated_at?: string
        }
      }
      daily_courses: {
        Row: {
          id: string
          daily_topic_id: string
          date: string
          content: Json
          quiz_questions: Json
          intensity: 'skim'
          time_budget: number
          created_at: string
        }
        Insert: {
          id?: string
          daily_topic_id: string
          date: string
          content: Json
          quiz_questions: Json
          intensity?: 'skim'
          time_budget?: number
          created_at?: string
        }
        Update: {
          id?: string
          daily_topic_id?: string
          date?: string
          content?: Json
          quiz_questions?: Json
          intensity?: 'skim'
          time_budget?: number
          created_at?: string
        }
      }
      daily_completions: {
        Row: {
          id: string
          user_id: string
          daily_course_id: string
          date: string
          quiz_answers: Json | null
          quiz_score: number | null
          unlocked: boolean
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          daily_course_id: string
          date: string
          quiz_answers?: Json | null
          quiz_score?: number | null
          unlocked?: boolean
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          daily_course_id?: string
          date?: string
          quiz_answers?: Json | null
          quiz_score?: number | null
          unlocked?: boolean
          started_at?: string
          completed_at?: string | null
        }
      }
      curio_circles: {
        Row: {
          id: string
          name: string
          description: string | null
          invite_code: string
          created_by: string
          max_members: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          invite_code: string
          created_by: string
          max_members?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          invite_code?: string
          created_by?: string
          max_members?: number
          created_at?: string
        }
      }
      curio_circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      curio_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          mcurio_delta: number
          breakdown: Json
          course_id: string | null
          quiz_attempt: number | null
          topic_key: string | null
          idempotency_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          mcurio_delta: number
          breakdown: Json
          course_id?: string | null
          quiz_attempt?: number | null
          topic_key?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          mcurio_delta?: number
          breakdown?: Json
          course_id?: string | null
          quiz_attempt?: number | null
          topic_key?: string | null
          idempotency_key?: string | null
          created_at?: string
        }
      }
      daily_checkins: {
        Row: {
          id: string
          user_id: string
          date_utc: string
          mcurio_awarded: number
          trigger_action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date_utc: string
          mcurio_awarded: number
          trigger_action: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date_utc?: string
          mcurio_awarded?: number
          trigger_action?: string
          created_at?: string
        }
      }
      monthly_snapshots: {
        Row: {
          id: string
          year: number
          month: number
          user_id: string
          total_mcurio: number
          quiz_passes: number
          rank: number | null
          percentile: number | null
          is_eligible: boolean
          is_curio_club: boolean
          snapshot_at: string
        }
        Insert: {
          id?: string
          year: number
          month: number
          user_id: string
          total_mcurio: number
          quiz_passes?: number
          rank?: number | null
          percentile?: number | null
          is_eligible?: boolean
          is_curio_club?: boolean
          snapshot_at?: string
        }
        Update: {
          id?: string
          year?: number
          month?: number
          user_id?: string
          total_mcurio?: number
          quiz_passes?: number
          rank?: number | null
          percentile?: number | null
          is_eligible?: boolean
          is_curio_club?: boolean
          snapshot_at?: string
        }
      }
      eli5_submissions: {
        Row: {
          id: string
          user_id: string
          course_id: string
          concepts: Json
          passed: boolean
          mcurio_awarded: number
          month_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          concepts: Json
          passed: boolean
          mcurio_awarded?: number
          month_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          concepts?: Json
          passed?: boolean
          mcurio_awarded?: number
          month_key?: string
          created_at?: string
        }
      }
      topic_completions: {
        Row: {
          id: string
          user_id: string
          topic_key: string
          month_key: string
          completion_count: number
          last_completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_key: string
          month_key: string
          completion_count?: number
          last_completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_key?: string
          month_key?: string
          completion_count?: number
          last_completed_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_user_curio: {
        Args: {
          p_user_id: string
          p_curio_amount: number
        }
        Returns: {
          new_curio: number
          new_title: string
          title_upgraded: boolean
        }[]
      }
      submit_daily_quiz: {
        Args: {
          p_user_id: string
          p_daily_course_id: string
          p_quiz_answers: Json
          p_quiz_score: number
        }
        Returns: {
          success: boolean
          unlocked: boolean
          new_streak: number
          curio_earned: number
        }[]
      }
      get_user_monthly_curio: {
        Args: {
          p_user_id: string
          p_year?: number
          p_month?: number
        }
        Returns: number
      }
      get_monthly_leaderboard: {
        Args: {
          p_limit?: number
          p_year?: number
          p_month?: number
        }
        Returns: {
          rank: number
          user_id: string
          display_name: string
          avatar_url: string
          monthly_curio: number
          current_title: string
        }[]
      }
      get_user_leaderboard_position: {
        Args: {
          p_user_id: string
          p_year?: number
          p_month?: number
        }
        Returns: {
          rank: number
          total_users: number
          percentile: number
          monthly_curio: number
        }[]
      }
      get_circle_leaderboard: {
        Args: {
          p_circle_id: string
          p_year?: number
          p_month?: number
        }
        Returns: {
          rank: number
          user_id: string
          display_name: string
          avatar_url: string
          monthly_curio: number
          current_title: string
          role: string
        }[]
      }
      generate_invite_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
