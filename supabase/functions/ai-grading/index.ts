import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ReviewMode = 'full_review' | 'rubric' | 'feedback'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function systemPrompt(mode: ReviewMode) {
  const modeInstruction =
    mode === 'rubric'
      ? 'Prioritize rubric design and keep score judgments conservative.'
      : mode === 'feedback'
        ? 'Prioritize warm, specific, student-friendly feedback that a teacher can send after editing.'
        : 'Provide a balanced grading review with rubric, score rationale, and teacher-editable feedback.'

  return [
    'You are an AI grading copilot for teachers inside a school LMS.',
    'You do not make the final grading decision. The teacher remains in control.',
    'Base every judgment only on the assignment brief and the student submission provided.',
    'Do not claim certainty when the evidence is incomplete.',
    'Keep feedback specific, constructive, and appropriate for school use.',
    modeInstruction,
  ].join(' ')
}

function userPrompt(payload: {
  assignmentTitle: string
  instructions: string | null
  maxScore: number
  studentName: string
  submissionText: string | null
  teacherPrompt: string | null
  mode: ReviewMode
}) {
  return `
Review mode: ${payload.mode}

Assignment title:
${payload.assignmentTitle}

Assignment instructions:
${payload.instructions?.trim() || 'No instructions provided.'}

Maximum score:
${payload.maxScore}

Student name:
${payload.studentName}

Student submission:
${payload.submissionText?.trim() || 'No text submission provided.'}

Teacher notes:
${payload.teacherPrompt?.trim() || 'No additional teacher notes provided.'}

Return a practical teacher-facing review. Keep the rubric point totals aligned to the maximum score.
`.trim()
}

const reviewSchema = {
  name: 'teacher_ai_grading_review',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: {
        type: 'string',
        enum: ['full_review', 'rubric', 'feedback'],
      },
      overview: { type: 'string' },
      score_ready: { type: 'boolean' },
      suggested_score: { type: 'number' },
      score_rationale: { type: 'string' },
      student_feedback: { type: 'string' },
      strengths: {
        type: 'array',
        items: { type: 'string' },
      },
      improvements: {
        type: 'array',
        items: { type: 'string' },
      },
      rubric: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            criterion: { type: 'string' },
            points: { type: 'number' },
            rationale: { type: 'string' },
          },
          required: ['criterion', 'points', 'rationale'],
        },
      },
      confidence: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
      },
      caution: { type: 'string' },
    },
    required: [
      'mode',
      'overview',
      'score_ready',
      'suggested_score',
      'score_rationale',
      'student_feedback',
      'strengths',
      'improvements',
      'rubric',
      'confidence',
      'caution',
    ],
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!OPENAI_API_KEY) return json({ error: 'Missing OPENAI_API_KEY secret for ai-grading.' }, 500)

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const { submissionId, mode, teacherPrompt } = await req.json() as {
      submissionId?: string
      mode?: ReviewMode
      teacherPrompt?: string | null
    }

    if (!submissionId || !mode) return json({ error: 'Missing submissionId or mode.' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'teacher') return json({ error: 'Only teachers can use AI grading.' }, 403)

    const { data: submission, error: subErr } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        assignment_id,
        student_id,
        submission_text,
        submitted_at,
        student:profiles!student_id(full_name, email),
        assignment:assignments!assignment_id(id, title, instructions, max_score, teacher_id)
      `)
      .eq('id', submissionId)
      .maybeSingle()

    if (subErr || !submission) return json({ error: 'Submission not found.' }, 404)

    type SubmissionRow = {
      id: string
      assignment_id: string
      student_id: string
      submission_text: string | null
      submitted_at: string | null
      student: { full_name: string | null; email: string | null } | null
      assignment: {
        id: string
        title: string | null
        instructions: string | null
        max_score: number | null
        teacher_id: string | null
      } | null
    }

    const row = submission as unknown as SubmissionRow
    if (!row.assignment || row.assignment.teacher_id !== user.id) {
      return json({ error: 'You do not have access to review this submission.' }, 403)
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt(mode) }],
          },
          {
            role: 'user',
            content: [{
              type: 'input_text',
              text: userPrompt({
                assignmentTitle: row.assignment.title ?? 'Untitled Assignment',
                instructions: row.assignment.instructions ?? null,
                maxScore: row.assignment.max_score ?? 100,
                studentName: row.student?.full_name ?? row.student?.email ?? 'Student',
                submissionText: row.submission_text ?? null,
                teacherPrompt: teacherPrompt ?? null,
                mode,
              }),
            }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            ...reviewSchema,
          },
        },
      }),
    })

    if (!openAIResponse.ok) {
      const message = await openAIResponse.text()
      return json({ error: `OpenAI request failed: ${message}` }, 500)
    }

    const payload = await openAIResponse.json() as { output_text?: string }
    if (!payload.output_text) return json({ error: 'OpenAI returned no structured output.' }, 500)

    const result = JSON.parse(payload.output_text) as {
      mode: ReviewMode
      overview: string
      score_ready: boolean
      suggested_score: number
      score_rationale: string
      student_feedback: string
      strengths: string[]
      improvements: string[]
      rubric: Array<{ criterion: string; points: number; rationale: string }>
      confidence: 'low' | 'medium' | 'high'
      caution: string
    }

    const maxScore = row.assignment.max_score ?? 100
    if (result.score_ready) {
      result.suggested_score = Math.max(0, Math.min(maxScore, result.suggested_score))
    } else {
      result.suggested_score = 0
    }

    const totalRubricPoints = result.rubric.reduce((sum, item) => sum + Number(item.points || 0), 0)
    if (result.rubric.length > 0 && totalRubricPoints !== maxScore) {
      const scale = totalRubricPoints > 0 ? maxScore / totalRubricPoints : 0
      result.rubric = result.rubric.map((item, index) => {
        if (index === result.rubric.length - 1) {
          const used = result.rubric
            .slice(0, -1)
            .reduce((sum, current) => sum + Math.round(Number(current.points || 0) * scale), 0)
          return { ...item, points: Math.max(0, maxScore - used) }
        }
        return { ...item, points: Math.max(0, Math.round(Number(item.points || 0) * scale)) }
      })
    }

    return json({ result })
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})
