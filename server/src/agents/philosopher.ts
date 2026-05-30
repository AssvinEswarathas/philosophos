import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();
import { nietzschePrompt } from './prompts/nietzsche';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testPhilosopher() {
  const topic = "Is suffering necessary for greatness?";
  console.log(`\n🎭 Topic: ${topic}\n`);
  console.log(`Nietzsche speaks...\n`);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: nietzschePrompt },
      { role: 'user', content: `The debate topic is: "${topic}". Give your opening statement.` }
    ],
  });
  console.log(response.choices[0].message.content);
}

testPhilosopher();
