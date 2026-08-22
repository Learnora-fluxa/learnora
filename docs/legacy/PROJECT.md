# Learnora — Project Reference

## Overview
Multi-tenant LMS for smart education. Schools are isolated tenants (subdomain / school code). **175 screens total. MVP target: ~45–55 screens (Phases 1–5).**

## Roles
| Tag | Role | Notes |
|-----|------|-------|
| [S] | Student | Mobile-heavy |
| [T] | Teacher | Desktop-first |
| [A] | Admin (School) | Desktop-first |
| [P] | Parent | Mobile-heavy |
| [SU] | Super Admin | Learnora platform owner only |
| [X] | Shared | Across roles |

---

## Screen Index by Module

### 1. Authentication & Onboarding [X] — 12 screens
| ID | Screen | MVP? |
|----|--------|------|
| 1.1 | Splash Screen | Phase 1 |
| 1.2 | Onboarding Carousel | — |
| 1.3 | School Selector / Code Entry | Phase 1 |
| 1.4 | Login Screen | Phase 1 |
| 1.5 | Sign Up Screen | Phase 1 |
| 1.6 | Forgot Password | Phase 1 |
| 1.7 | OTP Verification | Phase 1 |
| 1.8 | Reset Password | Phase 1 |
| 1.9 | Role Selection | — |
| 1.10 | Complete Profile Setup | — |
| 1.11 | Invite Acceptance | Phase 1 |
| 1.12 | 2FA Setup (Optional) | — |

### 2. Student Dashboard [S] — 4 screens
| ID | Screen | MVP? |
|----|--------|------|
| 2.1 | Student Dashboard (welcome, stats, continue learning, schedule, AI shortcut) | Phase 2 |
| 2.2 | Quick Stats Widget | inline on 2.1 |
| 2.3 | Continue Learning Strip | inline on 2.1 |
| 2.4 | Today's Schedule Widget | inline on 2.1 |

### 3. Courses [S][T] — 12 screens
| ID | Screen | MVP? |
|----|--------|------|
| 3.1 | My Courses [S] | Phase 2 |
| 3.2 | Course Details [S] | Phase 2 |
| 3.3 | Lesson / Video Player [S] | Phase 2 |
| 3.4 | Lesson Notes [S] | — |
| 3.5 | Course Resources [S] | — |
| 3.6 | Discussion Forum [X] | — |
| 3.7 | Quiz Screen [S] | — |
| 3.8 | Quiz Result Screen [S] | — |
| 3.9 | Course Builder [T] | Phase 2 |
| 3.10 | Lesson Upload [T] | Phase 2 |
| 3.11 | Quiz Builder [T] | — |
| 3.12 | Course Settings [T] | — |

### 4. Assignments [S][T] — 10 screens
| ID | Screen | MVP? |
|----|--------|------|
| 4.1 | Assignments Overview [S] (tabs: All/Pending/Submitted/Graded) | Phase 2 |
| 4.2 | Assignment Details Drawer [S] (slide-over) | Phase 2 |
| 4.3 | Assignment Submission Modal [S] | Phase 2 |
| 4.4 | Submission Success State [S] | Phase 2 |
| 4.5 | My Submissions [S] | — |
| 4.6 | Assignment Builder [T] | Phase 2 |
| 4.7 | Submissions Inbox [T] | Phase 2 |
| 4.8 | Grading Screen [T] (side-by-side, rubric) | Phase 2 |
| 4.9 | Bulk Grade [T] | — |
| 4.10 | Plagiarism Check [T] | — |

### 5. Live Classes [S][T][X] — 9 screens
| ID | Screen | MVP? |
|----|--------|------|
| 5.1 | Live Classes Overview | Phase 6 |
| 5.2 | Live Class Room (video grid, chat, controls) | Phase 6 |
| 5.3 | Pre-class Lobby | Phase 6 |
| 5.4 | Whiteboard View [T] | Phase 6 |
| 5.5 | Screen Share View | Phase 6 |
| 5.6 | Participants Panel | Phase 6 |
| 5.7 | Class Recordings [S] | Phase 6 |
| 5.8 | Schedule Live Class [T] | Phase 6 |
| 5.9 | In-class Attendance [T] | Phase 6 |

### 6. Performance & Analytics [S][T][A][P] — 11 screens
| ID | Screen | MVP? |
|----|--------|------|
| 6.1 | Performance Overview [S] (GPA, attendance, streak) | Phase 3 |
| 6.2 | Subject Performance [S] (charts, term comparison) | Phase 3 |
| 6.3 | Attendance Analytics [S] | Phase 6 |
| 6.4 | Study Consistency [S] (streaks) | Phase 6 |
| 6.5 | AI Recommendations [S] | Phase 6 |
| 6.6 | Academic Goals [S] | Phase 6 |
| 6.7 | Leaderboard [S] | Phase 6 |
| 6.8 | Downloadable Reports [S][P] | Phase 5 |
| 6.9 | Class Performance [T] | Phase 6 |
| 6.10 | Student Detail View [T] | Phase 6 |
| 6.11 | Behavior Analytics [T][A] (at-risk flags) | Phase 6 |

