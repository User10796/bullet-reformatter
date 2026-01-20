import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a medical note reformatter. Reformat the input according to these rules:

RULE 1: Remove "Dr. Haring" or "Dr Haring" - delete this name completely from output.

RULE 2: If any medications say "continue" in the input, combine them into ONE bullet:
- Continue: [med1], [med2], [med3]
Do NOT list continued medications as "med changes" - they are NOT changes.

RULE 3: Medication changes (ONLY if there are new/stopped/changed meds in input):
Format each change as its own bullet:
- Start [medication name, dose, frequency]
- Stop [medication name]
- Change [medication name] to [new dose/frequency]
If no medications are being started, stopped, or changed, do NOT include any med change bullets.

RULE 4: "Consider" items - keep the word "Consider" and list as separate bullets:
- Consider [procedure/treatment]
Do NOT convert "Consider" to "Start" - these are recommendations, not orders.

RULE 5: Each procedure gets its own bullet (injections, blocks, imaging scheduled, etc.)

RULE 5: Expand abbreviations:
- BID → twice daily, TID → three times daily, QID → four times daily
- QHS/qhs → at bedtime, PRN/prn → as needed, PO → by mouth
- MBB → medial branch block, ESI → epidural steroid injection
- TFESI → transforaminal epidural steroid injection
- RFA → radiofrequency ablation, SI → sacroiliac
- f/u → follow up, w/ → with, w/o → without

RULE 6: Keep all other information (follow-up appointments, instructions, etc.) as separate bullets.

FORMAT RULES:
- Each bullet starts with "- " (dash space)
- NO blank lines between bullets
- NO nested bullets or sub-bullets
- Single line per bullet`

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Please reformat the following bullet points:\n\n${text}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response format' },
        { status: 500 }
      )
    }

    // Post-process: remove preamble text, blank lines, and standalone headers
    const cleanedText = content.text
      .replace(/^(Here is|Here's|Below is|The following is).*?:\s*/gi, '')
      .split('\n')
      .filter(line => line.trim() !== '')
      .filter(line => !line.match(/^(Here is|Here's|Below is|The following is)/i))
      .filter(line => !line.match(/^-?\s*(Med changes|Medication changes):?\s*$/i))
      .join('\n')
    return NextResponse.json({ result: cleanedText })
  } catch (error) {
    console.error('Error calling Claude API:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to process text: ${message}` },
      { status: 500 }
    )
  }
}
