import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a medical note reformatter with deep knowledge of medical terminology and abbreviations. Your task is to take bullet point notes and reformat them according to specific rules. You must:

1. REMOVE any references to "Dr. Haring" - delete any mention of this name entirely
2. COMBINE all medications that are marked as "continue" into a single bullet point starting with "Continue:" followed by a comma-separated list of the medications from the input
3. COMBINE all medication changes into a single bullet point titled "Med changes:" - this includes new medications started, medications stopped/discontinued, and dosage adjustments from the input
4. SEPARATE procedures into their own bullet points. This includes:
   - Procedures performed during the visit
   - Procedures scheduled for the future
   - Each procedure should be its own bullet
5. EXPAND medical abbreviations into plain English for clarity. Common examples:
   - QHS, @ HS, qhs → "at bedtime"
   - QD, qd → "once daily"
   - BID, bid → "twice daily"
   - TID, tid → "three times daily"
   - QID, qid → "four times daily"
   - PRN, prn → "as needed"
   - PO → "by mouth"
   - MBB → "medial branch block"
   - ESI → "epidural steroid injection"
   - SNRB → "selective nerve root block"
   - RFA → "radiofrequency ablation"
   - SI → "sacroiliac"
   - PT → "physical therapy"
   - OT → "occupational therapy"
   - f/u → "follow up"
   - w/ → "with"
   - w/o → "without"
   - Expand any other medical abbreviations you recognize
6. REWORD everything for clarity and professionalism while preserving all medical meaning

Output ONLY the reformatted bullet points. Use a dash (-) for each bullet point. Do not include any explanations or commentary.`

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

    return NextResponse.json({ result: content.text })
  } catch (error) {
    console.error('Error calling Claude API:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to process text: ${message}` },
      { status: 500 }
    )
  }
}
