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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string | null
          school_id: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role?: string | null
          school_id: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string | null
          school_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sessions: {
        Row: {
          created_at: string | null
          id: string
          school_id: string
          student_id: string
          subject: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          school_id: string
          student_id: string
          subject?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          school_id?: string
          student_id?: string
          subject?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          body: string | null
          id: string
          published_at: string | null
          school_id: string
          target_roles: string[] | null
          title: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          id?: string
          published_at?: string | null
          school_id: string
          target_roles?: string[] | null
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          id?: string
          published_at?: string | null
          school_id?: string
          target_roles?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          id: string
          school_id: string
          status: string | null
          student_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          id?: string
          school_id: string
          status?: string | null
          student_id: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          id?: string
          school_id?: string
          status?: string | null
          student_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_url: string | null
          class_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          max_score: number | null
          school_id: string
          subject_id: string | null
          teacher_id: string | null
          term_id: string | null
          title: string
        }
        Insert: {
          attachment_url?: string | null
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_score?: number | null
          school_id: string
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          title: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_score?: number | null
          school_id?: string
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          class_id: string
          date: string
          id: string
          marked_at: string | null
          school_id: string
          source: string | null
          status: string | null
          student_id: string
          subject_id: string | null
          teacher_id: string | null
          term_id: string | null
        }
        Insert: {
          class_id: string
          date: string
          id?: string
          marked_at?: string | null
          school_id: string
          source?: string | null
          status?: string | null
          student_id: string
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
        }
        Update: {
          class_id?: string
          date?: string
          id?: string
          marked_at?: string | null
          school_id?: string
          source?: string | null
          status?: string | null
          student_id?: string
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          school_id: string
          start_date: string
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          school_id: string
          start_date: string
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          school_id?: string
          start_date?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string | null
          id: string
          school_id: string
          student_id: string
          term_id: string | null
        }
        Insert: {
          class_id: string
          enrolled_at?: string | null
          id?: string
          school_id: string
          student_id: string
          term_id?: string | null
        }
        Update: {
          class_id?: string
          enrolled_at?: string | null
          id?: string
          school_id?: string
          student_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          id: string
          school_id: string
          subject_id: string
        }
        Insert: {
          class_id: string
          id?: string
          school_id: string
          subject_id: string
        }
        Update: {
          class_id?: string
          id?: string
          school_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          arm: string | null
          created_at: string | null
          form_teacher_id: string | null
          id: string
          level: string | null
          name: string
          school_id: string
          term_id: string | null
        }
        Insert: {
          arm?: string | null
          created_at?: string | null
          form_teacher_id?: string | null
          id?: string
          level?: string | null
          name: string
          school_id: string
          term_id?: string | null
        }
        Update: {
          arm?: string | null
          created_at?: string | null
          form_teacher_id?: string | null
          id?: string
          level?: string | null
          name?: string
          school_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_form_teacher_id_fkey"
            columns: ["form_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          school_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          school_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          name: string | null
          school_id: string
          type: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          school_id: string
          type?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          school_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          school_id: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          school_id: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          school_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          class_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          school_id: string
          subject_id: string | null
          teacher_id: string | null
          term_id: string | null
          title: string
        }
        Insert: {
          class_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          school_id: string
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          title: string
        }
        Update: {
          class_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          school_id?: string
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          enabled: boolean | null
          flag_name: string
          id: string
          school_id: string
        }
        Insert: {
          enabled?: boolean | null
          flag_name: string
          id?: string
          school_id: string
        }
        Update: {
          enabled?: boolean | null
          flag_name?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_level_configs: {
        Row: {
          id: string
          items: Json
          level: string
          school_id: string
          term: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          items?: Json
          level: string
          school_id: string
          term: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          items?: Json
          level?: string
          school_id?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_level_configs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_mandatory: boolean | null
          name: string
          school_id: string
          term_id: string | null
        }
        Insert: {
          amount: number
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          name: string
          school_id: string
          term_id?: string | null
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_mandatory?: boolean | null
          name?: string
          school_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_summaries: {
        Row: {
          average_score: number | null
          grade_letter: string | null
          id: string
          position_in_class: number | null
          school_id: string
          student_id: string
          subject_id: string | null
          term_id: string | null
          total_assignments: number | null
        }
        Insert: {
          average_score?: number | null
          grade_letter?: string | null
          id?: string
          position_in_class?: number | null
          school_id: string
          student_id: string
          subject_id?: string | null
          term_id?: string | null
          total_assignments?: number | null
        }
        Update: {
          average_score?: number | null
          grade_letter?: string | null
          id?: string
          position_in_class?: number | null
          school_id?: string
          student_id?: string
          subject_id?: string | null
          term_id?: string | null
          total_assignments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_summaries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_summaries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_summaries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_summaries_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_id: string
          feedback: string | null
          graded_at: string | null
          id: string
          max_score: number | null
          school_id: string
          score: number | null
          student_id: string
          submission_id: string
          teacher_id: string | null
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          graded_at?: string | null
          id?: string
          max_score?: number | null
          school_id: string
          score?: number | null
          student_id: string
          submission_id: string
          teacher_id?: string | null
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          graded_at?: string | null
          id?: string
          max_score?: number | null
          school_id?: string
          score?: number | null
          student_id?: string
          submission_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          class_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
          school_id: string
          status: string | null
          token: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role: string
          school_id: string
          status?: string | null
          token?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          school_id?: string
          status?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          due_date: string | null
          fee_structure_id: string | null
          id: string
          paid_amount: number | null
          payment_method: string | null
          paystack_reference: string | null
          school_id: string
          status: string | null
          student_id: string
          term_id: string | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          paid_amount?: number | null
          payment_method?: string | null
          paystack_reference?: string | null
          school_id: string
          status?: string | null
          student_id: string
          term_id?: string | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          paid_amount?: number | null
          payment_method?: string | null
          paystack_reference?: string | null
          school_id?: string
          status?: string | null
          student_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          last_position_seconds: number | null
          lesson_id: string
          school_id: string
          student_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          last_position_seconds?: number | null
          lesson_id: string
          school_id: string
          student_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          last_position_seconds?: number | null
          lesson_id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_url: string | null
          course_id: string
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          module_id: string
          position: number | null
          school_id: string
          title: string
          type: string | null
        }
        Insert: {
          content_url?: string | null
          course_id: string
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id: string
          position?: number | null
          school_id: string
          title: string
          type?: string | null
        }
        Update: {
          content_url?: string | null
          course_id?: string
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          position?: number | null
          school_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      live_attendance: {
        Row: {
          id: string
          joined_at: string | null
          left_at: string | null
          school_id: string
          session_id: string
          student_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          school_id: string
          session_id: string
          student_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          school_id?: string
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          class_id: string | null
          created_at: string | null
          daily_room_url: string | null
          duration_minutes: number | null
          id: string
          scheduled_at: string | null
          school_id: string
          status: string | null
          subject_id: string | null
          teacher_id: string | null
          term_id: string | null
          topic: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          daily_room_url?: string | null
          duration_minutes?: number | null
          id?: string
          scheduled_at?: string | null
          school_id: string
          status?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          topic: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          daily_room_url?: string | null
          duration_minutes?: number | null
          id?: string
          scheduled_at?: string | null
          school_id?: string
          status?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term_id?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string | null
          conversation_id: string
          id: string
          school_id: string
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          id?: string
          school_id: string
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          id?: string
          school_id?: string
          sender_id?: string
          sent_at?: string | null
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
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
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
      modules: {
        Row: {
          course_id: string
          id: string
          position: number | null
          school_id: string
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position?: number | null
          school_id: string
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number | null
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          school_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          school_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          school_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          currency: string | null
          id: string
          invoice_id: string
          paid_at: string | null
          paystack_reference: string | null
          paystack_status: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          amount: number
          currency?: string | null
          id?: string
          invoice_id: string
          paid_at?: string | null
          paystack_reference?: string | null
          paystack_status?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          amount?: number
          currency?: string | null
          id?: string
          invoice_id?: string
          paid_at?: string | null
          paystack_reference?: string | null
          paystack_status?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_schools: {
        Row: {
          id: string
          mrr_ngn: number | null
          onboarded_at: string | null
          plan: string | null
          school_id: string | null
          status: string | null
          students_billed: number | null
        }
        Insert: {
          id?: string
          mrr_ngn?: number | null
          onboarded_at?: string | null
          plan?: string | null
          school_id?: string | null
          status?: string | null
          students_billed?: number | null
        }
        Update: {
          id?: string
          mrr_ngn?: number | null
          onboarded_at?: string | null
          plan?: string | null
          school_id?: string | null
          status?: string | null
          students_billed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          notification_prefs: Record<string, boolean> | null
          phone: string | null
          role: string
          school_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          notification_prefs?: Record<string, boolean> | null
          phone?: string | null
          role?: string
          school_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          notification_prefs?: Record<string, boolean> | null
          phone?: string | null
          role?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          generated_at: string | null
          id: string
          pdf_url: string | null
          published_at: string | null
          school_id: string
          status: string | null
          student_id: string
          term_id: string | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          pdf_url?: string | null
          published_at?: string | null
          school_id: string
          status?: string | null
          student_id: string
          term_id?: string | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          pdf_url?: string | null
          published_at?: string | null
          school_id?: string
          status?: string | null
          student_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          id: string
          paystack_public_key: string | null
          paystack_secret_key: string | null
          paystack_subaccount_code: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          id?: string
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          paystack_subaccount_code?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          id?: string
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          paystack_subaccount_code?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          student_count: number | null
          subscription_confirmed_at: string | null
          subscription_confirmed_by: string | null
          subscription_payment_method: string | null
          subscription_plan: string | null
          subscription_status: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          student_count?: number | null
          subscription_confirmed_at?: string | null
          subscription_confirmed_by?: string | null
          subscription_payment_method?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          student_count?: number | null
          subscription_confirmed_at?: string | null
          subscription_confirmed_by?: string | null
          subscription_payment_method?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          recording_url: string | null
          school_id: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          recording_url?: string | null
          school_id: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          recording_url?: string | null
          school_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string | null
          id: string
          priority: string | null
          school_id: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          school_id?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          school_id?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          class_id: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string
          term_id: string | null
        }
        Insert: {
          class_id: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id: string
          term_id?: string | null
        }
        Update: {
          class_id?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          school_id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          school_id: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          school_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_exams: {
        Row: {
          class_id: string
          created_at: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          lesson_id: string | null
          randomize: boolean | null
          scheduled_at: string | null
          school_id: string
          status: string | null
          subject_id: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          randomize?: boolean | null
          scheduled_at?: string | null
          school_id: string
          status?: string | null
          subject_id?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          randomize?: boolean | null
          scheduled_at?: string | null
          school_id?: string
          status?: string | null
          subject_id?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: []
      }
      cbt_attempts: {
        Row: {
          answers: unknown | null
          auto_submitted: boolean | null
          exam_id: string
          id: string
          max_score: number | null
          school_id: string
          score: number | null
          started_at: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: unknown | null
          auto_submitted?: boolean | null
          exam_id: string
          id?: string
          max_score?: number | null
          school_id: string
          score?: number | null
          started_at?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: unknown | null
          auto_submitted?: boolean | null
          exam_id?: string
          id?: string
          max_score?: number | null
          school_id?: string
          score?: number | null
          started_at?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          id: string
          key: string
          name: string
          subject: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body: string
          category?: string | null
          id?: string
          key: string
          name: string
          subject?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          id?: string
          key?: string
          name?: string
          subject?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          created_by: string | null
          exam_id: string | null
          explanation: string | null
          id: string
          lesson_id: string | null
          options: unknown | null
          order_index: number | null
          points: number | null
          question: string
          school_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          exam_id?: string | null
          explanation?: string | null
          id?: string
          lesson_id?: string | null
          options?: unknown | null
          order_index?: number | null
          points?: number | null
          question: string
          school_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          exam_id?: string | null
          explanation?: string | null
          id?: string
          lesson_id?: string | null
          options?: unknown | null
          order_index?: number | null
          points?: number | null
          question?: string
          school_id?: string
          type?: string
        }
        Relationships: []
      }
      teacher_resources: {
        Row: {
          admin_note: string | null
          class_id: string | null
          created_at: string | null
          file_url: string | null
          id: string
          school_id: string
          status: string | null
          subject_id: string | null
          teacher_id: string
          title: string
          type: string
        }
        Insert: {
          admin_note?: string | null
          class_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          school_id: string
          status?: string | null
          subject_id?: string | null
          teacher_id: string
          title: string
          type: string
        }
        Update: {
          admin_note?: string | null
          class_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          school_id?: string
          status?: string | null
          subject_id?: string | null
          teacher_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          id: string
          per_student_price: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          id?: string
          per_student_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          id?: string
          per_student_price?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_school_id: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
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
