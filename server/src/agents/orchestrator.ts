import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();
import { nietzschePrompt } from './prompts/nietzsche';
import { kantPrompt } from './prompts/kant';
import { sartrePrompt } from './prompts/sartre';
import { camusPrompt } from './prompts/camus';
import { aureliusPrompt } from './prompts/aurelius';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type PhilosopherName = 'nietzsche' | 'kant' | 'sartre' | 'camus' | 'aurelius';

const prompts: Record<PhilosopherName, string> = {
  nietzsche: nietzschePrompt,
  kant: kantPrompt,
  sartre: sartrePrompt,
  camus: camusPrompt,
  aurelius: aureliusPrompt,
};

interface Turn {
  philosopher: PhilosopherName;
  content: string;
}

async function runDebate(topic: string, rounds: number = 2) {
  const order: PhilosopherName[] = ['nietzsche', 'kant', 'sartre', 'camus', 'aurelius'];
  const history: Turn[] = [];

  console.log(`\n⚡ DEBATE: "${topic}"\n`);
  console.log('='.repeat(60));

  for (let round = 0; round < rounds; round++) {
    for (const philosopher of order) {
      const context = history.map(t =>
        `${t.philosopher.toUpperCase()}: ${t.content}`
      ).join('\n\n');

      const userMessage = history.length === 0
        ? `The debate topic is: "${topic}". Give your opening statement.`
        : `The debate topic is: "${topic}". The debate so far:\n\n${context}\n\nNow give your response.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompts[philosopher] },
          { role: 'user', content: userMessage },
        ],
      });

      const content = response.choices[0].message.content ?? '';
      history.push({ philosopher, content });

      console.log(`\n🎭 ${philosopher.toUpperCase()}`);
      console.log('-'.repeat(40));
      console.log(content);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('⚡ DEBATE COMPLETE');
}

runDebate('Is suffering necessary for greatness?', 1);
