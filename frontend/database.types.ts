export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_type: string | null
          created_at: string | null
          description: string | null
          id: string
          profile_id: string | null
          title: string
          updated_at: string | null
          url: string | null
          year: number | null
        }
        Insert: {
          achievement_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
          year?: number | null
        }
        Update: {
          achievement_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarked_jobs: {
        Row: {
          created_at: string
          id: number
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarked_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string | null
          id: string
          recipient_id: string | null
          requester_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipient_id?: string | null
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recipient_id?: string | null
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_approvals: {
        Row: {
          content_data: Json | null
          content_type: string
          created_at: string | null
          creator_id: string
          id: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
        }
        Insert: {
          content_data?: Json | null
          content_type: string
          created_at?: string | null
          creator_id: string
          id?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
        }
        Update: {
          content_data?: Json | null
          content_type?: string
          created_at?: string | null
          creator_id?: string
          id?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_approvals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_approvals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          moderator_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          moderator_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          moderator_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_moderation_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_moderation_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      education_history: {
        Row: {
          created_at: string | null
          degree_type: string
          gpa: number | null
          graduation_year: number | null
          honors: string | null
          id: string
          institution_name: string
          major: string | null
          notable_achievements: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          degree_type: string
          gpa?: number | null
          graduation_year?: number | null
          honors?: string | null
          id?: string
          institution_name: string
          major?: string | null
          notable_achievements?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          degree_type?: string
          gpa?: number | null
          graduation_year?: number | null
          honors?: string | null
          id?: string
          institution_name?: string
          major?: string | null
          notable_achievements?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "education_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          attendee_id: string | null
          check_in_time: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendee_id?: string | null
          check_in_time?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendee_id?: string | null
          check_in_time?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_attendees_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          comments: string | null
          event_id: string | null
          id: string
          rating: number | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          comments?: string | null
          event_id?: string | null
          id?: string
          rating?: number | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          comments?: string | null
          event_id?: string | null
          id?: string
          rating?: number | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          attendance_status: string | null
          created_at: string
          event_id: string
          id: string
          user_id: string
          wants_to_volunteer: boolean
        }
        Insert: {
          attendance_status?: string | null
          created_at?: string
          event_id: string
          id?: string
          user_id: string
          wants_to_volunteer?: boolean
        }
        Update: {
          attendance_status?: string | null
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
          wants_to_volunteer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          agenda: string | null
          category: string
          cost: string | null
          created_at: string
          created_by: string | null
          creator_id: string | null
          description: string
          end_date: string
          event_type: string | null
          featured_image_url: string | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          is_published: boolean | null
          is_virtual: boolean | null
          location: string | null
          max_attendees: number | null
          organizer_id: string
          registration_deadline: string | null
          registration_url: string | null
          reminder_sent: boolean | null
          slug: string | null
          sponsors: string | null
          start_date: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          virtual_link: string | null
          virtual_meeting_link: string | null
        }
        Insert: {
          agenda?: string | null
          category?: string
          cost?: string | null
          created_at?: string
          created_by?: string | null
          creator_id?: string | null
          description: string
          end_date: string
          event_type?: string | null
          featured_image_url?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_published?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          max_attendees?: number | null
          organizer_id: string
          registration_deadline?: string | null
          registration_url?: string | null
          reminder_sent?: boolean | null
          slug?: string | null
          sponsors?: string | null
          start_date: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          virtual_link?: string | null
          virtual_meeting_link?: string | null
        }
        Update: {
          agenda?: string | null
          category?: string
          cost?: string | null
          created_at?: string
          created_by?: string | null
          creator_id?: string | null
          description?: string
          end_date?: string
          event_type?: string | null
          featured_image_url?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_published?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          max_attendees?: number | null
          organizer_id?: string
          registration_deadline?: string | null
          registration_url?: string | null
          reminder_sent?: boolean | null
          slug?: string | null
          sponsors?: string | null
          start_date?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          virtual_link?: string | null
          virtual_meeting_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          parent_post_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          parent_post_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          parent_post_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          group_avatar_url: string | null
          id: string
          is_private: boolean
          name: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          group_avatar_url?: string | null
          id?: string
          is_private?: boolean
          name: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          group_avatar_url?: string | null
          id?: string
          is_private?: boolean
          name?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_alerts: {
        Row: {
          alert_name: string
          created_at: string | null
          enabled: boolean | null
          frequency: string | null
          id: string
          industries: string[] | null
          job_titles: string[] | null
          job_types: string[] | null
          keywords: string[] | null
          locations: string[] | null
          min_salary: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_name: string
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          industries?: string[] | null
          job_titles?: string[] | null
          job_types?: string[] | null
          keywords?: string[] | null
          locations?: string[] | null
          min_salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_name?: string
          created_at?: string | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          industries?: string[] | null
          job_titles?: string[] | null
          job_types?: string[] | null
          keywords?: string[] | null
          locations?: string[] | null
          min_salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string | null
          cover_letter: string | null
          created_at: string | null
          id: string
          job_id: string | null
          resume_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id?: string | null
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string | null
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_bookmarks: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          application_url: string | null
          company_name: string
          contact_email: string | null
          created_at: string | null
          creator_id: string | null
          description: string
          expires_at: string | null
          id: string
          is_published: boolean | null
          is_remote: boolean | null
          job_type: string | null
          location: string | null
          salary_max: number | null
          salary_min: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_url?: string | null
          company_name: string
          contact_email?: string | null
          created_at?: string | null
          creator_id?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_url?: string | null
          company_name?: string
          contact_email?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          is_remote?: boolean | null
          job_type?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_listings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "job_listings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_instructions: string | null
          application_url: string | null
          apply_url: string | null
          company_id: string | null
          company_name: string
          contact_email: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          education_level: string | null
          education_required: string | null
          experience_required: string | null
          expires_at: string | null
          external_url: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_verified: boolean
          job_type: string | null
          location: string | null
          posted_by: string | null
          required_skills: string | null
          requirements: string | null
          salary_range: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          application_instructions?: string | null
          application_url?: string | null
          apply_url?: string | null
          company_id?: string | null
          company_name: string
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          education_level?: string | null
          education_required?: string | null
          experience_required?: string | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean
          job_type?: string | null
          location?: string | null
          posted_by?: string | null
          required_skills?: string | null
          requirements?: string | null
          salary_range?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          application_instructions?: string | null
          application_url?: string | null
          apply_url?: string | null
          company_id?: string | null
          company_name?: string
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          education_level?: string | null
          education_required?: string | null
          experience_required?: string | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean
          job_type?: string | null
          location?: string | null
          posted_by?: string | null
          required_skills?: string | null
          requirements?: string | null
          salary_range?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentee_profiles: {
        Row: {
          areas_seeking_mentorship: string[] | null
          career_goals: string | null
          created_at: string | null
          id: string
          preferred_communication_method: string[] | null
          preferred_mentor_characteristics: string[] | null
          specific_skills_to_develop: string[] | null
          statement_of_expectations: string | null
          time_commitment_available: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          areas_seeking_mentorship?: string[] | null
          career_goals?: string | null
          created_at?: string | null
          id?: string
          preferred_communication_method?: string[] | null
          preferred_mentor_characteristics?: string[] | null
          specific_skills_to_develop?: string[] | null
          statement_of_expectations?: string | null
          time_commitment_available?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          areas_seeking_mentorship?: string[] | null
          career_goals?: string | null
          created_at?: string | null
          id?: string
          preferred_communication_method?: string[] | null
          preferred_mentor_characteristics?: string[] | null
          specific_skills_to_develop?: string[] | null
          statement_of_expectations?: string | null
          time_commitment_available?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentees: {
        Row: {
          career_goals: string | null
          created_at: string | null
          id: string
          preferred_industry: string[] | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          career_goals?: string | null
          created_at?: string | null
          id?: string
          preferred_industry?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          career_goals?: string | null
          created_at?: string | null
          id?: string
          preferred_industry?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_booked: boolean | null
          mentor_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_booked?: boolean | null
          mentor_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          is_booked?: boolean | null
          mentor_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          areas_of_expertise: string[] | null
          created_at: string | null
          id: string
          is_accepting_mentees: boolean | null
          max_mentees: number | null
          mentoring_capacity_hours: number | null
          mentoring_experience: string | null
          mentoring_preferences: string | null
          mentoring_statement: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          areas_of_expertise?: string[] | null
          created_at?: string | null
          id?: string
          is_accepting_mentees?: boolean | null
          max_mentees?: number | null
          mentoring_capacity_hours?: number | null
          mentoring_experience?: string | null
          mentoring_preferences?: string | null
          mentoring_statement?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          areas_of_expertise?: string[] | null
          created_at?: string | null
          id?: string
          is_accepting_mentees?: boolean | null
          max_mentees?: number | null
          mentoring_capacity_hours?: number | null
          mentoring_experience?: string | null
          mentoring_preferences?: string | null
          mentoring_statement?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          created_at: string | null
          expertise: string[] | null
          id: string
          max_mentees: number | null
          mentoring_capacity_hours_per_month: number | null
          mentoring_experience_description: string | null
          mentoring_experience_years: number | null
          mentoring_preferences: Json | null
          mentoring_statement: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expertise?: string[] | null
          id?: string
          max_mentees?: number | null
          mentoring_capacity_hours_per_month?: number | null
          mentoring_experience_description?: string | null
          mentoring_experience_years?: number | null
          mentoring_preferences?: Json | null
          mentoring_statement?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expertise?: string[] | null
          id?: string
          max_mentees?: number | null
          mentoring_capacity_hours_per_month?: number | null
          mentoring_experience_description?: string | null
          mentoring_experience_years?: number | null
          mentoring_preferences?: Json | null
          mentoring_statement?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_appointments: {
        Row: {
          availability_id: string | null
          created_at: string | null
          feedback_provided: boolean | null
          id: string
          mentee_id: string | null
          notes: string | null
          status: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          availability_id?: string | null
          created_at?: string | null
          feedback_provided?: boolean | null
          id?: string
          mentee_id?: string | null
          notes?: string | null
          status?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          availability_id?: string | null
          created_at?: string | null
          feedback_provided?: boolean | null
          id?: string
          mentee_id?: string | null
          notes?: string | null
          status?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_appointments_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "mentor_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_appointments_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "mentees"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_programs: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentorship_relationships: {
        Row: {
          created_at: string | null
          id: string
          mentee_id: string | null
          mentor_id: string | null
          program_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentee_id?: string | null
          mentor_id?: string | null
          program_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentee_id?: string | null
          mentor_id?: string | null
          program_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_relationships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentorship_relationships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentorship_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relationships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "mentorship_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          created_at: string | null
          goals: string | null
          id: string
          mentee_id: string | null
          mentor_id: string | null
          message: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          goals?: string | null
          id?: string
          mentee_id?: string | null
          mentor_id?: string | null
          message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          goals?: string | null
          id?: string
          mentee_id?: string | null
          mentor_id?: string | null
          message?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorships: {
        Row: {
          created_at: string
          goals: string | null
          id: string
          mentee_id: string
          mentor_id: string
          status: string
        }
        Insert: {
          created_at?: string
          goals?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          status?: string
        }
        Update: {
          created_at?: string
          goals?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networking_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "networking_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_groups: {
        Row: {
          admin_user_ids: string[] | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          type: string | null
          visibility: string | null
        }
        Insert: {
          admin_user_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          type?: string | null
          visibility?: string | null
        }
        Update: {
          admin_user_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          type?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          profile_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          profile_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          profile_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          account_type: string | null
          achievements: string[] | null
          alumni_verification_status: string | null
          avatar_url: string | null
          batch_year: number | null
          bio: string | null
          biography: string | null
          company: string | null
          company_name: string | null
          company_website: string | null
          created_at: string | null
          current_company: string | null
          current_job_title: string | null
          current_location: string | null
          current_position: string | null
          date_of_birth: string | null
          degree: string | null
          degree_program: string | null
          department: string | null
          email: string
          experience: string | null
          first_name: string | null
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          headline: string | null
          id: string
          industry: string | null
          interests: string[] | null
          is_admin: boolean | null
          is_available_for_mentorship: boolean | null
          is_employer: boolean | null
          is_mentor: boolean | null
          is_online: boolean | null
          is_verified: boolean | null
          job_title: string | null
          languages: string[] | null
          last_name: string | null
          last_seen: string | null
          linkedin_url: string | null
          location: string | null
          major: string | null
          major_specialization: string | null
          mentee_status: string | null
          mentor_availability: string | null
          mentor_status: string | null
          mentor_topics: string[] | null
          mentorship_topics: string[] | null
          phone: string | null
          phone_number: string | null
          privacy_level: string | null
          resume_url: string | null
          role: string | null
          skills: string[] | null
          social_links: Json | null
          specialization: string | null
          student_id: string | null
          twitter_url: string | null
          updated_at: string | null
          username: string | null
          verification_document_url: string | null
          verification_notes: string | null
          verification_reviewed_at: string | null
          verification_reviewed_by: string | null
          verified: boolean
          wants_job_alerts: boolean | null
          website: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          about?: string | null
          account_type?: string | null
          achievements?: string[] | null
          alumni_verification_status?: string | null
          avatar_url?: string | null
          batch_year?: number | null
          bio?: string | null
          biography?: string | null
          company?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          current_company?: string | null
          current_job_title?: string | null
          current_location?: string | null
          current_position?: string | null
          date_of_birth?: string | null
          degree?: string | null
          degree_program?: string | null
          department?: string | null
          email: string
          experience?: string | null
          first_name?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          headline?: string | null
          id: string
          industry?: string | null
          interests?: string[] | null
          is_admin?: boolean | null
          is_available_for_mentorship?: boolean | null
          is_employer?: boolean | null
          is_mentor?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          last_seen?: string | null
          linkedin_url?: string | null
          location?: string | null
          major?: string | null
          major_specialization?: string | null
          mentee_status?: string | null
          mentor_availability?: string | null
          mentor_status?: string | null
          mentor_topics?: string[] | null
          mentorship_topics?: string[] | null
          phone?: string | null
          phone_number?: string | null
          privacy_level?: string | null
          resume_url?: string | null
          role?: string | null
          skills?: string[] | null
          social_links?: Json | null
          specialization?: string | null
          student_id?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string | null
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verified?: boolean
          wants_job_alerts?: boolean | null
          website?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          about?: string | null
          account_type?: string | null
          achievements?: string[] | null
          alumni_verification_status?: string | null
          avatar_url?: string | null
          batch_year?: number | null
          bio?: string | null
          biography?: string | null
          company?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          current_company?: string | null
          current_job_title?: string | null
          current_location?: string | null
          current_position?: string | null
          date_of_birth?: string | null
          degree?: string | null
          degree_program?: string | null
          department?: string | null
          email?: string
          experience?: string | null
          first_name?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          headline?: string | null
          id?: string
          industry?: string | null
          interests?: string[] | null
          is_admin?: boolean | null
          is_available_for_mentorship?: boolean | null
          is_employer?: boolean | null
          is_mentor?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          last_seen?: string | null
          linkedin_url?: string | null
          location?: string | null
          major?: string | null
          major_specialization?: string | null
          mentee_status?: string | null
          mentor_availability?: string | null
          mentor_status?: string | null
          mentor_topics?: string[] | null
          mentorship_topics?: string[] | null
          phone?: string | null
          phone_number?: string | null
          privacy_level?: string | null
          resume_url?: string | null
          role?: string | null
          skills?: string[] | null
          social_links?: Json | null
          specialization?: string | null
          student_id?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string | null
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verified?: boolean
          wants_job_alerts?: boolean | null
          website?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_approved: boolean
          resource_type: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean
          resource_type: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean
          resource_type?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      resume_profiles: {
        Row: {
          cover_letter_url: string | null
          created_at: string | null
          desired_industries: string[] | null
          desired_job_titles: string[] | null
          id: string
          job_alert_active: boolean | null
          job_alert_frequency: string | null
          job_alert_keywords: string[] | null
          linkedin_profile: string | null
          portfolio_link: string | null
          preferred_locations: string[] | null
          resume_url: string | null
          updated_at: string | null
          user_id: string
          willing_to_relocate: boolean | null
        }
        Insert: {
          cover_letter_url?: string | null
          created_at?: string | null
          desired_industries?: string[] | null
          desired_job_titles?: string[] | null
          id?: string
          job_alert_active?: boolean | null
          job_alert_frequency?: string | null
          job_alert_keywords?: string[] | null
          linkedin_profile?: string | null
          portfolio_link?: string | null
          preferred_locations?: string[] | null
          resume_url?: string | null
          updated_at?: string | null
          user_id: string
          willing_to_relocate?: boolean | null
        }
        Update: {
          cover_letter_url?: string | null
          created_at?: string | null
          desired_industries?: string[] | null
          desired_job_titles?: string[] | null
          id?: string
          job_alert_active?: boolean | null
          job_alert_frequency?: string | null
          job_alert_keywords?: string[] | null
          linkedin_profile?: string | null
          portfolio_link?: string | null
          preferred_locations?: string[] | null
          resume_url?: string | null
          updated_at?: string | null
          user_id?: string
          willing_to_relocate?: boolean | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "system_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_analytics: {
        Row: {
          id: string
          metric_name: string
          metric_type: string | null
          metric_value: number | null
          recorded_at: string | null
          tags: Json | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_type?: string | null
          metric_value?: number | null
          recorded_at?: string | null
          tags?: Json | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_type?: string | null
          metric_value?: number | null
          recorded_at?: string | null
          tags?: Json | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resumes: {
        Row: {
          file_size: number | null
          file_url: string
          filename: string
          id: string
          is_primary: boolean | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          is_primary?: boolean | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          is_primary?: boolean | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          profile_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          profile_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      detailed_event_feedback: {
        Row: {
          avatar_url: string | null
          comments: string | null
          event_id: string | null
          event_title: string | null
          feedback_id: string | null
          feedback_submitted_at: string | null
          full_name: string | null
          rating: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees_with_profiles: {
        Row: {
          avatar_url: string | null
          check_in_time: string | null
          created_at: string | null
          event_id: string | null
          event_start_date: string | null
          event_title: string | null
          full_name: string | null
          id: string | null
          profile_id: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_stats: {
        Row: {
          attendee_count: number | null
          category: string | null
          end_date: string | null
          event_id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          is_virtual: boolean | null
          location: string | null
          max_attendees: number | null
          organizer_id: string | null
          organizer_name: string | null
          spots_remaining: number | null
          start_date: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_role_bypass_rls: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      assign_user_role: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      check_user_permission_bypass_rls: {
        Args: { profile_uuid: string; permission_name: string }
        Returns: boolean
      }
      check_user_role_bypass_rls: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      create_event_with_agenda: {
        Args: { event_data: Json }
        Returns: Json
      }
      create_group_and_add_admin: {
        Args: {
          group_name: string
          group_description: string
          group_is_private: boolean
          group_tags: string[]
        }
        Returns: string
      }
      create_new_event: {
        Args: { event_data: Json }
        Returns: Json
      }
      create_notification: {
        Args: {
          user_id: string
          notification_title: string
          notification_message: string
          notification_link?: string
        }
        Returns: string
      }
      drop_all_policies: {
        Args: { target_table: string }
        Returns: undefined
      }
      find_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_connections_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_latest_message: {
        Args: { p_conversation_id: string }
        Returns: {
          message_id: string
          content: string
          sender_id: string
          sender_name: string
          created_at: string
          message_type: string
          attachment_url: string
        }[]
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_or_create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_role_by_name: {
        Args: { role_name: string }
        Returns: {
          id: string
          name: string
          description: string
        }[]
      }
      get_role_id_by_name: {
        Args: { role_name: string }
        Returns: string
      }
      get_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      get_unread_message_count: {
        Args: { conv_id: string; user_id: string }
        Returns: number
      }
      get_unread_notifications_count: {
        Args: { profile_uuid: string }
        Returns: number
      }
      get_user_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          conversation_id: string
          last_updated: string
          participants: Json
          last_message_content: string
          last_message_created_at: string
        }[]
      }
      get_user_conversations_v2: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          last_message_at: string
          created_at: string
          participant_id: string
          participant_name: string
          participant_avatar: string
          is_online: boolean
          unread_count: number
        }[]
      }
      get_user_permissions: {
        Args: { profile_uuid: string }
        Returns: {
          permission_name: string
          permission_description: string
        }[]
      }
      get_user_permissions_bypass_rls: {
        Args: { profile_uuid: string }
        Returns: {
          permission_name: string
          permission_description: string
        }[]
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_roles_bypass_rls: {
        Args: { profile_uuid: string }
        Returns: {
          role_name: string
          role_description: string
        }[]
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_member_of_group: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      list_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
        }[]
      }
      mark_conversation_as_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_notification_as_read: {
        Args: { notification_uuid: string }
        Returns: boolean
      }
      remove_role_bypass_rls: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      remove_user_role: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      update_event_published_status: {
        Args: { event_id: string; status_value: string }
        Returns: Json
      }
      update_event_status_rpc: {
        Args: { event_id: string; new_status: string }
        Returns: Json
      }
      user_has_permission: {
        Args: { profile_uuid: string; permission_name: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
