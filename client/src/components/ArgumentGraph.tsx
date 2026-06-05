import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './ArgumentGraph.css'

const PHILOSOPHER_COLORS: Record<string, string> = {
  nietzsche: '#f97316',
  kant:      '#3b82f6',
  sartre:    '#8b5cf6',
  camus:     '#10b981',
  aurelius:  '#f59e0b',
}

const EDGE_STYLES = {
  supports:    { color: '#22c55e', dash: null,   label: 'supports' },
  contradicts: { color: '#ef4444', dash: '8,4',  label: 'contradicts' },
  extends:     { color: '#6366f1', dash: null,   label: 'extends' },
  qualifies:   { color: '#f59e0b', dash: '3,4',  label: 'qualifies' },
} as const

export interface GraphNode {
  id: string
  text: string
  philosopher: string
  stage: string
}

export interface GraphEdge {
  source: string
  target: string
  type: keyof typeof EDGE_STYLES
}

type SimNode = GraphNode & d3.SimulationNodeDatum

interface TooltipState {
  x: number
  y: number
  node: GraphNode
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export default function ArgumentGraph({ nodes, edges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, never> | null>(null)
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return

    const container = containerRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    simRef.current?.stop()

    const svg = d3.select(svgRef.current).attr('width', W).attr('height', H)
    svg.selectAll('*').remove()

    // Arrow markers for each edge type
    const defs = svg.append('defs')
    Object.entries(EDGE_STYLES).forEach(([type, style]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 34)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', style.color)
        .attr('opacity', 0.8)
    })

    // Zoom/pan container
    const g = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 4])
        .on('zoom', (e) => g.attr('transform', e.transform))
    )

    // Build sim nodes — restore saved positions so graph doesn't jump on update
    const simNodes: SimNode[] = nodes.map(n => {
      const saved = positionsRef.current.get(n.id)
      return {
        ...n,
        x: saved?.x ?? W / 2 + (Math.random() - 0.5) * 120,
        y: saved?.y ?? H / 2 + (Math.random() - 0.5) * 120,
      }
    })
    const nodeById = new Map(simNodes.map(n => [n.id, n]))

    const simEdges = edges
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({ ...e }))

    // Force simulation
    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force('link',
        d3.forceLink<SimNode, typeof simEdges[0]>(simEdges as any)
          .id(d => d.id)
          .distance(160)
          .strength(0.45)
      )
      .force('charge', d3.forceManyBody().strength(-420))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.04))
      .force('collide', d3.forceCollide(52))

    simRef.current = sim

    // ── Edges ──────────────────────────────────────────────────
    const linkG = g.append('g').attr('class', 'links')

    const link = linkG.selectAll<SVGLineElement, typeof simEdges[0]>('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', d => EDGE_STYLES[d.type as keyof typeof EDGE_STYLES]?.color ?? '#999')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', d => EDGE_STYLES[d.type as keyof typeof EDGE_STYLES]?.dash ?? null)
      .attr('marker-end', d => `url(#arrow-${d.type})`)

    const linkLabel = g.append('g').attr('class', 'link-labels')
      .selectAll<SVGTextElement, typeof simEdges[0]>('text')
      .data(simEdges)
      .join('text')
      .attr('font-size', '8px')
      .attr('font-weight', '600')
      .attr('fill', d => EDGE_STYLES[d.type as keyof typeof EDGE_STYLES]?.color ?? '#999')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('opacity', 0.75)
      .text(d => EDGE_STYLES[d.type as keyof typeof EDGE_STYLES]?.label ?? d.type)

    // ── Nodes ──────────────────────────────────────────────────
    const nodeG = g.append('g').attr('class', 'nodes')

    const node = nodeG.selectAll<SVGGElement, SimNode>('g')
      .data(simNodes, d => d.id)
      .join('g')
      .attr('cursor', 'pointer')

    // Outer glow ring
    node.append('circle')
      .attr('class', 'node-glow')
      .attr('r', 30)
      .attr('fill', d => (PHILOSOPHER_COLORS[d.philosopher] ?? '#6B4FBB') + '12')
      .attr('stroke', 'none')

    // Main filled circle
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', 22)
      .attr('fill', d => (PHILOSOPHER_COLORS[d.philosopher] ?? '#6B4FBB') + '20')
      .attr('stroke', d => PHILOSOPHER_COLORS[d.philosopher] ?? '#6B4FBB')
      .attr('stroke-width', 2)

    // Philosopher initial
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '13px')
      .attr('font-weight', '800')
      .attr('fill', d => PHILOSOPHER_COLORS[d.philosopher] ?? '#6B4FBB')
      .attr('pointer-events', 'none')
      .text(d => d.philosopher[0].toUpperCase())

    // Short claim label below node
    node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('y', 35)
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('fill', '#555')
      .attr('pointer-events', 'none')
      .text(d => {
        const words = d.text.split(' ')
        return words.slice(0, 5).join(' ') + (words.length > 5 ? '…' : '')
      })

    // Drag
    node.call(
      d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
    )

    // Hover
    node
      .on('mouseenter', function (event, d) {
        d3.select(this).select('.node-circle').attr('r', 26).attr('stroke-width', 2.5)
        d3.select(this).select('.node-glow').attr('r', 34)
        const rect = containerRef.current!.getBoundingClientRect()
        setTooltip({ x: event.clientX - rect.left + 14, y: event.clientY - rect.top - 12, node: d })
      })
      .on('mousemove', function (event) {
        const rect = containerRef.current!.getBoundingClientRect()
        setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left + 14, y: event.clientY - rect.top - 12 } : null)
      })
      .on('mouseleave', function () {
        d3.select(this).select('.node-circle').attr('r', 22).attr('stroke-width', 2)
        d3.select(this).select('.node-glow').attr('r', 30)
        setTooltip(null)
      })

    // Tick: update DOM positions + save node positions
    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)

      linkLabel
        .attr('x', d => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr('y', d => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2 - 5)

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)

      simNodes.forEach(n => {
        if (n.x != null && n.y != null) positionsRef.current.set(n.id, { x: n.x, y: n.y })
      })
    })

    return () => { sim.stop() }
  }, [nodes, edges])

  return (
    <div ref={containerRef} className="graph-container">
      {nodes.length === 0 ? (
        <div className="graph-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="12" cy="24" r="6" stroke="#ccc" strokeWidth="2" />
            <circle cx="36" cy="12" r="6" stroke="#ccc" strokeWidth="2" />
            <circle cx="36" cy="36" r="6" stroke="#ccc" strokeWidth="2" />
            <line x1="18" y1="22" x2="30" y2="14" stroke="#ddd" strokeWidth="1.5" />
            <line x1="18" y1="26" x2="30" y2="34" stroke="#ddd" strokeWidth="1.5" />
          </svg>
          <p className="graph-empty-text">The argument graph will build as the debate unfolds</p>
          <p className="graph-empty-sub">Each claim becomes a node; logical relationships become edges</p>
        </div>
      ) : (
        <>
          <svg ref={svgRef} className="graph-svg" />

          {tooltip && (
            <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <div
                className="graph-tooltip-meta"
                style={{ color: PHILOSOPHER_COLORS[tooltip.node.philosopher] ?? '#6B4FBB' }}
              >
                {tooltip.node.philosopher} · {tooltip.node.stage}
              </div>
              <div className="graph-tooltip-text">{tooltip.node.text}</div>
            </div>
          )}

          <div className="graph-legend">
            {Object.entries(EDGE_STYLES).map(([type, style]) => (
              <div key={type} className="legend-item">
                <svg width="22" height="10">
                  <line
                    x1="0" y1="5" x2="22" y2="5"
                    stroke={style.color}
                    strokeWidth="2"
                    strokeDasharray={style.dash ?? undefined}
                  />
                </svg>
                <span style={{ color: style.color }}>{style.label}</span>
              </div>
            ))}
          </div>

          <div className="graph-node-count">
            {nodes.length} claim{nodes.length !== 1 ? 's' : ''} · {edges.length} relationship{edges.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  )
}
