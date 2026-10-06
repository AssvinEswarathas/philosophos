# PhilosophOS

Chat and debate with AI philosophers — Nietzsche, Kant, Sartre, Camus, and Marcus Aurelius — in a group conversation or a formal structured debate, with their arguments mapped live onto a knowledge graph.

## Features

- **Group chat** — talk to all five philosophers at once, or mention one directly (`@nietzsche`, `@kant`, `@sartre`, `@camus`, `@aurelius`) to pull them into the conversation.
- **Debate mode** — pick two philosophers and a topic; they argue through opening statements, rebuttals, and closing statements in a structured, turn-based format.
- **Argument graph** — every debate turn is parsed into claims and logical relationships (`supports`, `contradicts`, `extends`, `qualifies`) and rendered as a live D3 force-directed graph, backed by Neo4j.
- **Cross-debate similarity** — claims are embedded (OpenAI `text-embedding-3-small`) and stored in Postgres with `pgvector`, so each debate surfaces semantically similar claims raised in earlier debates.
- **Settings panel** — dark mode, font size, response length, and auto-scroll.

## Tech stack

| Layer | Tech |
|---|---|
| Client | React 19, Vite, D3 |
| Server | Express, `ws` (WebSocket), OpenAI API (`gpt-4o`) |
| Graph store | Neo4j — claims and their relationships within a debate |
| Vector store | PostgreSQL + `pgvector` — claim embeddings for cross-debate similarity search |

## Project structure

```
client/   React + Vite frontend (chat UI, debate arena, argument graph)
server/   Express + WebSocket backend (philosopher agents, claim extraction, graph + embeddings)
```

## Setup

### 1. Start the databases

```bash
docker compose up -d
```

This starts Neo4j (`localhost:7687`) and Postgres with `pgvector` (`localhost:5433`).

### 2. Configure environment variables

Create `server/.env`:

```
OPENAI_API_KEY=your-openai-api-key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
DATABASE_URL=postgres://postgres:password@localhost:5433/philosophos
JWT_SECRET=your-jwt-secret
PORT=4000
```

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Run the database migration

From `server/`:

```bash
npm run db:migrate
```

This creates the `claim_embeddings` table and `vector` extension in Postgres.

### 5. Run the app

From `server/`:

```bash
npx ts-node src/index.ts
```

From `client/`:

```bash
npm run dev
```

The client runs on `http://localhost:5173` and connects to the server's WebSocket on `ws://localhost:4000`.
