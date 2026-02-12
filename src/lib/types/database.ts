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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          published_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_forms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          schema: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          schema: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          schema?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      application_status_history: {
        Row: {
          application_id: string | null
          changed_by: string | null
          created_at: string | null
          from_status: string | null
          id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          application_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status: string
        }
        Update: {
          application_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string | null
          discord_id: string | null
          discord_username: string | null
          email: string
          form_id: string | null
          id: string
          responses: Json
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discord_id?: string | null
          discord_username?: string | null
          email: string
          form_id?: string | null
          id?: string
          responses: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discord_id?: string | null
          discord_username?: string | null
          email?: string
          form_id?: string | null
          id?: string
          responses?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "application_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          abbreviation: string | null
          award_type: string
          created_at: string
          description: string | null
          id: string
          name: string
          precedence: number
          ribbon_url: string | null
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          award_type: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          precedence?: number
          ribbon_url?: string | null
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          award_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          precedence?: number
          ribbon_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      billets: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_leadership: boolean | null
          min_rank_id: string | null
          slots: number | null
          title: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_leadership?: boolean | null
          min_rank_id?: string | null
          slots?: number | null
          title: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_leadership?: boolean | null
          min_rank_id?: string | null
          slots?: number | null
          title?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          message: string
          name: string
          responded_at: string | null
          responded_by: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          message: string
          name: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          message?: string
          name?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discharge_records: {
        Row: {
          created_at: string | null
          discharge_date: string
          discharge_type: string
          id: string
          member_id: string | null
          notes: string | null
          processed_by: string | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          discharge_date: string
          discharge_type: string
          id?: string
          member_id?: string | null
          notes?: string | null
          processed_by?: string | null
          reason: string
        }
        Update: {
          created_at?: string | null
          discharge_date?: string
          discharge_type?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          processed_by?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "discharge_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_records_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_actions: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          evidence_url: string | null
          id: string
          incident_date: string
          issued_by: string | null
          member_id: string | null
          severity: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          evidence_url?: string | null
          id?: string
          incident_date: string
          issued_by?: string | null
          member_id?: string | null
          severity: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          evidence_url?: string | null
          id?: string
          incident_date?: string
          issued_by?: string | null
          member_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_actions_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_type: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_type: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          document_type: string | null
          file_url: string
          id: string
          member_id: string | null
          tags: string[] | null
          template_id: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          file_url: string
          id?: string
          member_id?: string | null
          tags?: string[] | null
          template_id?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          file_url?: string
          id?: string
          member_id?: string | null
          tags?: string[] | null
          template_id?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enlistments: {
        Row: {
          age: number | null
          arma_experience: string | null
          discord_username: string
          display_name: string
          id: string
          notes: string | null
          referred_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          soldier_id: string | null
          status: string
          submitted_at: string
          timezone: string | null
          why_join: string
        }
        Insert: {
          age?: number | null
          arma_experience?: string | null
          discord_username: string
          display_name: string
          id?: string
          notes?: string | null
          referred_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soldier_id?: string | null
          status?: string
          submitted_at?: string
          timezone?: string | null
          why_join: string
        }
        Update: {
          age?: number | null
          arma_experience?: string | null
          discord_username?: string
          display_name?: string
          id?: string
          notes?: string | null
          referred_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soldier_id?: string | null
          status?: string
          submitted_at?: string
          timezone?: string | null
          why_join?: string
        }
        Relationships: [
          {
            foreignKeyName: "enlistments_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      leave_of_absence: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          end_date: string | null
          id: string
          member_id: string | null
          notes: string | null
          reason: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_of_absence_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_of_absence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_public: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_awards: {
        Row: {
          award_id: string
          awarded_by: string | null
          awarded_date: string
          citation: string | null
          created_at: string
          id: string
          member_id: string
          orders_url: string | null
        }
        Insert: {
          award_id: string
          awarded_by?: string | null
          awarded_date?: string
          citation?: string | null
          created_at?: string
          id?: string
          member_id: string
          orders_url?: string | null
        }
        Update: {
          award_id?: string
          awarded_by?: string | null
          awarded_date?: string
          citation?: string | null
          created_at?: string
          id?: string
          member_id?: string
          orders_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_awards_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_awards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      member_billets: {
        Row: {
          billet_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          member_id: string | null
          start_date: string
        }
        Insert: {
          billet_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          member_id?: string | null
          start_date?: string
        }
        Update: {
          billet_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          member_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_billets_billet_id_fkey"
            columns: ["billet_id"]
            isOneToOne: false
            referencedRelation: "billets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_billets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_custom_fields: {
        Row: {
          created_at: string | null
          field_id: string | null
          id: string
          member_id: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          member_id?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string | null
          id?: string
          member_id?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_custom_fields_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_custom_fields_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_qualifications: {
        Row: {
          awarded_by: string | null
          awarded_date: string
          created_at: string
          evidence_url: string | null
          expiration_date: string | null
          id: string
          member_id: string
          notes: string | null
          qualification_id: string
          status: string
          updated_at: string
        }
        Insert: {
          awarded_by?: string | null
          awarded_date?: string
          created_at?: string
          evidence_url?: string | null
          expiration_date?: string | null
          id?: string
          member_id: string
          notes?: string | null
          qualification_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          awarded_by?: string | null
          awarded_date?: string
          created_at?: string
          evidence_url?: string | null
          expiration_date?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          qualification_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_qualifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
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
          notification_type: string | null
          recipient_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          notification_type?: string | null
          recipient_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          notification_type?: string | null
          recipient_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_attendance: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          operation_id: string
          recorded_by: string | null
          role_held: string | null
          soldier_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          operation_id: string
          recorded_by?: string | null
          role_held?: string | null
          soldier_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          operation_id?: string
          recorded_by?: string | null
          role_held?: string | null
          soldier_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_attendance_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_attendance_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          operation_date: string
          operation_type: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          operation_date: string
          operation_type: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          operation_date?: string
          operation_type?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          category: string
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      personnel_assignments: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          member_id: string | null
          start_date: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          member_id?: string | null
          start_date?: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          member_id?: string | null
          start_date?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          discharge_date: string | null
          discord_id: string | null
          first_name: string
          id: string
          join_date: string
          last_name: string
          primary_billet_id: string | null
          rank_id: string | null
          role_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          discharge_date?: string | null
          discord_id?: string | null
          first_name: string
          id?: string
          join_date?: string
          last_name: string
          primary_billet_id?: string | null
          rank_id?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          discharge_date?: string | null
          discord_id?: string | null
          first_name?: string
          id?: string
          join_date?: string
          last_name?: string
          primary_billet_id?: string | null
          rank_id?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_billet_id_fkey"
            columns: ["primary_billet_id"]
            isOneToOne: false
            referencedRelation: "billets"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_history: {
        Row: {
          created_at: string | null
          effective_date: string
          from_rank_id: string | null
          id: string
          member_id: string | null
          notes: string | null
          orders_url: string | null
          promoted_by: string | null
          to_rank_id: string
        }
        Insert: {
          created_at?: string | null
          effective_date?: string
          from_rank_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          orders_url?: string | null
          promoted_by?: string | null
          to_rank_id: string
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          from_rank_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          orders_url?: string | null
          promoted_by?: string | null
          to_rank_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_requirements: {
        Row: {
          created_at: string | null
          from_rank_id: string | null
          id: string
          min_tig_days: number | null
          min_tis_days: number | null
          required_qualifications: string[] | null
          to_rank_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_rank_id?: string | null
          id?: string
          min_tig_days?: number | null
          min_tis_days?: number | null
          required_qualifications?: string[] | null
          to_rank_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_rank_id?: string | null
          id?: string
          min_tig_days?: number | null
          min_tis_days?: number | null
          required_qualifications?: string[] | null
          to_rank_id?: string | null
        }
        Relationships: []
      }
      qualifications: {
        Row: {
          abbreviation: string | null
          badge_url: string | null
          category: string | null
          created_at: string
          description: string | null
          expiration_days: number | null
          expires: boolean
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          badge_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expiration_days?: number | null
          expires?: boolean
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          badge_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expiration_days?: number | null
          expires?: boolean
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ranks: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          insignia_url: string | null
          name: string
          sort_order: number
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          insignia_url?: string | null
          name: string
          sort_order: number
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          insignia_url?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
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
      service_records: {
        Row: {
          action_type: string
          id: string
          occurred_at: string
          payload: Json
          performed_by: string | null
          soldier_id: string
          visibility: string
        }
        Insert: {
          action_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          performed_by?: string | null
          soldier_id: string
          visibility?: string
        }
        Update: {
          action_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          performed_by?: string | null
          soldier_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      soldiers: {
        Row: {
          callsign: string | null
          created_at: string
          discord_id: string | null
          display_name: string
          id: string
          joined_at: string
          mos: string | null
          rank_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          callsign?: string | null
          created_at?: string
          discord_id?: string | null
          display_name: string
          id?: string
          joined_at?: string
          mos?: string | null
          rank_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          callsign?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string
          id?: string
          joined_at?: string
          mos?: string | null
          rank_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soldiers_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soldiers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          abbreviation: string | null
          created_at: string
          id: string
          name: string
          parent_unit_id: string | null
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          name: string
          parent_unit_id?: string | null
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_complete_loa: { Args: never; Returns: undefined }
      calculate_tig: { Args: { p_member_id: string }; Returns: unknown }
      calculate_tis: { Args: { p_member_id: string }; Returns: unknown }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "command" | "nco" | "member"
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
    Enums: {
      app_role: ["admin", "command", "nco", "member"],
    },
  },
} as const
