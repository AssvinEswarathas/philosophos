import OpenAI from 'openai'
import { GraphNode, GraphEdge } from '../db/graph'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ExtractedClaim {
  id: string
  text: string
  relationships: { targetId: string; type: GraphEdge['type'] }[]
}

let _counter = 0

export async function extractClaims(
  debateId: string,
  philosopher: string,
  stage: string,
  content: string,
  existingNodes: GraphNode[]
): Promise<ExtractedClaim[]> {
  const existingText = existingNodes.length
    ? existingNodes.map(n => `[${n.id}] (${n.philosopher}, ${n.stage}): "${n.text}"`).join('\n')
    : 'None yet — this is the first turn.'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are analyzing a formal philosophical debate. Extract the 1-3 most important argumentative claims from this turn, then map logical relationships to prior claims.

SPEAKER: ${philosopher} (${stage})
ARGUMENT:
"${content}"

EXISTING CLAIMS IN THIS DEBATE:
${existingText}

Relationship types:
  supports    — this claim backs or provides evidence for the target
  contradicts — this claim directly opposes or refutes the target
  extends     — this claim develops or builds upon the target
  qualifies   — this claim adds nuance or a condition to the target

Rules:
- Keep each claim under 90 characters, stated as a clear assertion
- Only reference IDs from the EXISTING CLAIMS list above
- If no prior claims exist or no relationship is clear, return an empty relationships array
- Return only valid JSON, no prose

{
  "claims": [
    {
      "text": "claim stated as a clear assertion",
      "relationships": [
        {"targetId": "existing-claim-id", "type": "supports|contradicts|extends|qualifies"}
      ]
    }
  ]
}`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  try {
    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    const raw = (parsed.claims ?? []) as Array<{
      text: string
      relationships: { targetId: string; type: string }[]
    }>

    const validTypes = new Set(['supports', 'contradicts', 'extends', 'qualifies'])
    const existingIds = new Set(existingNodes.map(n => n.id))

    return raw.map(c => ({
      id: `${debateId.slice(-6)}-${philosopher[0]}-${++_counter}`,
      text: (c.text ?? '').slice(0, 120),
      relationships: (c.relationships ?? []).filter(
        r => validTypes.has(r.type) && existingIds.has(r.targetId)
      ) as { targetId: string; type: GraphEdge['type'] }[],
    }))
  } catch {
    return []
  }
}
