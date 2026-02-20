// ─── AI Provider ─────────────────────────────────────────────────────────────
// Wraps the K2Think API (or falls back to heuristic mock).
// Switch providers by changing VITE_AI_API_KEY / VITE_USE_AI in .env.local

const K2_API_URL = 'https://api.k2think.ai/v1/chat/completions'
const K2_MODEL   = 'MBZUAI-IFM/K2-Think-v2'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIOptions {
  maxTokens?:       number
  temperature?:     number
  fallbackToMock?:  boolean
}

/** Returns true when a real API key is configured. */
export function isAIEnabled(): boolean {
  const key = import.meta.env.VITE_AI_API_KEY as string | undefined
  return typeof key === 'string' && key.length > 10 && key !== 'mock'
}

// ─── Real API call ────────────────────────────────────────────────────────────

async function callK2Think(messages: AIMessage[], opts: AIOptions): Promise<string> {
  const { maxTokens = 1500, temperature = 0.7 } = opts

  const res = await fetch(K2_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: K2_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`K2Think ${res.status}: ${body}`)
  }

  const json = await res.json()
  let content = (json.choices?.[0]?.message?.content as string) ?? ''
  // K2-Think includes chain-of-thought reasoning before </think> — strip it
  const thinkEnd = content.indexOf('</think>')
  if (thinkEnd !== -1) content = content.slice(thinkEnd + 8).trim()
  return content
}

// ─── Heuristic mock ───────────────────────────────────────────────────────────
// Returns structured responses when no API key is set.

function mockResponse(messages: AIMessage[]): string {
  const text = messages.map(m => m.content).join(' ').toLowerCase()

  if (text.includes('json') || text.includes('feedback') || text.includes('performance')) {
    return JSON.stringify({
      summary:
        'You are building steady study habits. Your consistency is growing and your focus sessions are productive. Keep building on this foundation.',
      tips: [
        'Start with your hardest subject when your energy is highest in the morning.',
        'Use the Pomodoro technique: 45 min focused study, then a 15 min break.',
        'Spend 10 minutes reviewing yesterday\'s material before starting new content.',
      ],
      encouragement: 'Every session you complete is an investment in your future — keep going!',
    })
  }

  if (text.includes('plan') || text.includes('tomorrow') || text.includes('schedule')) {
    return JSON.stringify({
      message: 'Plan generated based on your study patterns and weak areas.',
      tasks: [],
    })
  }

  if (text.includes('weak') || text.includes('struggling') || text.includes('area')) {
    return 'Focus on subjects you haven\'t reviewed recently. Use active recall and spaced repetition for better retention.'
  }

  return 'Keep up the great work! Consistent daily practice is the foundation of academic success. Quality beats quantity — 2 focused hours beats 4 distracted ones.'
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a message array to the AI and return the response text.
 * Falls back to mock heuristics when the API key is not set.
 */
export async function generateAIResponse(
  messages:  AIMessage[],
  options:   AIOptions = {},
): Promise<string> {
  const { fallbackToMock = true } = options

  if (!isAIEnabled()) return mockResponse(messages)

  try {
    return await callK2Think(messages, options)
  } catch (err) {
    console.warn('[aiProvider] API call failed, using mock:', err)
    if (fallbackToMock) return mockResponse(messages)
    throw err
  }
}
