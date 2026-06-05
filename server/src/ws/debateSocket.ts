import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import OpenAI from 'openai';
import { nietzschePrompt } from '../agents/prompts/nietzsche';
import { kantPrompt } from '../agents/prompts/kant';
import { sartrePrompt } from '../agents/prompts/sartre';
import { camusPrompt } from '../agents/prompts/camus';
import { aureliusPrompt } from '../agents/prompts/aurelius';
import { extractClaims } from '../agents/graphExtractor';
import { upsertClaim, upsertRelationship, getGraph, clearGraph, GraphNode } from '../db/graph';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type PhilosopherName = 'nietzsche' | 'kant' | 'sartre' | 'camus' | 'aurelius';

const prompts: Record<PhilosopherName, string> = {
  nietzsche: nietzschePrompt,
  kant: kantPrompt,
  sartre: sartrePrompt,
  camus: camusPrompt,
  aurelius: aureliusPrompt,
};

const ALL_PHILOSOPHERS: PhilosopherName[] = ['nietzsche', 'kant', 'sartre', 'camus', 'aurelius'];

interface Message {
  role: 'user' | 'assistant';
  name?: string;
  content: string;
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function detectMentions(text: string): PhilosopherName[] {
  const lower = text.toLowerCase();
  const mentioned: PhilosopherName[] = [];
  const aliases: Record<string, PhilosopherName> = {
    '@nietzsche': 'nietzsche', '@nietzche': 'nietzsche', '@niet': 'nietzsche',
    '@kant': 'kant', '@sartre': 'sartre', '@camus': 'camus',
    '@aurelius': 'aurelius', '@marcus': 'aurelius',
  };
  for (const [alias, philosopher] of Object.entries(aliases)) {
    if (lower.includes(alias) && !mentioned.includes(philosopher)) {
      mentioned.push(philosopher);
    }
  }
  return mentioned;
}

async function streamPhilosopherResponse(
  philosopher: PhilosopherName,
  systemPrompt: string,
  history: { role: 'user' | 'assistant', content: string }[],
  ws: WebSocket
): Promise<string> {
  send(ws, { type: 'turn_start', philosopher });

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: systemPrompt }, ...history],
    stream: true,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullContent += delta;
      send(ws, { type: 'token', philosopher, delta });
    }
  }

  send(ws, { type: 'turn_end', philosopher });
  return fullContent;
}

// Extracts claims from a completed turn, persists to Neo4j, broadcasts graph_update.
// Sequential per debate (awaited in the debate loop) to ensure each turn sees prior claims.
async function extractAndBroadcast(
  ws: WebSocket,
  debateId: string,
  philosopher: string,
  stage: string,
  content: string,
  graphNodes: GraphNode[]  // mutated in place — shared across all turns in this debate
): Promise<void> {
  const snapshot = [...graphNodes]; // capture before async work

  const claims = await extractClaims(debateId, philosopher, stage, content, snapshot);

  for (const claim of claims) {
    const node: GraphNode = { id: claim.id, text: claim.text, philosopher, stage };
    await upsertClaim(debateId, node);
    graphNodes.push(node);

    for (const rel of claim.relationships) {
      await upsertRelationship(debateId, claim.id, rel.targetId, rel.type);
    }
  }

  const graph = await getGraph(debateId);
  send(ws, { type: 'graph_update', nodes: graph.nodes, edges: graph.edges });
}

