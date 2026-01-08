import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a medical note reformatter. Your task is to take bullet point notes and reformat them according to specific rules. You must:

1. REMOVE any references to "Dr. Haring" - delete any mention of this name entirely
2. COMBINE all medications that are marked as "continue" into a single bullet point (e.g., "Continue: Metformin 500mg, Lisinopril 10mg, Aspirin 81mg")
3. SEPARATE medication changes into their own distinct bullet points. This includes:
   - New medications started
   - Medications stopped/discontinued
   - Dosage adjustments
   - Each change should be its own bullet
4. SEPARATE procedures into their own bullet points. This includes:
   - Procedures performed during the visit
   - Procedures scheduled for the future
   - Each procedure should be its own bullet
5. REWORD everything for clarity and professionalism without losing any medical meaning

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
      model: 'claude-sonnet-4-20250514',
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
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    )
  }
}
