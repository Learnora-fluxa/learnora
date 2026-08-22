# Learnora Product Requirements

## 1. Product Summary

Learnora is a multi-tenant SaaS learning platform for K-12 and secondary schools. It combines school operations, classroom delivery, assessment, communication, parent engagement, and AI-assisted learning in one system.

The product must support five first-class domains:

1. School Management
2. Teaching and Learning
3. Artificial Intelligence
4. Parent Engagement
5. Platform and Infrastructure

## 2. Vision

Learnora helps schools replace fragmented tools with one platform that improves academic outcomes, operational efficiency, and family engagement.

## 3. Primary Users

### Super Admin

- Operates the Learnora platform across all tenants
- Manages onboarding, billing, platform settings, support, and analytics

### School Admin

- Configures a school tenant
- Manages users, classes, calendars, fees, reporting, and oversight

### Teacher

- Runs instruction, assignments, grading, class communication, and live sessions

### Student

- Consumes lessons, submits work, tracks progress, joins classes, and uses AI study tools

### Parent

- Tracks child progress, attendance, school fees, report cards, and communication with the school

## 4. Core Product Modules

### School Management

- Tenant onboarding
- User and role management
- Class, subject, and timetable management
- Term and academic calendar setup
- School-wide reporting

### Teaching and Learning

- Course authoring
- Lesson delivery
- Assignment and quiz workflows
- Grading and report cards
- Live classes and recordings

### AI Platform

- Teacher assistant
- Student tutor
- Parent assistant
- Assessment and rubric generation
- AI grading and OCR
- Recommendation engine

### Parent Engagement

- Parent dashboard
- Report cards
- Fee management
- Messaging and announcements
- Attendance and homework tracking
- AI-generated child progress summaries

### Platform and Infrastructure

- Authentication and authorization
- Notifications
- Analytics
- Payments
- Auditability
- Reliability, observability, and tenant isolation

## 5. Parent Portal Requirements

The parent experience is a core product surface, not an add-on.

### Parent Dashboard

- Child summary and class details
- Academic performance overview
- Attendance status and alerts
- Upcoming exams and assignments
- Fee balance and recent payments
- Announcements
- AI-generated progress summary

### Parent Academic Progress

- Subject-level performance
- Assessment history
- Assignment completion and missing work
- Teacher remarks
- Trend visualizations
- Topic mastery summaries

### Parent Finance

- Invoices and balances
- Online payments
- Receipts and payment history
- Installment visibility where enabled
- Payment reminders

### Parent Communication

- Direct messages with teachers and school staff
- Announcements
- Meeting requests
- Attachments
- Push, email, and in-app delivery

## 6. AI Product Requirements

AI features must operate as constrained assistants, not unrestricted chatbots.

### Teacher Assistant

- Generate lesson ideas, quizzes, rubrics, summaries, and intervention suggestions

### Student Tutor

- Explain concepts
- Generate study plans
- Create practice questions and flashcards
- Help with exam preparation

### Parent Assistant

- Explain report cards
- Summarize performance trends
- Suggest at-home support activities
- Highlight risk areas based only on approved school data

## 7. Product Principles

- Tenant isolation is mandatory
- Parents are a first-class role
- AI must be explainable, auditable, and data-bounded
- Mobile-first experiences matter for parents and students
- Admin and teacher workflows must reduce operational load, not add to it

## 8. Success Metrics

### School Outcomes

- School onboarding completion rate
- Monthly active schools
- Subscription retention

### Teaching and Learning

- Teacher assignment publish rate
- Student submission rate
- Live class participation rate
- Grade turnaround time

### Parent Engagement

- Parent weekly active rate
- Parent payment completion rate
- Parent-teacher message response time

### AI Usage

- Weekly AI sessions by role
- AI completion rate per workflow
- Cost per successful AI task
- Hallucination and escalation incident rate