async function runDebate(
  ws: WebSocket,
  topic: string,
  proposition: PhilosopherName,
  opposition: PhilosopherName
) {
  const debateId = `debate-${Date.now()}`;
  const graphNodes: GraphNode[] = []; // tracks all extracted nodes for this debate

  await clearGraph(debateId).catch(() => {}); // ignore if Neo4j unavailable

  const stages = [
    { role: 'proposition', label: 'Opening Statement', instruction: `You are arguing FOR the proposition: "${topic}". Give a compelling opening statement supporting this position. Be passionate and grounded. 3-5 sentences.` },
    { role: 'opposition', label: 'Opening Statement', instruction: `You are arguing AGAINST the proposition: "${topic}". Give a compelling opening statement opposing this position. 3-5 sentences.` },
    { role: 'proposition', label: 'Rebuttal', instruction: `You are arguing FOR "${topic}". The opposition just made their opening statement. Directly rebut their argument and reinforce your position. 3-5 sentences.` },
    { role: 'opposition', label: 'Rebuttal', instruction: `You are arguing AGAINST "${topic}". The proposition just made their rebuttal. Directly counter their points and strengthen your opposition. 3-5 sentences.` },
    { role: 'proposition', label: 'Closing Statement', instruction: `You are arguing FOR "${topic}". Make your final closing statement. Summarize your strongest points and end powerfully. 3-5 sentences.` },
    { role: 'opposition', label: 'Closing Statement', instruction: `You are arguing AGAINST "${topic}". Make your final closing statement. Summarize why the proposition fails and close decisively. 3-5 sentences.` },
  ];

  const history: { role: 'user' | 'assistant', content: string }[] = [];

  send(ws, { type: 'debate_start', topic, proposition, opposition });

  for (const stage of stages) {
    const philosopher = stage.role === 'proposition' ? proposition : opposition;
    const systemPrompt = `${prompts[philosopher]}

You are participating in a formal structured debate.
Stage: ${stage.label}
Your position: ${stage.role === 'proposition' ? 'PROPOSITION (FOR)' : 'OPPOSITION (AGAINST)'}
Instructions: ${stage.instruction}

CRITICAL: Argue this position fully even if it differs from your usual views. Never say your own name. Speak directly.`;

    send(ws, { type: 'debate_stage', stage: stage.label, role: stage.role, philosopher });

    const response = await streamPhilosopherResponse(philosopher, systemPrompt, history, ws);
    history.push({ role: 'assistant', content: `${stage.label} (${stage.role}): ${response}` });

    // Extract claims and update graph — sequential ensures each turn sees previous claims
    await extractAndBroadcast(ws, debateId, philosopher, stage.label, response, graphNodes)
      .catch(err => console.error('[graph]', err));
  }

  send(ws, { type: 'debate_end' });
}

async function getPhilosopherResponse(
  philosopher: PhilosopherName,
  history: Message[],
  ws: WebSocket
): Promise<string> {
  send(ws, { type: 'turn_start', philosopher });

  const contextPrompt = prompts[philosopher] + '\n\nCRITICAL: Never start with your name. Never write your name followed by a colon. Just speak directly.';

  const formattedHistory = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant'
      ? `${m.name!.charAt(0).toUpperCase() + m.name!.slice(1)}: ${m.content}`
      : m.content,
  }));

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: contextPrompt }, ...formattedHistory],
    stream: true,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullContent += delta;
      send(ws, { type: 'token', philosopher, delta });
    }
  }

  send(ws, { type: 'turn_end', philosopher });
  return fullContent;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Client connected');
    const history: Message[] = [];

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'chat') {
          const userText: string = message.text;
          const activePhilosophers: PhilosopherName[] = message.philosophers || ALL_PHILOSOPHERS;
          history.push({ role: 'user', content: userText });

          const mentioned = detectMentions(userText);
          let philosophers: PhilosopherName[];
          if (mentioned.length > 0) {
            philosophers = mentioned.filter(p => activePhilosophers.includes(p));
            if (philosophers.length === 0) philosophers = mentioned;
          } else {
            philosophers = activePhilosophers;
          }

          send(ws, { type: 'response_start', philosophers });

          for (const philosopher of philosophers) {
            const content = await getPhilosopherResponse(philosopher, history, ws);
            history.push({ role: 'assistant', name: philosopher, content });
          }

          send(ws, { type: 'response_end' });
        }

        if (message.type === 'start_debate') {
          await runDebate(ws, message.topic, message.proposition, message.opposition);
        }
      } catch (err) {
        console.error(err);
        send(ws, { type: 'error', message: 'Something went wrong' });
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });

  console.log('WebSocket server ready');
}
