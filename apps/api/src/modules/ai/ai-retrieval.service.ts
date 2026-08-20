import { ForbiddenException, Injectable } from '@nestjs/common'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type { AssistantRequest, RetrievedContext } from './ai.types.js'
import { AiPolicyService } from './ai-policy.service.js'

@Injectable()
export class AiRetrievalService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiPolicyService: AiPolicyService,
  ) {}

  async buildContext(user: AuthenticatedUser, request: AssistantRequest): Promise<RetrievedContext> {
    this.aiPolicyService.validateScope(user, request)

    const assistantType = this.aiPolicyService.resolveAssistantType(user)
    const taskType = this.aiPolicyService.resolveTaskType(request.prompt, assistantType)

    if (assistantType === 'student') {
      return this.buildStudentContext(user, request, taskType)
    }

    if (assistantType === 'teacher') {
      return this.buildTeacherContext(user, request, taskType)
    }

    if (assistantType === 'parent') {
      return this.buildParentContext(user, request, taskType)
    }

    return this.buildAdminContext(user, request, taskType)
  }

  private async buildStudentContext(
    user: AuthenticatedUser,
    request: AssistantRequest,
    taskType: RetrievedContext['taskType'],
  ): Promise<RetrievedContext> {
    const [profileRes, gradesRes, attendanceRes, announcementsRes, enrollmentRes, submissionRes] = await Promise.all([
      this.supabaseService.admin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle(),
      this.supabaseService.admin
        .from('grade_summaries')
        .select('average_score, grade_letter, subject_id')
        .eq('student_id', user.id)
        .order('average_score', { ascending: false })
        .limit(3),
      this.supabaseService.admin
        .from('attendance_records')
        .select('status, date')
        .eq('student_id', user.id)
        .order('date', { ascending: false })
        .limit(5),
      this.supabaseService.admin
        .from('announcements')
        .select('id, title, published_at')
        .eq('school_id', user.schoolId)
        .order('published_at', { ascending: false })
        .limit(3),
      this.supabaseService.admin
        .from('class_enrollments')
        .select('class_id, classes!class_id(name)')
        .eq('student_id', user.id)
        .limit(5),
      this.supabaseService.admin
        .from('assignment_submissions')
        .select('assignment_id, status, submitted_at')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(10),
    ])

    const subjectIds = Array.from(new Set((gradesRes.data ?? []).map((row) => row.subject_id).filter(Boolean) as string[]))
    const subjectNameMap = await this.loadSubjectNames(subjectIds)
    const classIds = Array.from(new Set((enrollmentRes.data ?? []).map((row) => row.class_id).filter(Boolean) as string[]))

    const [assignmentsRes, coursesRes] = classIds.length > 0
      ? await Promise.all([
          this.supabaseService.admin
            .from('assignments')
            .select('id, title, due_date, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
            .in('class_id', classIds)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(8),
          this.supabaseService.admin
            .from('courses')
            .select('id, title, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
            .in('class_id', classIds)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(6),
        ])
      : [{ data: [] }, { data: [] }]

    const submissionByAssignmentId = new Map(
      (submissionRes.data ?? []).map((row) => [row.assignment_id, row]),
    )

    const summaryBlocks = [
      `Authenticated role: ${user.role}.`,
      `Student name: ${profileRes.data?.full_name ?? 'Student'}.`,
      enrollmentRes.data?.length
        ? `Current classes: ${enrollmentRes.data
            .map((row) => this.className(row))
            .join('; ')}.`
        : 'No class enrollments were found.',
      assignmentsRes.data?.length
        ? `Recent assignments: ${assignmentsRes.data
            .map((row) => {
              const submission = submissionByAssignmentId.get(row.id)
              const status = submission?.status ? ` [submission: ${submission.status}]` : ''
              return `${row.title} for ${this.subjectName(row)} in ${this.className(row)}${status}`
            })
            .join('; ')}.`
        : 'No recent assignments were found.',
      coursesRes.data?.length
        ? `Active courses: ${coursesRes.data
            .map((row) => `${row.title} (${this.subjectName(row)} in ${this.className(row)})`)
            .join('; ')}.`
        : 'No active courses were found.',
      gradesRes.data?.length
        ? `Recent performance: ${gradesRes.data
            .map((row) => `${subjectNameMap.get(row.subject_id ?? '') ?? row.subject_id ?? 'Unknown subject'} average ${row.average_score ?? 'n/a'} (${row.grade_letter ?? 'no letter'})`)
            .join('; ')}.`
        : 'No recent grade summaries were found.',
      attendanceRes.data?.length
        ? `Recent attendance: ${attendanceRes.data
            .map((row) => `${row.date}: ${row.status}`)
            .join('; ')}.`
        : 'No recent attendance records were found.',
      announcementsRes.data?.length
        ? `Recent school announcements: ${announcementsRes.data
            .map((row) => row.title)
            .join('; ')}.`
        : 'No recent school announcements were found.',
      request.courseId ? `Requested course scope: ${request.courseId}.` : 'No course scope was specified.',
    ]

    const sources = [
      ...(gradesRes.data?.map((row) => ({
        type: 'grade_summary',
        label: `Grade summary ${subjectNameMap.get(row.subject_id ?? '') ?? row.subject_id ?? 'subject'}`,
      })) ?? []),
      ...(assignmentsRes.data?.map((row) => ({
        type: 'assignment',
        label: `${row.title} (${this.subjectName(row)})`,
        recordId: row.id,
      })) ?? []),
      ...(coursesRes.data?.map((row) => ({
        type: 'course',
        label: `${row.title} (${this.subjectName(row)})`,
        recordId: row.id,
      })) ?? []),
      ...(attendanceRes.data?.map((row) => ({ type: 'attendance', label: `Attendance ${row.date}` })) ?? []),
      ...(announcementsRes.data?.map((row) => ({ type: 'announcement', label: row.title, recordId: row.id })) ?? []),
    ]

    return {
      assistantType: 'student',
      taskType,
      schoolId: user.schoolId ?? null,
      summaryBlocks,
      sources,
    }
  }

  private async buildTeacherContext(
    user: AuthenticatedUser,
    request: AssistantRequest,
    taskType: RetrievedContext['taskType'],
  ): Promise<RetrievedContext> {
    const [assignmentsRes, coursesRes, teachingScopeRes] = await Promise.all([
      this.supabaseService.admin
        .from('assignments')
        .select('id, title, due_date, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      this.supabaseService.admin
        .from('courses')
        .select('id, title, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
        .eq('teacher_id', user.id)
        .limit(5),
      this.supabaseService.admin
        .from('teacher_assignments')
        .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
        .eq('teacher_id', user.id)
        .limit(10),
    ])

    const scopedCourseRows = (coursesRes.data ?? []).filter((row) => {
      if (request.courseId) return row.id === request.courseId
      if (request.subjectId) return row.subject_id === request.subjectId
      return false
    })

    const scopedCourseIds = Array.from(new Set(scopedCourseRows.map((row) => row.id))).slice(0, 3)
    const selectedCourseLabel = request.courseId
      ? scopedCourseRows.find((row) => row.id === request.courseId)?.title ?? request.courseId
      : null

    const [courseDetailsRes, modulesRes, lessonsRes] = scopedCourseIds.length > 0
      ? await Promise.all([
          this.supabaseService.admin
            .from('courses')
            .select('id, title, description, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
            .in('id', scopedCourseIds),
          this.supabaseService.admin
            .from('modules')
            .select('id, title, course_id, position')
            .in('course_id', scopedCourseIds)
            .order('position', { ascending: true }),
          this.supabaseService.admin
            .from('lessons')
            .select('id, title, course_id, module_id, type, content_url, duration_minutes, position')
            .in('course_id', scopedCourseIds)
            .eq('is_published', true)
            .order('position', { ascending: true })
            .limit(20),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }]

    const lessonIds = (lessonsRes.data ?? []).map((row) => row.id).slice(0, 12)
    const db = this.supabaseService.admin as unknown as { from: (table: string) => any }
    const lessonNotesRes = lessonIds.length > 0
      ? await db
          .from('lesson_notes')
          .select('lesson_id, timestamp_label, content')
          .in('lesson_id', lessonIds)
          .limit(12)
      : { data: [] }

    const moduleNameById = new Map((modulesRes.data ?? []).map((row) => [row.id, row.title ?? row.id]))
    const lessonsByCourseId = new Map<string, Array<{
      id: string
      title: string
      module_id: string
      type: string | null
      content_url: string | null
      duration_minutes: number | null
    }>>()

    for (const lesson of lessonsRes.data ?? []) {
      const current = lessonsByCourseId.get(lesson.course_id) ?? []
      current.push({
        id: lesson.id,
        title: lesson.title,
        module_id: lesson.module_id,
        type: lesson.type ?? null,
        content_url: lesson.content_url ?? null,
        duration_minutes: lesson.duration_minutes ?? null,
      })
      lessonsByCourseId.set(lesson.course_id, current)
    }

    const knowledgeBlocks = [
      ...((courseDetailsRes.data ?? []).map((course) => {
        const lessonSummary = (lessonsByCourseId.get(course.id) ?? [])
          .slice(0, 8)
          .map((lesson) => {
            const moduleName = moduleNameById.get(lesson.module_id) ?? 'Module'
            const typeLabel = lesson.type ? `${lesson.type} lesson` : 'lesson'
            return `${moduleName}: ${lesson.title} (${typeLabel}${lesson.duration_minutes ? `, ${lesson.duration_minutes} minutes` : ''})`
          })
          .join('; ')

        return [
          `Scoped course: ${course.title} for ${this.subjectName(course)} in ${this.className(course)}.`,
          course.description ? `Course description: ${course.description}.` : null,
          lessonSummary ? `Published lessons: ${lessonSummary}.` : null,
        ]
          .filter(Boolean)
          .join(' ')
      })),
      ...((lessonNotesRes.data ?? []) as Array<{ lesson_id: string; timestamp_label: string | null; content: string | null }>)
        .filter((row) => !!row.content?.trim())
        .slice(0, 8)
        .map((row) => `Lesson note${row.timestamp_label ? ` at ${row.timestamp_label}` : ''}: ${row.content!.trim()}`),
    ]

    const summaryBlocks = [
      teachingScopeRes.data?.length
        ? `Teacher scope: ${teachingScopeRes.data
            .map((row) => `${this.className(row)} ${this.subjectName(row)}`)
            .join('; ')}.`
        : 'No teacher assignments were found.',
      assignmentsRes.data?.length
        ? `Recent teacher assignments: ${assignmentsRes.data
            .map((row) => `${row.title} for ${this.subjectName(row)} in ${this.className(row)}`)
            .join('; ')}.`
        : 'No recent assignments were found.',
      coursesRes.data?.length
        ? `Active courses: ${coursesRes.data.map((row) => `${row.title} (${this.subjectName(row)} in ${this.className(row)})`).join('; ')}.`
        : 'No courses were found for this teacher.',
      selectedCourseLabel
        ? `Requested course scope: ${selectedCourseLabel}.`
        : request.courseId
          ? `Requested course scope: ${request.courseId}.`
          : 'No course scope was specified.',
      request.subjectId
        ? `Requested subject scope: ${this.subjectNameFromJoinedRows(request.subjectId, teachingScopeRes.data ?? [], assignmentsRes.data ?? [], coursesRes.data ?? [])}.`
        : 'No subject scope was specified.',
    ]

    const sources = [
      ...(assignmentsRes.data?.map((row) => ({
        type: 'assignment',
        label: `${row.title} (${this.subjectName(row)})`,
        recordId: row.id,
      })) ?? []),
      ...(coursesRes.data?.map((row) => ({
        type: 'course',
        label: `${row.title} (${this.subjectName(row)})`,
        recordId: row.id,
      })) ?? []),
      ...((lessonsRes.data ?? []).map((row) => ({
        type: 'lesson',
        label: row.title,
        recordId: row.id,
      })) ?? []),
    ]

    return {
      assistantType: 'teacher',
      taskType,
      schoolId: user.schoolId ?? null,
      summaryBlocks,
      knowledgeBlocks,
      requestedSubjectLabel: request.subjectId
        ? this.subjectNameFromJoinedRows(request.subjectId, teachingScopeRes.data ?? [], assignmentsRes.data ?? [], coursesRes.data ?? [])
        : undefined,
      requestedCourseLabel: selectedCourseLabel ?? undefined,
      sources,
    }
  }

  private async buildParentContext(
    user: AuthenticatedUser,
    request: AssistantRequest,
    taskType: RetrievedContext['taskType'],
  ): Promise<RetrievedContext> {
    const linksRes = await this.supabaseService.admin
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id)

    const linkedStudentIds = linksRes.data?.map((row) => row.student_id) ?? []
    const childId = request.childId ?? linkedStudentIds[0]

    if (!childId || !linkedStudentIds.includes(childId)) {
      throw new ForbiddenException('The selected child is not linked to this parent.')
    }

    const [childRes, gradesRes, attendanceRes, invoicesRes] = await Promise.all([
      this.supabaseService.admin
        .from('profiles')
        .select('full_name')
        .eq('id', childId)
        .maybeSingle(),
      this.supabaseService.admin
        .from('grade_summaries')
        .select('average_score, grade_letter, subject_id')
        .eq('student_id', childId)
        .order('average_score', { ascending: false })
        .limit(4),
      this.supabaseService.admin
        .from('attendance_records')
        .select('status, date')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(5),
      this.supabaseService.admin
        .from('invoices')
        .select('id, amount, status, due_date')
        .eq('student_id', childId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const subjectIds = Array.from(new Set((gradesRes.data ?? []).map((row) => row.subject_id).filter(Boolean) as string[]))
    const subjectNameMap = await this.loadSubjectNames(subjectIds)

    const summaryBlocks = [
      `Child name: ${childRes.data?.full_name ?? 'Student'}.`,
      gradesRes.data?.length
        ? `Child performance: ${gradesRes.data
            .map((row) => `${subjectNameMap.get(row.subject_id ?? '') ?? row.subject_id ?? 'Unknown subject'} average ${row.average_score ?? 'n/a'} (${row.grade_letter ?? 'no letter'})`)
            .join('; ')}.`
        : 'No grade summaries were found for this child.',
      attendanceRes.data?.length
        ? `Child attendance: ${attendanceRes.data.map((row) => `${row.date}: ${row.status}`).join('; ')}.`
        : 'No attendance records were found for this child.',
      invoicesRes.data?.length
        ? `Recent invoices: ${invoicesRes.data
            .map((row) => `${row.status} invoice of ${row.amount} due ${row.due_date ?? 'n/a'}`)
            .join('; ')}.`
        : 'No recent invoices were found for this child.',
    ]

    const sources = [
      ...(gradesRes.data?.map((row) => ({
        type: 'grade_summary',
        label: `Child grade summary ${subjectNameMap.get(row.subject_id ?? '') ?? row.subject_id ?? 'subject'}`,
      })) ?? []),
      ...(attendanceRes.data?.map((row) => ({ type: 'attendance', label: `Child attendance ${row.date}` })) ?? []),
      ...(invoicesRes.data?.map((row) => ({ type: 'invoice', label: `Invoice ${row.status}`, recordId: row.id })) ?? []),
    ]

    return {
      assistantType: 'parent',
      taskType,
      schoolId: user.schoolId ?? null,
      summaryBlocks,
      sources,
      childId,
    }
  }

  private async buildAdminContext(
    user: AuthenticatedUser,
    _request: AssistantRequest,
    taskType: RetrievedContext['taskType'],
  ): Promise<RetrievedContext> {
    if (user.role === 'super_admin') {
      const schoolsRes = await this.supabaseService.admin
        .from('schools')
        .select('id, name, subscription_plan')
        .order('created_at', { ascending: false })
        .limit(5)

      return {
        assistantType: 'super_admin',
        taskType,
        schoolId: null,
        summaryBlocks: [
          schoolsRes.data?.length
            ? `Recent platform schools: ${schoolsRes.data
                .map((row) => `${row.name} (${row.subscription_plan ?? 'unknown plan'})`)
                .join('; ')}.`
            : 'No platform schools were found.',
        ],
        sources: schoolsRes.data?.map((row) => ({ type: 'school', label: row.name, recordId: row.id })) ?? [],
      }
    }

    const [profilesRes, classesRes, announcementsRes] = await Promise.all([
      this.supabaseService.admin
        .from('profiles')
        .select('id, role')
        .eq('school_id', user.schoolId)
        .limit(200),
      this.supabaseService.admin
        .from('classes')
        .select('id, name')
        .eq('school_id', user.schoolId)
        .limit(20),
      this.supabaseService.admin
        .from('announcements')
        .select('id, title')
        .eq('school_id', user.schoolId)
        .order('published_at', { ascending: false })
        .limit(5),
    ])

    const roleCounts = new Map<string, number>()
    for (const row of profilesRes.data ?? []) {
      roleCounts.set(row.role ?? 'unknown', (roleCounts.get(row.role ?? 'unknown') ?? 0) + 1)
    }

    return {
      assistantType: 'admin',
      taskType,
      schoolId: user.schoolId ?? null,
      summaryBlocks: [
        roleCounts.size
          ? `School user counts: ${Array.from(roleCounts.entries())
              .map(([role, count]) => `${role} ${count}`)
              .join('; ')}.`
          : 'No school users were found.',
        classesRes.data?.length
          ? `Classes configured: ${classesRes.data.map((row) => row.name).join('; ')}.`
          : 'No classes were found.',
        announcementsRes.data?.length
          ? `Recent announcements: ${announcementsRes.data.map((row) => row.title).join('; ')}.`
          : 'No recent announcements were found.',
      ],
      sources: [
        ...(classesRes.data?.map((row) => ({ type: 'class', label: row.name, recordId: row.id })) ?? []),
        ...(announcementsRes.data?.map((row) => ({ type: 'announcement', label: row.title, recordId: row.id })) ?? []),
      ],
    }
  }

  private async loadSubjectNames(subjectIds: string[]) {
    const map = new Map<string, string>()
    if (subjectIds.length === 0) return map

    const { data } = await this.supabaseService.admin
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds)

    for (const row of data ?? []) {
      map.set(row.id, row.name ?? row.id)
    }

    return map
  }

  private className(row: { class_id?: string | null; classes?: { name: string | null } | Array<{ name: string | null }> | null }) {
    const classesValue = Array.isArray(row.classes) ? row.classes[0] : row.classes
    return classesValue?.name ?? row.class_id ?? 'Unknown class'
  }

  private subjectName(row: { subject_id?: string | null; subjects?: { name: string | null } | Array<{ name: string | null }> | null }) {
    const subjectsValue = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
    return subjectsValue?.name ?? row.subject_id ?? 'Unknown subject'
  }

  private subjectNameFromJoinedRows(
    subjectId: string,
    ...collections: Array<Array<{ subject_id?: string | null; subjects?: { name: string | null } | Array<{ name: string | null }> | null }>>
  ) {
    for (const rows of collections) {
      const match = rows.find((row) => row.subject_id === subjectId)
      if (match) return this.subjectName(match)
    }

    return subjectId
  }
}
