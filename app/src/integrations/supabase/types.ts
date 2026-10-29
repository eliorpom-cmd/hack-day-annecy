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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_user_connections: {
        Row: {
          account_email: string | null
          calendar_id: string
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          organization_id: string | null
          reconnect_required: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string | null
          calendar_id?: string
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          reconnect_required?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string | null
          calendar_id?: string
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          reconnect_required?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          calendar_provider: string
          caller_email: string | null
          caller_name: string
          caller_phone: string | null
          created_at: string
          ends_at: string
          external_event_id: string | null
          id: string
          notes: string | null
          organization_id: string
          receptionist_id: string | null
          service: string | null
          source: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          calendar_provider?: string
          caller_email?: string | null
          caller_name: string
          caller_phone?: string | null
          created_at?: string
          ends_at: string
          external_event_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          receptionist_id?: string | null
          service?: string | null
          source?: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_provider?: string
          caller_email?: string | null
          caller_name?: string
          caller_phone?: string | null
          created_at?: string
          ends_at?: string
          external_event_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          receptionist_id?: string | null
          service?: string | null
          source?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_receptionist_id_fkey"
            columns: ["receptionist_id"]
            isOneToOne: false
            referencedRelation: "receptionists"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          organization_id: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          day_of_week: number
          enabled: boolean
          id: string
          open_time: string
          organization_id: string
        }
        Insert: {
          close_time?: string
          day_of_week: number
          enabled?: boolean
          id?: string
          open_time?: string
          organization_id: string
        }
        Update: {
          close_time?: string
          day_of_week?: number
          enabled?: boolean
          id?: string
          open_time?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          booking_rules: string | null
          booking_url: string | null
          business_name: string
          cancellation_rules: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          emergency_rules: string | null
          id: string
          industry: string | null
          organization_id: string
          phone: string | null
          policies: string | null
          postal_code: string | null
          state: string | null
          timezone: string
          transfer_rules: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          booking_rules?: string | null
          booking_url?: string | null
          business_name?: string
          cancellation_rules?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          emergency_rules?: string | null
          id?: string
          industry?: string | null
          organization_id: string
          phone?: string | null
          policies?: string | null
          postal_code?: string | null
          state?: string | null
          timezone?: string
          transfer_rules?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          booking_rules?: string | null
          booking_url?: string | null
          business_name?: string
          cancellation_rules?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          emergency_rules?: string | null
          id?: string
          industry?: string | null
          organization_id?: string
          phone?: string | null
          policies?: string | null
          postal_code?: string | null
          state?: string | null
          timezone?: string
          transfer_rules?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          caller_phone: string | null
          channel: string
          client_id: string | null
          created_at: string
          duration_secs: number
          external_id: string
          has_audio: boolean
          id: string
          organization_id: string
          outcome: string | null
          receptionist_id: string | null
          started_at: string
          status: string
          summary: string | null
          synced_at: string
          title: string | null
          transcript: Json
        }
        Insert: {
          caller_phone?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          duration_secs?: number
          external_id: string
          has_audio?: boolean
          id?: string
          organization_id: string
          outcome?: string | null
          receptionist_id?: string | null
          started_at: string
          status: string
          summary?: string | null
          synced_at?: string
          title?: string | null
          transcript?: Json
        }
        Update: {
          caller_phone?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          duration_secs?: number
          external_id?: string
          has_audio?: boolean
          id?: string
          organization_id?: string
          outcome?: string | null
          receptionist_id?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          synced_at?: string
          title?: string | null
          transcript?: Json
        }
        Relationships: [
          {
            foreignKeyName: "calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_receptionist_id_fkey"
            columns: ["receptionist_id"]
            isOneToOne: false
            referencedRelation: "receptionists"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          call_count: number
          created_at: string
          email: string | null
          first_call_at: string
          id: string
          last_call_at: string
          last_summary: string | null
          name: string | null
          organization_id: string
          phone: string
        }
        Insert: {
          call_count?: number
          created_at?: string
          email?: string | null
          first_call_at: string
          id?: string
          last_call_at: string
          last_summary?: string | null
          name?: string | null
          organization_id: string
          phone: string
        }
        Update: {
          call_count?: number
          created_at?: string
          email?: string | null
          first_call_at?: string
          id?: string
          last_call_at?: string
          last_summary?: string | null
          name?: string | null
          organization_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_sessions: {
        Row: {
          id: string
          ip_hash: string
          seconds_allowed: number
          session_key: string | null
          started_at: string
        }
        Insert: {
          id?: string
          ip_hash: string
          seconds_allowed?: number
          session_key?: string | null
          started_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string
          seconds_allowed?: number
          session_key?: string | null
          started_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          organization_id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          organization_id: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          organization_id?: string
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "faqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          organization_id: string
          source_id: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          organization_id: string
          source_id?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          organization_id?: string
          source_id?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          content: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          organization_id: string
          status: string
          title: string | null
          type: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          organization_id: string
          status?: string
          title?: string | null
          type?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          status?: string
          title?: string | null
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          id: string
          industry: string | null
          name: string
          onboarding_completed: boolean
          onboarding_step: string
          owner_id: string | null
          plan_id: string
          slug: string
          timezone: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          onboarding_completed?: boolean
          onboarding_step?: string
          owner_id?: string | null
          plan_id?: string
          slug: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          onboarding_completed?: boolean
          onboarding_step?: string
          owner_id?: string | null
          plan_id?: string
          slug?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          country: string
          created_at: string
          friendly_name: string | null
          id: string
          locality: string | null
          organization_id: string
          phone_number: string
          provider: string
          provider_number_sid: string | null
          receptionist_id: string | null
          region: string | null
          status: string
          status_message: string | null
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          locality?: string | null
          organization_id: string
          phone_number: string
          provider?: string
          provider_number_sid?: string | null
          receptionist_id?: string | null
          region?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          friendly_name?: string | null
          id?: string
          locality?: string | null
          organization_id?: string
          phone_number?: string
          provider?: string
          provider_number_sid?: string | null
          receptionist_id?: string | null
          region?: string | null
          status?: string
          status_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_receptionist_id_fkey"
            columns: ["receptionist_id"]
            isOneToOne: false
            referencedRelation: "receptionists"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          annual_price: number
          description: string | null
          features: Json
          highlights: string[]
          id: string
          included_minutes: number
          included_numbers: number
          is_custom: boolean
          is_popular: boolean
          max_concurrent_calls: number
          max_receptionists: number
          monthly_price: number
          name: string
          overage_price_per_minute: number
          sort_order: number
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
        }
        Insert: {
          active?: boolean
          annual_price?: number
          description?: string | null
          features?: Json
          highlights?: string[]
          id: string
          included_minutes?: number
          included_numbers?: number
          is_custom?: boolean
          is_popular?: boolean
          max_concurrent_calls?: number
          max_receptionists?: number
          monthly_price?: number
          name: string
          overage_price_per_minute?: number
          sort_order?: number
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
        }
        Update: {
          active?: boolean
          annual_price?: number
          description?: string | null
          features?: Json
          highlights?: string[]
          id?: string
          included_minutes?: number
          included_numbers?: number
          is_custom?: boolean
          is_popular?: boolean
          max_concurrent_calls?: number
          max_receptionists?: number
          monthly_price?: number
          name?: string
          overage_price_per_minute?: number
          sort_order?: number
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receptionist_settings: {
        Row: {
          after_hours_enabled: boolean
          answering_mode: string
          appointment_booking_enabled: boolean
          call_transfer_enabled: boolean
          created_at: string
          id: string
          max_call_duration: number
          multilingual_enabled: boolean
          organization_id: string
          receptionist_id: string
          recording_enabled: boolean
          spam_filter_enabled: boolean
          transcription_enabled: boolean
          transfer_destinations: Json
          updated_at: string
          voicemail_enabled: boolean
        }
        Insert: {
          after_hours_enabled?: boolean
          answering_mode?: string
          appointment_booking_enabled?: boolean
          call_transfer_enabled?: boolean
          created_at?: string
          id?: string
          max_call_duration?: number
          multilingual_enabled?: boolean
          organization_id: string
          receptionist_id: string
          recording_enabled?: boolean
          spam_filter_enabled?: boolean
          transcription_enabled?: boolean
          transfer_destinations?: Json
          updated_at?: string
          voicemail_enabled?: boolean
        }
        Update: {
          after_hours_enabled?: boolean
          answering_mode?: string
          appointment_booking_enabled?: boolean
          call_transfer_enabled?: boolean
          created_at?: string
          id?: string
          max_call_duration?: number
          multilingual_enabled?: boolean
          organization_id?: string
          receptionist_id?: string
          recording_enabled?: boolean
          spam_filter_enabled?: boolean
          transcription_enabled?: boolean
          transfer_destinations?: Json
          updated_at?: string
          voicemail_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "receptionist_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptionist_settings_receptionist_id_fkey"
            columns: ["receptionist_id"]
            isOneToOne: true
            referencedRelation: "receptionists"
            referencedColumns: ["id"]
          },
        ]
      }
      receptionists: {
        Row: {
          after_hours_greeting: string | null
          config_version: number
          created_at: string
          custom_instructions: string | null
          elevenlabs_agent_id: string | null
          elevenlabs_phone_number_id: string | null
          greeting: string | null
          id: string
          language: string
          last_published_at: string | null
          name: string
          organization_id: string
          personality: string
          status: Database["public"]["Enums"]["receptionist_status"]
          status_message: string | null
          supported_languages: string[]
          system_prompt: string | null
          tone: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          after_hours_greeting?: string | null
          config_version?: number
          created_at?: string
          custom_instructions?: string | null
          elevenlabs_agent_id?: string | null
          elevenlabs_phone_number_id?: string | null
          greeting?: string | null
          id?: string
          language?: string
          last_published_at?: string | null
          name: string
          organization_id: string
          personality?: string
          status?: Database["public"]["Enums"]["receptionist_status"]
          status_message?: string | null
          supported_languages?: string[]
          system_prompt?: string | null
          tone?: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          after_hours_greeting?: string | null
          config_version?: number
          created_at?: string
          custom_instructions?: string | null
          elevenlabs_agent_id?: string | null
          elevenlabs_phone_number_id?: string | null
          greeting?: string | null
          id?: string
          language?: string
          last_published_at?: string | null
          name?: string
          organization_id?: string
          personality?: string
          status?: Database["public"]["Enums"]["receptionist_status"]
          status_message?: string | null
          supported_languages?: string[]
          system_prompt?: string | null
          tone?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receptionists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptionists_voice_id_fkey"
            columns: ["voice_id"]
            isOneToOne: false
            referencedRelation: "voices"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          created_at: string
          error: string | null
          error_id: string | null
          id: string
          organization_id: string
          pages_crawled: number
          pages_found: number
          progress: number
          result: Json | null
          stage: string
          status: Database["public"]["Enums"]["scan_status"]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          error_id?: string | null
          id?: string
          organization_id: string
          pages_crawled?: number
          pages_found?: number
          progress?: number
          result?: Json | null
          stage?: string
          status?: Database["public"]["Enums"]["scan_status"]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          error?: string | null
          error_id?: string | null
          id?: string
          organization_id?: string
          pages_crawled?: number
          pages_found?: number
          progress?: number
          result?: Json | null
          stage?: string
          status?: Database["public"]["Enums"]["scan_status"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          organization_id: string
          price: number | null
          price_note: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          organization_id: string
          price?: number | null
          price_note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          organization_id?: string
          price?: number | null
          price_note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          calendar_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          active?: boolean
          calendar_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          active?: boolean
          calendar_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          organization_id: string | null
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          organization_id?: string | null
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          organization_id?: string | null
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_overage_charges: {
        Row: {
          amount_cents: number
          billed_through_minutes: number
          created_at: string
          id: string
          minutes: number
          organization_id: string
          period_start: string
          status: string
          stripe_invoice_item_id: string | null
        }
        Insert: {
          amount_cents: number
          billed_through_minutes: number
          created_at?: string
          id?: string
          minutes: number
          organization_id: string
          period_start: string
          status?: string
          stripe_invoice_item_id?: string | null
        }
        Update: {
          amount_cents?: number
          billed_through_minutes?: number
          created_at?: string
          id?: string
          minutes?: number
          organization_id?: string
          period_start?: string
          status?: string
          stripe_invoice_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_overage_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voices: {
        Row: {
          accent: string
          active: boolean
          created_at: string
          description: string | null
          elevenlabs_voice_id: string
          gender: string | null
          id: string
          is_default: boolean
          language: string
          name: string
          preview_url: string | null
          recommended_industries: string[]
          sort_order: number
        }
        Insert: {
          accent?: string
          active?: boolean
          created_at?: string
          description?: string | null
          elevenlabs_voice_id: string
          gender?: string | null
          id?: string
          is_default?: boolean
          language?: string
          name: string
          preview_url?: string | null
          recommended_industries?: string[]
          sort_order?: number
        }
        Update: {
          accent?: string
          active?: boolean
          created_at?: string
          description?: string | null
          elevenlabs_voice_id?: string
          gender?: string | null
          id?: string
          is_default?: boolean
          language?: string
          name?: string
          preview_url?: string | null
          recommended_industries?: string[]
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      org_role: "owner" | "admin" | "member"
      receptionist_status:
        | "draft"
        | "scanning"
        | "review_required"
        | "creating_agent"
        | "agent_ready"
        | "phone_pending"
        | "phone_provisioning"
        | "phone_configuring"
        | "live"
        | "error"
        | "suspended"
      scan_status: "queued" | "crawling" | "extracting" | "completed" | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      org_role: ["owner", "admin", "member"],
      receptionist_status: [
        "draft",
        "scanning",
        "review_required",
        "creating_agent",
        "agent_ready",
        "phone_pending",
        "phone_provisioning",
        "phone_configuring",
        "live",
        "error",
        "suspended",
      ],
      scan_status: ["queued", "crawling", "extracting", "completed", "failed"],
    },
  },
} as const