### 7. AI Tutor [S] — 9 screens (Phase 6)
| ID | Screen |
|----|--------|
| 7.1 | AI Tutor Home (Explain / Quiz me / Summarize / Solve) |
| 7.2 | AI Chat Session (voice, code/math rendering) |
| 7.3 | Upload Materials (PDFs/images for context) |
| 7.4 | Generated Quiz |
| 7.5 | Flashcards View (card flip) |
| 7.6 | AI Study Plan (weekly, drag-to-reorder) |
| 7.7 | Saved Conversations |
| 7.8 | Image Question Solver (camera → step-by-step) |
| 7.9 | WAEC/NECO Exam Prep |

### 8. Messages [X] — 6 screens
| ID | Screen | MVP? |
|----|--------|------|
| 8.1 | Messages Overview (inbox, search, unread) | Phase 3 |
| 8.2 | Private Chat (voice notes, attachments) | Phase 3 |
| 8.3 | Class Group Chat | Phase 3 |
| 8.4 | Announcements Feed | Phase 3 |
| 8.5 | Compose Announcement [T][A] | Phase 3 |
| 8.6 | Shared Files Library | — |

### 9. Calendar [X] — 6 screens
| ID | Screen | MVP? |
|----|--------|------|
| 9.1 | Academic Calendar (month/week/day) | Phase 3 |
| 9.2 | Event Details | Phase 3 |
| 9.3 | Add Event Modal | — |
| 9.4 | Deadlines View | Phase 3 |
| 9.5 | Exam Schedule (read-only) | — |
| 9.6 | Study Planner (drag-drop weekly grid) | — |

### 10. Downloads / Offline [S] — 5 screens (Phase 6)
| ID | Screen |
|----|--------|
| 10.1 | Downloads Overview (storage usage) |
| 10.2 | Downloaded Videos |
| 10.3 | Downloaded PDFs/Notes |
| 10.4 | Offline Sync State (pending sync banner) |
| 10.5 | Storage Management |

### 11. Settings [X] — 9 screens
| ID | Screen | MVP? |
|----|--------|------|
| 11.1 | Settings Overview | Phase 5 |
| 11.2 | Profile Settings | Phase 5 |
| 11.3 | Notification Settings | Phase 5 |
| 11.4 | Security Settings | Phase 5 |
| 11.5 | Appearance Settings | — |
| 11.6 | Connected Devices | — |
| 11.7 | Privacy Settings | — |
| 11.8 | Linked Accounts | — |
| 11.9 | Logout Modal | Phase 5 |

### 12. Profile [S] — 5 screens
| ID | Screen | MVP? |
|----|--------|------|
| 12.1 | Student Profile | — |
| 12.2 | Achievements (badge grid) | — |
| 12.3 | Certificates | Phase 5 |
| 12.4 | Academic History | — |
| 12.5 | Badges & Rewards | — |

### 13. Notifications [X] — 3 screens
| ID | Screen | MVP? |
|----|--------|------|
| 13.1 | Notifications Overview (tabs by type) | Phase 3 |
| 13.2 | Notification Details | Phase 3 |
| 13.3 | Announcement Details | — |

### 14. Search [X] — 3 screens
| ID | Screen | MVP? |
|----|--------|------|
| 14.1 | Global Search (Cmd+K modal) | Phase 5 |
| 14.2 | Search Results (tabs + filters) | Phase 5 |
| 14.3 | Recent Searches | Phase 5 |

### 15. Empty & System States [X] — 9 screens (Phase 5)
| ID | Screen |
|----|--------|
| 15.1 | No Courses |
| 15.2 | No Assignments |
| 15.3 | No Notifications |
| 15.4 | No Search Results |
| 15.5 | No Internet / Offline |
| 15.6 | 404 / Not Found |
| 15.7 | 403 / No Permission |
| 15.8 | Maintenance Screen |
| 15.9 | Subscription Expired [A] |

### 16. Teacher Module [T] — 13 screens
| ID | Screen | MVP? |
|----|--------|------|
| 16.1 | Teacher Dashboard | Phase 2 |
| 16.2 | My Classes | Phase 2 |
| 16.3 | Class Details (roster, content, analytics tabs) | Phase 2 |
| 16.4 | Manage Students | Phase 2 |
| 16.5 | Attendance Management | Phase 2 |
| 16.6 | Attendance History | — |
| 16.7 | Grading Screen (centralized hub) | Phase 2 |
| 16.8 | Gradebook (spreadsheet, export) | — |
| 16.9 | Lesson Planner | — |
| 16.10 | Teacher Analytics | — |
| 16.11 | Teacher Messages | Phase 3 |
| 16.12 | Question Bank | — |
| 16.13 | Report Card Generator | Phase 5 |

