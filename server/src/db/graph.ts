import { getDriver } from './neo4j'

export interface GraphNode {
  id: string
  text: string
  philosopher: string
  stage: string
}

export interface GraphEdge {
  source: string
  target: string
  type: 'supports' | 'contradicts' | 'extends' | 'qualifies'
}

const REL_TYPES = new Set(['supports', 'contradicts', 'extends', 'qualifies'])

export async function upsertClaim(debateId: string, node: GraphNode): Promise<void> {
  const session = getDriver().session()
  try {
    await session.run(
      `MERGE (c:Claim {id: $id, debateId: $debateId})
       SET c.text = $text, c.philosopher = $philosopher, c.stage = $stage`,
      { ...node, debateId }
    )
  } finally {
    await session.close()
  }
}

export async function upsertRelationship(
  debateId: string,
  sourceId: string,
  targetId: string,
  type: GraphEdge['type']
): Promise<void> {
  if (!REL_TYPES.has(type)) return
  const session = getDriver().session()
  // Dynamic rel type — values are allowlisted above
  const rel = type.toUpperCase()
  try {
    await session.run(
      `MATCH (a:Claim {id: $sourceId, debateId: $debateId})
       MATCH (b:Claim {id: $targetId, debateId: $debateId})
       MERGE (a)-[:\`${rel}\`]->(b)`,
      { sourceId, targetId, debateId }
    )
  } finally {
    await session.close()
  }
}

export async function getGraph(debateId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const session = getDriver().session()
  try {
    const nodeRes = await session.run(
      'MATCH (c:Claim {debateId: $debateId}) RETURN c',
      { debateId }
    )
    const edgeRes = await session.run(
      `MATCH (a:Claim {debateId: $debateId})-[r]->(b:Claim {debateId: $debateId})
       RETURN a.id AS source, b.id AS target, toLower(type(r)) AS type`,
      { debateId }
    )

    const nodes: GraphNode[] = nodeRes.records.map(rec => {
      const p = rec.get('c').properties
      return { id: p.id, text: p.text, philosopher: p.philosopher, stage: p.stage }
    })
    const edges: GraphEdge[] = edgeRes.records.map(rec => ({
      source: rec.get('source'),
      target: rec.get('target'),
      type: rec.get('type') as GraphEdge['type'],
    }))
    return { nodes, edges }
  } finally {
    await session.close()
  }
}

export async function clearGraph(debateId: string): Promise<void> {
  const session = getDriver().session()
  try {
    await session.run('MATCH (c:Claim {debateId: $debateId}) DETACH DELETE c', { debateId })
  } finally {
    await session.close()
  }
}
