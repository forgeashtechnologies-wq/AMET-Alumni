export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at: string | null
          id: string
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code: string
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string
          code_challenge_method?: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id?: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            isOneToOne: false
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown | null
          not_after: string | null
          refreshed_at: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown | null
          not_after?: string | null
          refreshed_at?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown | null
          not_after?: string | null
          refreshed_at?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jwt: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  cron: {
    Tables: {
      job: {
        Row: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string | null
          nodename: string
          nodeport: number
          schedule: string
          username: string
        }
        Insert: {
          active?: boolean
          command: string
          database?: string
          jobid?: number
          jobname?: string | null
          nodename?: string
          nodeport?: number
          schedule: string
          username?: string
        }
        Update: {
          active?: boolean
          command?: string
          database?: string
          jobid?: number
          jobname?: string | null
          nodename?: string
          nodeport?: number
          schedule?: string
          username?: string
        }
        Relationships: []
      }
      job_run_details: {
        Row: {
          command: string | null
          database: string | null
          end_time: string | null
          job_pid: number | null
          jobid: number | null
          return_message: string | null
          runid: number
          start_time: string | null
          status: string | null
          username: string | null
        }
        Insert: {
          command?: string | null
          database?: string | null
          end_time?: string | null
          job_pid?: number | null
          jobid?: number | null
          return_message?: string | null
          runid?: number
          start_time?: string | null
          status?: string | null
          username?: string | null
        }
        Update: {
          command?: string | null
          database?: string | null
          end_time?: string | null
          job_pid?: number | null
          jobid?: number | null
          return_message?: string | null
          runid?: number
          start_time?: string | null
          status?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alter_job: {
        Args: {
          active?: boolean
          command?: string
          database?: string
          job_id: number
          schedule?: string
          username?: string
        }
        Returns: undefined
      }
      schedule: {
        Args:
          | { command: string; job_name: string; schedule: string }
          | { command: string; schedule: string }
        Returns: number
      }
      schedule_in_database: {
        Args: {
          active?: boolean
          command: string
          database: string
          job_name: string
          schedule: string
          username?: string
        }
        Returns: number
      }
      unschedule: {
        Args: { job_id: number } | { job_name: string }
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invalid_degree_programs_audit: {
        Row: {
          id: string
          old_degree_program: string | null
          snapshot_at: string | null
        }
        Insert: {
          id: string
          old_degree_program?: string | null
          snapshot_at?: string | null
        }
        Update: {
          id?: string
          old_degree_program?: string | null
          snapshot_at?: string | null
        }
        Relationships: []
      }
      backup_bad_conversations_20250905: {
        Row: {
          client_id: string | null
          content: string | null
          conversation_created_at: string | null
          conversation_id: string | null
          conversation_updated_at: string | null
          last_message_at: string | null
          message_created_at: string | null
          message_id: string | null
          message_updated_at: string | null
          participant_1: string | null
          participant_2: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string | null
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          conversation_created_at?: string | null
          conversation_id?: string | null
          conversation_updated_at?: string | null
          last_message_at?: string | null
          message_created_at?: string | null
          message_id?: string | null
          message_updated_at?: string | null
          participant_1?: string | null
          participant_2?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string | null
          conversation_created_at?: string | null
          conversation_id?: string | null
          conversation_updated_at?: string | null
          last_message_at?: string | null
          message_created_at?: string | null
          message_id?: string | null
          message_updated_at?: string | null
          participant_1?: string | null
          participant_2?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string | null
        }
        Relationships: []
      }
      backup_bad_conversations_20250905_json: {
        Row: {
          conversation: Json | null
          conversation_id: string | null
          message: Json | null
        }
        Insert: {
          conversation?: Json | null
          conversation_id?: string | null
          message?: Json | null
        }
        Update: {
          conversation?: Json | null
          conversation_id?: string | null
          message?: Json | null
        }
        Relationships: []
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
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarked_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarked_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "user_jobs_with_bookmark"
            referencedColumns: ["id"]
          },
        ]
      }
      clarification_requests: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clarification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "clarification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "content_approvals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approvals_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "content_approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "content_moderation_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_moderation_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string | null
          participant_2: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string | null
          participant_2?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string | null
          participant_2?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_import_history: {
        Row: {
          action_type: string | null
          created_at: string
          error_details: string | null
          filename: string
          id: string
          mapping_config: Json | null
          record_count: number | null
          status: string
          target_table: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          error_details?: string | null
          filename: string
          id?: string
          mapping_config?: Json | null
          record_count?: number | null
          status?: string
          target_table: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string | null
          created_at?: string
          error_details?: string | null
          filename?: string
          id?: string
          mapping_config?: Json | null
          record_count?: number | null
          status?: string
          target_table?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      degrees: {
        Row: {
          code: string
          label: string
        }
        Insert: {
          code: string
          label: string
        }
        Update: {
          code?: string
          label?: string
        }
        Relationships: []
      }
      deletion_queue: {
        Row: {
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          user_id?: string
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "education_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          attendance_status: string
          attendee_id: string | null
          check_in_time: string | null
          created_at: string
          event_id: string
          id: string
          registration_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_status?: string
          attendee_id?: string | null
          check_in_time?: string | null
          created_at?: string
          event_id: string
          id?: string
          registration_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_status?: string
          attendee_id?: string | null
          check_in_time?: string | null
          created_at?: string
          event_id?: string
          id?: string
          registration_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "event_attendees_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
          comment: string | null
          comments: string | null
          created_at: string | null
          event_id: string | null
          id: string
          rating: number | null
          rsvp_status: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          comments?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          rating?: number | null
          rsvp_status?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          comments?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          rating?: number | null
          rsvp_status?: string | null
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
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      event_groups: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          group_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          group_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          group_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
        }
        Insert: {
          attendance_status?: string | null
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          attendance_status?: string | null
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
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
          additional_info: string | null
          address: string | null
          agenda: Json | null
          amenities: string[] | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          category: string
          cost: string | null
          created_at: string
          created_by: string | null
          creator_id: string | null
          description: string
          end_date: string
          event_type: string | null
          featured_image_url: string | null
          gallery: string[] | null
          group_id: string | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          is_public: boolean | null
          is_published: boolean | null
          is_rejected: boolean | null
          is_virtual: boolean | null
          location: string | null
          long_description: string | null
          max_attendees: number | null
          organizer_email: string | null
          organizer_id: string
          organizer_name: string | null
          organizer_phone: string | null
          price: number | null
          price_type: string | null
          registration_deadline: string | null
          registration_required: boolean | null
          registration_url: string | null
          rejection_reason: string | null
          reminder_sent: boolean | null
          requirements: string[] | null
          requires_approval: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          short_description: string | null
          slug: string | null
          sponsors: string | null
          start_date: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          venue: string | null
          virtual_link: string | null
          virtual_meeting_link: string | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          agenda?: Json | null
          amenities?: string[] | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          category?: string
          cost?: string | null
          created_at?: string
          created_by?: string | null
          creator_id?: string | null
          description: string
          end_date: string
          event_type?: string | null
          featured_image_url?: string | null
          gallery?: string[] | null
          group_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          is_published?: boolean | null
          is_rejected?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          long_description?: string | null
          max_attendees?: number | null
          organizer_email?: string | null
          organizer_id: string
          organizer_name?: string | null
          organizer_phone?: string | null
          price?: number | null
          price_type?: string | null
          registration_deadline?: string | null
          registration_required?: boolean | null
          registration_url?: string | null
          rejection_reason?: string | null
          reminder_sent?: boolean | null
          requirements?: string[] | null
          requires_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          slug?: string | null
          sponsors?: string | null
          start_date: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          venue?: string | null
          virtual_link?: string | null
          virtual_meeting_link?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          agenda?: Json | null
          amenities?: string[] | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          category?: string
          cost?: string | null
          created_at?: string
          created_by?: string | null
          creator_id?: string | null
          description?: string
          end_date?: string
          event_type?: string | null
          featured_image_url?: string | null
          gallery?: string[] | null
          group_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          is_published?: boolean | null
          is_rejected?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          long_description?: string | null
          max_attendees?: number | null
          organizer_email?: string | null
          organizer_id?: string
          organizer_name?: string | null
          organizer_phone?: string | null
          price?: number | null
          price_type?: string | null
          registration_deadline?: string | null
          registration_required?: boolean | null
          registration_url?: string | null
          rejection_reason?: string | null
          reminder_sent?: boolean | null
          requirements?: string[] | null
          requires_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          short_description?: string | null
          slug?: string | null
          sponsors?: string | null
          start_date?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          venue?: string | null
          virtual_link?: string | null
          virtual_meeting_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
        }
        Insert: {
          enabled?: boolean
          key: string
        }
        Update: {
          enabled?: boolean
          key?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          has_image: boolean | null
          id: string
          image_url: string | null
          parent_post_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          parent_post_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          parent_post_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_posts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_group_posts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_group_posts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_group_posts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_group_posts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
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
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string | null
          created_by: string | null
          created_by_user_id: string | null
          description: string | null
          group_avatar_url: string | null
          id: string
          is_admin_only_posts: boolean | null
          is_approved: boolean
          is_private: boolean
          is_rejected: boolean | null
          name: string
          name_norm: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string | null
          created_by?: string | null
          created_by_user_id?: string | null
          description?: string | null
          group_avatar_url?: string | null
          id?: string
          is_admin_only_posts?: boolean | null
          is_approved?: boolean
          is_private?: boolean
          is_rejected?: boolean | null
          name: string
          name_norm?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string | null
          created_by?: string | null
          created_by_user_id?: string | null
          description?: string | null
          group_avatar_url?: string | null
          id?: string
          is_admin_only_posts?: boolean | null
          is_approved?: boolean
          is_private?: boolean
          is_rejected?: boolean | null
          name?: string
          name_norm?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "groups_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "groups_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alert_notifications: {
        Row: {
          alert_id: string
          id: string
          job_id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          id?: string
          job_id: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          id?: string
          job_id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "job_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "user_jobs_with_bookmark"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "job_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          alert_frequency: string | null
          alert_name: string
          created_at: string | null
          desired_industries: string[] | null
          desired_roles: string[] | null
          experience_level: string | null
          frequency: string | null
          id: string
          industries: string[] | null
          is_active: boolean | null
          job_titles: string[] | null
          job_type: string | null
          job_types: string[] | null
          keywords: string[] | null
          location: string | null
          locations: string[] | null
          max_salary: number | null
          min_salary: number | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_frequency?: string | null
          alert_name: string
          created_at?: string | null
          desired_industries?: string[] | null
          desired_roles?: string[] | null
          experience_level?: string | null
          frequency?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          job_titles?: string[] | null
          job_type?: string | null
          job_types?: string[] | null
          keywords?: string[] | null
          location?: string | null
          locations?: string[] | null
          max_salary?: number | null
          min_salary?: number | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_frequency?: string | null
          alert_name?: string
          created_at?: string | null
          desired_industries?: string[] | null
          desired_roles?: string[] | null
          experience_level?: string | null
          frequency?: string | null
          id?: string
          industries?: string[] | null
          is_active?: boolean | null
          job_titles?: string[] | null
          job_type?: string | null
          job_types?: string[] | null
          keywords?: string[] | null
          location?: string | null
          locations?: string[] | null
          max_salary?: number | null
          min_salary?: number | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
          submitted_at: string | null
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
          submitted_at?: string | null
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
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "user_jobs_with_bookmark"
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
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "user_jobs_with_bookmark"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          application_instructions: string | null
          application_url: string | null
          apply_url: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          company_id: string | null
          company_name: string | null
          contact_email: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          department: string | null
          description: string | null
          education_level: string | null
          education_required: string | null
          experience_level: string | null
          experience_required: string | null
          expires_at: string | null
          external_url: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_rejected: boolean | null
          is_verified: boolean
          job_type: string | null
          location: string | null
          posted_by: string
          primary_role: string | null
          rejection_reason: string | null
          required_skills: string | null
          requirements: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          salary_max: number | null
          salary_min: number | null
          salary_range: string | null
          skills: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          application_deadline?: string | null
          application_instructions?: string | null
          application_url?: string | null
          apply_url?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          company_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          education_level?: string | null
          education_required?: string | null
          experience_level?: string | null
          experience_required?: string | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_rejected?: boolean | null
          is_verified?: boolean
          job_type?: string | null
          location?: string | null
          posted_by: string
          primary_role?: string | null
          rejection_reason?: string | null
          required_skills?: string | null
          requirements?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          skills?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          application_deadline?: string | null
          application_instructions?: string | null
          application_url?: string | null
          apply_url?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          company_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          education_level?: string | null
          education_required?: string | null
          experience_level?: string | null
          experience_required?: string | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_rejected?: boolean | null
          is_verified?: boolean
          job_type?: string | null
          location?: string | null
          posted_by?: string
          primary_role?: string | null
          rejection_reason?: string | null
          required_skills?: string | null
          requirements?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          skills?: string[] | null
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
            referencedRelation: "admin_user_logins"
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
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "mentee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "mentees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "mentee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_feedback: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          mentorship_request_id: string | null
          rating: number | null
          submitted_by: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          mentorship_request_id?: string | null
          rating?: number | null
          submitted_by?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          mentorship_request_id?: string | null
          rating?: number | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_feedback_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_feedback_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_feedback_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentorship_feedback_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_feedback_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_feedback_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_messages: {
        Row: {
          id: string
          mentorship_request_id: string | null
          message: string
          sender_id: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          mentorship_request_id?: string | null
          message: string
          sender_id?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          mentorship_request_id?: string | null
          message?: string
          sender_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_messages_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mentorship_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "mentorship_relationships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relationships_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
            foreignKeyName: "mentorship_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          meeting_url: string | null
          mentorship_request_id: string | null
          notes: string | null
          scheduled_time: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          mentorship_request_id?: string | null
          notes?: string | null
          scheduled_time: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          mentorship_request_id?: string | null
          notes?: string | null
          scheduled_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
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
          client_id: string | null
          client_uuid: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_uuid?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_uuid?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          updated_at?: string | null
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
            referencedRelation: "admin_user_logins"
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
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          profile_id: string | null
          recipient_id: string
          sender_id: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          profile_id?: string | null
          recipient_id: string
          sender_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          profile_id?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_stats"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "fk_notification_event"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_recipient"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_recipient"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_notification_recipient"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_recipient"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_recipient"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_notification_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notification_sender"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
          achievements: Json | null
          admin_notes: string | null
          alumni_verification_status: string | null
          approval_status: Database["public"]["Enums"]["profile_approval_status"]
          avatar_url: string | null
          batch: string | null
          batch_year: number | null
          bio: string | null
          biography: string | null
          clarification_comment: string | null
          company: string | null
          company_location: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string | null
          current_company: string | null
          current_job_title: string | null
          current_location: string | null
          current_position: string | null
          date_of_birth: string | null
          degree: string | null
          degree_code: string | null
          degree_program: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          education: Json | null
          email: string
          experience: string | null
          first_name: string | null
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          headline: string | null
          id: string
          industry: string | null
          interests: Json | null
          is_admin: boolean | null
          is_approved: boolean
          is_available_for_mentorship: boolean | null
          is_deleted: boolean
          is_employer: boolean | null
          is_hidden: boolean
          is_mentor: boolean | null
          is_online: boolean | null
          is_profile_complete: boolean | null
          is_verified: boolean | null
          job_title: string | null
          languages: string[] | null
          last_name: string | null
          last_seen: string | null
          linkedin_url: string | null
          location: string | null
          location_city: string | null
          location_country: string | null
          major: string | null
          major_specialization: string | null
          mentee_status: string | null
          mentor_availability: string | null
          mentor_status: string | null
          mentor_topics: string[] | null
          mentorship_topics: string[] | null
          phone: string | null
          phone_number: string | null
          positions: Json | null
          primary_role: string | null
          privacy_level: string | null
          privacy_settings: Json | null
          profession: string | null
          rejected_by: string | null
          rejection_comment: string | null
          rejection_date: string | null
          rejection_reason: string | null
          resume_url: string | null
          role: string | null
          show_in_directory: boolean | null
          skills: Json | null
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
          verified_at: string | null
          wants_job_alerts: boolean | null
          website: string | null
          website_url: string | null
          work_experience: Json | null
          years_experience: number | null
        }
        Insert: {
          about?: string | null
          account_type?: string | null
          achievements?: Json | null
          admin_notes?: string | null
          alumni_verification_status?: string | null
          approval_status?: Database["public"]["Enums"]["profile_approval_status"]
          avatar_url?: string | null
          batch?: string | null
          batch_year?: number | null
          bio?: string | null
          biography?: string | null
          clarification_comment?: string | null
          company?: string | null
          company_location?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string | null
          current_company?: string | null
          current_job_title?: string | null
          current_location?: string | null
          current_position?: string | null
          date_of_birth?: string | null
          degree?: string | null
          degree_code?: string | null
          degree_program?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          education?: Json | null
          email: string
          experience?: string | null
          first_name?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          headline?: string | null
          id: string
          industry?: string | null
          interests?: Json | null
          is_admin?: boolean | null
          is_approved?: boolean
          is_available_for_mentorship?: boolean | null
          is_deleted?: boolean
          is_employer?: boolean | null
          is_hidden?: boolean
          is_mentor?: boolean | null
          is_online?: boolean | null
          is_profile_complete?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          last_seen?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_country?: string | null
          major?: string | null
          major_specialization?: string | null
          mentee_status?: string | null
          mentor_availability?: string | null
          mentor_status?: string | null
          mentor_topics?: string[] | null
          mentorship_topics?: string[] | null
          phone?: string | null
          phone_number?: string | null
          positions?: Json | null
          primary_role?: string | null
          privacy_level?: string | null
          privacy_settings?: Json | null
          profession?: string | null
          rejected_by?: string | null
          rejection_comment?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          resume_url?: string | null
          role?: string | null
          show_in_directory?: boolean | null
          skills?: Json | null
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
          verified_at?: string | null
          wants_job_alerts?: boolean | null
          website?: string | null
          website_url?: string | null
          work_experience?: Json | null
          years_experience?: number | null
        }
        Update: {
          about?: string | null
          account_type?: string | null
          achievements?: Json | null
          admin_notes?: string | null
          alumni_verification_status?: string | null
          approval_status?: Database["public"]["Enums"]["profile_approval_status"]
          avatar_url?: string | null
          batch?: string | null
          batch_year?: number | null
          bio?: string | null
          biography?: string | null
          clarification_comment?: string | null
          company?: string | null
          company_location?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string | null
          current_company?: string | null
          current_job_title?: string | null
          current_location?: string | null
          current_position?: string | null
          date_of_birth?: string | null
          degree?: string | null
          degree_code?: string | null
          degree_program?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          education?: Json | null
          email?: string
          experience?: string | null
          first_name?: string | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          headline?: string | null
          id?: string
          industry?: string | null
          interests?: Json | null
          is_admin?: boolean | null
          is_approved?: boolean
          is_available_for_mentorship?: boolean | null
          is_deleted?: boolean
          is_employer?: boolean | null
          is_hidden?: boolean
          is_mentor?: boolean | null
          is_online?: boolean | null
          is_profile_complete?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          last_seen?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_country?: string | null
          major?: string | null
          major_specialization?: string | null
          mentee_status?: string | null
          mentor_availability?: string | null
          mentor_status?: string | null
          mentor_topics?: string[] | null
          mentorship_topics?: string[] | null
          phone?: string | null
          phone_number?: string | null
          positions?: Json | null
          primary_role?: string | null
          privacy_level?: string | null
          privacy_settings?: Json | null
          profession?: string | null
          rejected_by?: string | null
          rejection_comment?: string | null
          rejection_date?: string | null
          rejection_reason?: string | null
          resume_url?: string | null
          role?: string | null
          show_in_directory?: boolean | null
          skills?: Json | null
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
          verified_at?: string | null
          wants_job_alerts?: boolean | null
          website?: string | null
          website_url?: string | null
          work_experience?: Json | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_degree_code_fkey"
            columns: ["degree_code"]
            isOneToOne: false
            referencedRelation: "degrees"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_verification_reviewed_by_fkey"
            columns: ["verification_reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
      social_links: {
        Row: {
          id: number
          profile_id: string | null
          type: Database["public"]["Enums"]["social_type"]
          url: string
        }
        Insert: {
          id?: number
          profile_id?: string | null
          type: Database["public"]["Enums"]["social_type"]
          url: string
        }
        Update: {
          id?: number
          profile_id?: string | null
          type?: Database["public"]["Enums"]["social_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "system_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string | null
          description: string
          feedback_type: string
          id: string
          page: string
          screenshot_url: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          feedback_type: string
          id?: string
          page: string
          screenshot_url?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          feedback_type?: string
          id?: string
          page?: string
          screenshot_url?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_attendees_with_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
            referencedRelation: "admin_user_logins"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "user_resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
      admin_user_logins: {
        Row: {
          first_name: string | null
          id: string | null
          last_name: string | null
          last_sign_in_at: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
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
      job_postings: {
        Row: {
          application_instructions: string | null
          application_url: string | null
          apply_url: string | null
          company_id: string | null
          company_name: string | null
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
          id: string | null
          industry: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_verified: boolean | null
          job_type: string | null
          location: string | null
          posted_by: string | null
          required_skills: string | null
          requirements: string | null
          salary_range: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          application_instructions?: string | null
          application_url?: string | null
          apply_url?: string | null
          company_id?: string | null
          company_name?: string | null
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
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_by?: string | null
          required_skills?: string | null
          requirements?: string | null
          salary_range?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          application_instructions?: string | null
          application_url?: string | null
          apply_url?: string | null
          company_id?: string | null
          company_name?: string | null
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
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_by?: string | null
          required_skills?: string | null
          requirements?: string | null
          salary_range?: string | null
          title?: string | null
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
            referencedRelation: "admin_user_logins"
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
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_stats: {
        Row: {
          pending_requests: number | null
          rejected_requests: number | null
          total_approved: number | null
        }
        Relationships: []
      }
      public_profiles_view: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          current_job_title: string | null
          degree_program: string | null
          first_name: string | null
          full_name: string | null
          graduation_year: number | null
          headline: string | null
          id: string | null
          is_employer: boolean | null
          is_mentor: boolean | null
          last_name: string | null
          location: string | null
          social_links: Json | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          current_job_title?: string | null
          degree_program?: string | null
          first_name?: string | null
          full_name?: string | null
          graduation_year?: number | null
          headline?: string | null
          id?: string | null
          is_employer?: boolean | null
          is_mentor?: boolean | null
          last_name?: string | null
          location?: string | null
          social_links?: Json | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          current_job_title?: string | null
          degree_program?: string | null
          first_name?: string | null
          full_name?: string | null
          graduation_year?: number | null
          headline?: string | null
          id?: string | null
          is_employer?: boolean | null
          is_mentor?: boolean | null
          last_name?: string | null
          location?: string | null
          social_links?: Json | null
        }
        Relationships: []
      }
      user_jobs_with_bookmark: {
        Row: {
          application_instructions: string | null
          application_url: string | null
          apply_url: string | null
          bookmarked_at: string | null
          bookmarked_by: string | null
          company_id: string | null
          company_name: string | null
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
          id: string | null
          industry: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_bookmarked: boolean | null
          is_verified: boolean | null
          job_type: string | null
          location: string | null
          posted_by: string | null
          required_skills: string | null
          requirements: string | null
          salary_range: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
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
            referencedRelation: "admin_user_logins"
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
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_logins"
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
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profiles_directory_card"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profiles_directory_card: {
        Row: {
          current_company: string | null
          current_title: string | null
          degree_department: string | null
          full_name: string | null
          graduation_year: number | null
          id: string | null
          is_approved: boolean | null
          location_label: string | null
          profession: string | null
          skills: Json | null
        }
        Insert: {
          current_company?: never
          current_title?: never
          degree_department?: never
          full_name?: never
          graduation_year?: number | null
          id?: string | null
          is_approved?: boolean | null
          location_label?: never
          profession?: never
          skills?: Json | null
        }
        Update: {
          current_company?: never
          current_title?: never
          degree_department?: never
          full_name?: never
          graduation_year?: number | null
          id?: string | null
          is_approved?: boolean | null
          location_label?: never
          profession?: never
          skills?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      _http_request_compat: {
        Args: {
          _content?: string
          _headers?: unknown[]
          _method: string
          _url: string
        }
        Returns: unknown
      }
      _is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      admin_delete_job: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      admin_delete_user_fallback: {
        Args: { target_user_id: string }
        Returns: Json
      }
      admin_delete_user_rpc: {
        Args: { target: string }
        Returns: Json
      }
      admin_list_user_logins: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_name: string | null
          id: string | null
          last_name: string | null
          last_sign_in_at: string | null
        }[]
      }
      admin_list_users_with_last_login: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          role: string
        }[]
      }
      admin_purge_user_data: {
        Args: { target: string }
        Returns: Json
      }
      admin_request_user_delete: {
        Args: { target: string }
        Returns: Json
      }
      admin_revoke_super_admin: {
        Args: { new_role?: string; target_user_id: string }
        Returns: Json
      }
      admin_set_approval: {
        Args: {
          new_status: Database["public"]["Enums"]["approval_status"]
          note?: string
          row_id: string
          tname: string
        }
        Returns: Json
      }
      admin_set_profile_approval: {
        Args: {
          new_status: Database["public"]["Enums"]["profile_approval_status"]
          reason?: string
          target: string
        }
        Returns: undefined
      }
      admin_set_role: {
        Args: { p_role: string; p_user: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: { make_admin?: boolean; new_role: string; target: string }
        Returns: undefined
      }
      admin_soft_delete_user: {
        Args: { reason?: string; target_user_id: string } | { target: string }
        Returns: Json
      }
      assign_role_bypass_rls: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      assign_user_role: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      attach_user_to_batch_group: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_user_permission_bypass_rls: {
        Args: { permission_name: string; profile_uuid: string }
        Returns: boolean
      }
      check_user_role_bypass_rls: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      create_conversation_for_mentorship: {
        Args: { mentee_uuid: string; mentor_uuid: string }
        Returns: string
      }
      create_event_with_agenda: {
        Args: { event_data: Json }
        Returns: Json
      }
      create_group_and_add_admin: {
        Args: {
          group_description: string
          group_is_private: boolean
          group_name: string
          group_tags: string[]
        }
        Returns: string
      }
      create_new_event: {
        Args: { event_data: Json }
        Returns: Json
      }
      create_notification: {
        Args:
          | {
              event_id: string
              message: string
              recipient_id: string
              sender_id: string
              type: string
            }
          | {
              notif_link: string
              notif_message: string
              notif_title: string
              notif_type?: string
              target_profile_id: string
            }
          | {
              notification_link: string
              notification_message: string
              notification_title: string
              user_id: string
            }
        Returns: string
      }
      create_or_update_mentor_profile: {
        Args: {
          p_availability?: string
          p_expertise?: string[]
          p_max_mentees?: number
          p_mentoring_statement?: string
        }
        Returns: Json
      }
      drop_all_policies: {
        Args: { target_table: string }
        Returns: undefined
      }
      enqueue_user_hard_delete: {
        Args: { reason?: string; target_user_id: string }
        Returns: Json
      }
      find_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_company_jobs_with_bookmarks: {
        Args: {
          p_company_id: string
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: Json[]
      }
      get_connection_status: {
        Args: { user_1_id: string; user_2_id: string }
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
      get_jobs_with_bookmarks: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: Json[]
      }
      get_jobs_with_bookmarks_v2: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search_query?: string
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: Json
      }
      get_latest_message: {
        Args: { p_conversation_id: string }
        Returns: {
          attachment_url: string
          content: string
          created_at: string
          message_id: string
          message_type: string
          sender_id: string
          sender_name: string
        }[]
      }
      get_my_posted_jobs: {
        Args:
          | {
              p_limit: number
              p_offset: number
              p_search_query: string
              p_sort_by: string
              p_sort_order: string
            }
          | { user_id: string }
        Returns: {
          company_id: string
          company_name: string
          contact_email: string
          created_at: string
          description: string
          external_url: string
          id: string
          is_active: boolean
          is_approved: boolean
          job_type: string
          location: string
          posted_by: string
          salary_range: string
          title: string
        }[]
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_or_create_conversation: {
        Args: { user_1_id: string; user_2_id: string }
        Returns: string
      }
      get_pending_approvals: {
        Args: { content_type?: string; limit_count?: number }
        Returns: Json
      }
      get_pending_content: {
        Args: Record<PropertyKey, never>
        Returns: {
          data: Json
        }[]
      }
      get_role_by_name: {
        Args: { role_name: string }
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      get_role_id_by_name: {
        Args: { role_name: string }
        Returns: string
      }
      get_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          id: string
          name: string
        }[]
      }
      get_table_columns: {
        Args: { table_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: boolean
        }[]
      }
      get_types: {
        Args: { tname: string }
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
        Args: Record<PropertyKey, never> | { profile_uuid: string }
        Returns: number
      }
      get_unread_notifications_count_by_type: {
        Args: { type_filter: string }
        Returns: number
      }
      get_user_analytics: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      get_user_analytics_old_109720: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          conversation_id: string
          last_message_content: string
          last_message_created_at: string
          last_updated: string
          participants: Json
        }[]
      }
      get_user_conversations_v2: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          created_at: string
          is_online: boolean
          last_message_at: string
          participant_avatar: string
          participant_id: string
          participant_name: string
          unread_count: number
        }[]
      }
      get_user_permissions: {
        Args: { profile_uuid: string }
        Returns: {
          permission_description: string
          permission_name: string
        }[]
      }
      get_user_permissions_bypass_rls: {
        Args: { profile_uuid: string }
        Returns: {
          permission_description: string
          permission_name: string
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: string
      }
      get_user_roles_bypass_rls: {
        Args: { profile_uuid: string }
        Returns: {
          role_description: string
          role_name: string
        }[]
      }
      get_view_columns: {
        Args: { view_name: string }
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      has_permission: {
        Args: { permission_name: string; user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: boolean
      }
      is_connected: {
        Args: { a: string; b: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { gid: string } | { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_member_of_group: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      join_group: {
        Args: { group_id: string }
        Returns: Json
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
      moderate_content: {
        Args:
          | {
              content_id: string
              content_table: string
              content_type?: string
              is_approved: boolean
              rejection_reason?: string
            }
          | { p_action: string; p_content_id: string; p_content_type: string }
        Returns: Json
      }
      notify_profile_verification: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      purge_user_data: {
        Args: { uid: string }
        Returns: undefined
      }
      remove_role_bypass_rls: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      remove_user_role: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
      rsvp_to_event: {
        Args: {
          p_attendance_status_text: string
          p_attendee_id: string
          p_event_id: string
        }
        Returns: undefined
      }
      safe_to_jsonb: {
        Args: { _txt: string }
        Returns: Json
      }
      start_or_get_conversation: {
        Args: { other_user: string }
        Returns: string
      }
      update_event_published_status: {
        Args: { event_id: string; status_value: string }
        Returns: Json
      }
      update_event_status_rpc: {
        Args: { event_id: string; new_status: string }
        Returns: Json
      }
      update_user_role: {
        Args: { new_role: string; user_id: string }
        Returns: Json
      }
      user_has_permission: {
        Args: { permission_name: string; profile_uuid: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { profile_uuid: string; role_name: string }
        Returns: boolean
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      employment_type: "full-time" | "part-time" | "contract" | "internship"
      profile_approval_status: "pending" | "approved" | "rejected"
      rsvp_status: "going" | "not_going" | "interested"
      social_type:
        | "linkedin"
        | "github"
        | "website"
        | "instagram"
        | "facebook"
        | "x"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  realtime: {
    Tables: {
      messages: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_03: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_04: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_05: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_06: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_07: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_08: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2025_09_09: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          inserted_at: string | null
          version: number
        }
        Insert: {
          inserted_at?: string | null
          version: number
        }
        Update: {
          inserted_at?: string | null
          version?: number
        }
        Relationships: []
      }
      subscription: {
        Row: {
          claims: Json
          claims_role: unknown
          created_at: string
          entity: unknown
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id: number
          subscription_id: string
        }
        Insert: {
          claims: Json
          claims_role?: unknown
          created_at?: string
          entity: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id: string
        }
        Update: {
          claims?: Json
          claims_role?: unknown
          created_at?: string
          entity?: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_rls: {
        Args: { max_record_bytes?: number; wal: Json }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
      }
      broadcast_changes: {
        Args: {
          event_name: string
          level?: string
          new: Record<string, unknown>
          old: Record<string, unknown>
          operation: string
          table_name: string
          table_schema: string
          topic_name: string
        }
        Returns: undefined
      }
      build_prepared_statement_sql: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          entity: unknown
          prepared_statement_name: string
        }
        Returns: string
      }
      cast: {
        Args: { type_: unknown; val: string }
        Returns: Json
      }
      check_equality_op: {
        Args: {
          op: Database["realtime"]["Enums"]["equality_op"]
          type_: unknown
          val_1: string
          val_2: string
        }
        Returns: boolean
      }
      is_visible_through_filters: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
        }
        Returns: boolean
      }
      list_changes: {
        Args: {
          max_changes: number
          max_record_bytes: number
          publication: unknown
          slot_name: unknown
        }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
      }
      quote_wal2json: {
        Args: { entity: unknown }
        Returns: string
      }
      send: {
        Args: { event: string; payload: Json; private?: boolean; topic: string }
        Returns: undefined
      }
      to_regrole: {
        Args: { role_name: string }
        Returns: unknown
      }
      topic: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      action: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR"
      equality_op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in"
    }
    CompositeTypes: {
      user_defined_filter: {
        column_name: string | null
        op: Database["realtime"]["Enums"]["equality_op"] | null
        value: string | null
      }
      wal_column: {
        name: string | null
        type_name: string | null
        type_oid: unknown | null
        value: Json | null
        is_pkey: boolean | null
        is_selectable: boolean | null
      }
      wal_rls: {
        wal: Json | null
        is_rls_enabled: boolean | null
        subscription_ids: string[] | null
        errors: string[] | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  vault: {
    Tables: {
      secrets: {
        Row: {
          created_at: string
          description: string
          id: string
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      decrypted_secrets: {
        Row: {
          created_at: string | null
          decrypted_secret: string | null
          description: string | null
          id: string | null
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _crypto_aead_det_decrypt: {
        Args: {
          additional: string
          context?: string
          key_id: number
          message: string
          nonce?: string
        }
        Returns: string
      }
      _crypto_aead_det_encrypt: {
        Args: {
          additional: string
          context?: string
          key_id: number
          message: string
          nonce?: string
        }
        Returns: string
      }
      _crypto_aead_det_noncegen: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret: string
        }
        Returns: string
      }
      update_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret?: string
          secret_id: string
        }
        Returns: undefined
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
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  cron: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      employment_type: ["full-time", "part-time", "contract", "internship"],
      profile_approval_status: ["pending", "approved", "rejected"],
      rsvp_status: ["going", "not_going", "interested"],
      social_type: [
        "linkedin",
        "github",
        "website",
        "instagram",
        "facebook",
        "x",
      ],
    },
  },
  realtime: {
    Enums: {
      action: ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR"],
      equality_op: ["eq", "neq", "lt", "lte", "gt", "gte", "in"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
  vault: {
    Enums: {},
  },
} as const