### 17. Admin Module [A] — 17 screens
| ID | Screen | MVP? |
|----|--------|------|
| 17.1 | Admin Dashboard (students, teachers, attendance, revenue, alerts) | Phase 1 |
| 17.2 | School Analytics | — |
| 17.3 | User Management (table, role filter, bulk actions) | Phase 1 |
| 17.4 | Invite Users (CSV + email) | Phase 1 |
| 17.5 | Classes Management | Phase 2 |
| 17.6 | Timetable Management (grid editor) | — |
| 17.7 | Term & Calendar Setup | — |
| 17.8 | Finance Management (fee structures, invoices) | Phase 4 |
| 17.9 | Fee Collection | Phase 4 |
| 17.10 | Subscription & Billing | Phase 4 |
| 17.11 | Payment Integration (Paystack/Flutterwave/Stripe) | Phase 4 |
| 17.12 | Reports | Phase 5 |
| 17.13 | Custom Report Builder | — |
| 17.14 | System Settings (branding, domain, logo) | — |
| 17.15 | Audit Logs | — |
| 17.16 | Roles & Permissions (permission matrix) | — |
| 17.17 | Integrations (Google Drive, Zoom, etc.) | — |

### 18. Parent Module [P] — 11 screens
| ID | Screen | MVP? |
|----|--------|------|
| 18.1 | Parent Dashboard (child switcher, today's snapshot) | Phase 4 |
| 18.2 | Child Selector | Phase 4 |
| 18.3 | Child Performance (read-only analytics) | Phase 4 |
| 18.4 | Child Attendance | Phase 4 |
| 18.5 | Child Timetable | — |
| 18.6 | Fee Status (invoices, pay button) | Phase 4 |
| 18.7 | Pay Fees Flow | Phase 4 |
| 18.8 | Teacher Communication | Phase 4 |
| 18.9 | Permission Slips (e-sign) | — |
| 18.10 | Report Cards | Phase 5 |
| 18.11 | School Announcements (read-only) | — |

### 19. Super Admin [SU] — 11 screens
| ID | Screen | MVP? |
|----|--------|------|
| 19.1 | Platform Dashboard (MRR, students, active schools, churn) | Phase 1 |
| 19.2 | Schools List (plan, status, MRR per school) | Phase 1 |
| 19.3 | School Detail (usage, billing, support history) | — |
| 19.4 | Onboard New School (wizard) | Phase 1 |
| 19.5 | Plans & Pricing | — |
| 19.6 | Global Billing (Stripe-synced) | — |
| 19.7 | Platform Analytics | — |
| 19.8 | Support Tickets | — |
| 19.9 | Feature Flags (per-school toggles) | — |
| 19.10 | Platform Settings | — |
| 19.11 | Email Templates | — |

### 20. Premium / Optional — 10 screens (Post-MVP)
Study Rooms, Voice AI, Gamification Hub, Marketplace, Career Guidance, Parent-Teacher Conference, Transport Tracking, Library, Health Records, Referral Program.

---

## MVP Build Phases

| Phase | Weeks | Scope |
|-------|-------|-------|
| 1 — Foundation | 1–3 | Auth (1.1, 1.3–1.8, 1.11), Super Admin (19.2, 19.4), Admin (17.1, 17.3, 17.4) |
| 2 — Core LMS | 4–7 | Student Dashboard (2.1), Courses (3.1–3.3), Teacher (16.1, 3.9, 3.10), Assignments (4.1–4.4, 4.6–4.8), Attendance (16.5) |
| 3 — Engagement | 8–10 | Messages (8.1–8.4), Notifications (13.1–13.2), Calendar (9.1, 9.4), Performance (6.1–6.2) |
| 4 — Parents & Billing | 11–12 | Parent (18.1, 18.3–18.4, 18.6), Admin Finance (17.8–17.10), Stripe |
| 5 — Polish & Launch | 13–14 | Empty/error states (15.*), Settings (11.1–11.4), Search (14.1–14.2), Reports (6.8, 16.13) |
| 6 — Differentiators | Post-MVP | Live Classes (5.*), AI Tutor (7.*), Offline (10.*), Deep Analytics |

---

## Sidebar Navigation Reference

**Student:** Dashboard · My Courses · Assignments · Live Classes · Performance · AI Tutor · Messages · Calendar · Downloads · Settings

**Teacher:** Dashboard · My Classes · Assignments & Grading · Attendance · Live Classes · Gradebook · Analytics · Messages · Question Bank · Settings

**Admin:** Dashboard · Users · Classes · Timetable · Finance · Subscription · Analytics · Reports · Settings

**Parent:** Dashboard · My Children · Performance · Attendance · Fees · Messages · Announcements · Settings

**Super Admin:** Platform Dashboard · Schools · Billing · Plans · Analytics · Support · Settings

---

## Core Differentiators (lead in UX & marketing)
- AI Tutor with voice & image input
- Behavior analytics & at-risk student flags
- Offline-first / low-bandwidth optimized (PWA + service worker)
- Study consistency tracking with streaks
- Smart performance recommendations
- WAEC/NECO exam preparation
- Built-in school operations (finance, attendance, timetable)
- Per-student subscription — schools pay only for active users
