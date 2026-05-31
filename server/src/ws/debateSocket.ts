import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import OpenAI from 'openai';
import { nietzschePrompt } from '../agents/prompts/nietzsche';
import { kantPrompt } from '../agents/prompts/kant';
import { sartrePrompt } from '../agents/prompts/sartre';
import { camusPrompt } from '../agents/prompts/camus';
import { aureliusPrompt } from '../agents/prompts/aurelius';

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
    '@nietzsche': 'nietzsche',
    '@nietzche': 'nietzsche',
    '@niet': 'nietzsche',
    '@kant': 'kant',
    '@sartre': 'sartre',
    '@camus': 'camus',
    '@aurelius': 'aurelius',
    '@marcus': 'aurelius',
  };
  for (const [alias, philosopher] of Object.entries(aliases)) {
    if (lower.includes(alias) && !mentioned.includes(philosopher)) {
      mentioned.push(philosopher);
    }
  }
  return mentioned;
}

async function getPhilosopherResponse(
  philosopher: PhilosopherName,
  history: Message[],
  ws: WebSocket
) {
  send(ws, { type: 'turn_start', philosopher });

  const contextPrompt = prompts[philosopher] + '\n\nIMPORTANT: Never start your response with your own name. Never prefix with "NIETZSCHE:" or similar. Just speak directly.';

  const formattedHistory = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'assistant'
      ? `${m.name!.charAt(0).toUpperCase() + m.name!.slice(1)}: ${m.content}`
      : m.content,
  }));

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: contextPrompt },
      ...formattedHistory,
    ],
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
      } catch (err) {
        console.error(err);
        send(ws, { type: 'error', message: 'Something went wrong' });
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });

  console.log('WebSocket server ready');
}
