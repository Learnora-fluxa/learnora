-- ============================================================
-- Migration 001: Admin Panel Support
-- Run this in Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Add form_teacher_id column to classes
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS form_teacher_id UUID REFERENCES public.profiles(id);

-- Create invitations table (used for the Add User → invite link flow)
CREATE TABLE IF NOT EXISTS public.invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  email      TEXT,
  full_name  TEXT,
  role       TEXT NOT NULL CHECK (role IN ('student','teacher','parent')),
  class_id   UUID REFERENCES public.classes(id),
  token      TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admin can manage invitations for their school
CREATE POLICY "invitations_admin_all" ON public.invitations
  FOR ALL USING (school_id = get_my_school_id())
  WITH CHECK (school_id = get_my_school_id());

-- Allow anonymous/public read by token (tokens are 32-char random hex — safe for invite links)
CREATE POLICY "invitations_public_read" ON public.invitations
  FOR SELECT TO anon USING (true);

-- Allow authenticated users to read and update their accepted invite (for InviteAcceptancePage)
CREATE POLICY "invitations_auth_read" ON public.invitations
  FOR SELECT TO authenticated USING (true);
