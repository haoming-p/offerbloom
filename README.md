# OfferBloom

Interview prep platform built on a per-user knowledge graph. Users upload their resumes / job descriptions, save reusable stories from real experiences, draft and practice answers, and chat with **Bloom** — an AI coach that grounds every reply in the user's own saved context (saved answers, practice transcripts, linked files, stories, style preferences).

Two clients: a desktop web app and a mobile companion (focused on voice practice). Single FastAPI backend, single Neo4j graph database.

---

## How the system works — by user flow

Each section narrates what happens when the user does something, naming the tool/library/service used at each step.

### 1. Sign up & onboarding

1. User opens the **React 19 + Vite + Tailwind** web frontend (or the **React Native + Expo SDK 54** mobile app).
2. They fill out a signup form → POST `/auth/register` on **FastAPI**.
3. Password is hashed with **passlib + bcrypt**, a JWT is issued via **python-jose**, and a `:User` node is created in **Neo4j**.
4. Onboarding walks them through naming roles (e.g. "Product Manager") and target positions ("Senior PM @ Apple"). These are stored as JSON on the User node *and* mirrored to `:Role` / `:Position` graph nodes by `services/graph_sync.py`, so traversal queries can use the graph.

### 2. Building the knowledge base — uploading a file

1. User uploads a resume, JD, or cover letter from the **My Library** page.
2. The browser POSTs the file (multipart) to `/files/upload`.
3. FastAPI saves the binary to **Cloudflare R2** (S3-compatible) via the **boto3** client. Returns a public R2 URL.
4. Text is extracted on the backend:
   - **PDF** → `pdfplumber`
   - **DOCX** → Python `zipfile` + regex strip on `word/document.xml`
   - **TXT** → utf-8 decode, capped at 60K chars
5. A `:File` node is created in Neo4j with `text_content` set to the extracted text — this is what the AI will later read.
6. User links the file to a role or position from the UI → `(File)-[:LINKED_TO]->(Role|Position)` edge is added.

### 3. Building the knowledge base — saving stories & preferences

- **Stories** = reusable narratives (e.g. "Led an intern onboarding redesign"). Saved as `:Story` nodes with an optional `role_id` tag. Created via the rich-text editor (**TipTap**) on the Library page.
- **AI Preferences** = style rules ("For framework questions, use numbered steps, not STAR"). Saved as `:Preference` nodes with a `scope` (prep / files / all) and optional `role_id`. Can be added directly in the Me tab or one-click from any chat message via the "Remember this" button.

Both stories and preferences get injected into RAG (next section).

### 4. Practice flow — voice → transcript → saved practice

Desktop and mobile take different transcription paths:

**Desktop (`PracticePanel.jsx`):**
1. User taps the orange mic → browser **MediaRecorder** captures audio to a WebM blob.
2. In parallel, the browser's native **Web Speech API** (`SpeechRecognition`) provides a live transcript — free, on-device.
3. On stop, the transcript is sent to `/practices/` → stored as a `:Practice` node connected via `(Question)-[:HAS_PRACTICE]->(Practice)`.

**Mobile (`PracticeRecorderScreen.tsx`):**
1. User taps mic → **expo-av** records to a local m4a file.
2. On stop, the file is POSTed (multipart) to `/transcribe` on the backend.
3. Backend forwards the audio bytes to the **OpenAI Whisper API** (`whisper-1` model) via the **openai** Python SDK.
4. The returned transcript is sent back to mobile, then POSTed to `/practices/` to create the `:Practice` node — same backend call as desktop.

### 5. Chatting with Bloom — the RAG flow

This is the core of the product. When the user sends a chat message in the Prep AI panel:

1. Frontend POSTs to `/chat/` with `{ message, context, question_id, selected_answer_id?, selected_practice_id?, history }`.
2. Backend runs **`services/rag_context.build_rag_context()`** — a single Cypher query that walks the user's graph from the Question outward:

```cypher
MATCH (u:User {id: $user_id})-[:HAS_QUESTION]->(q:Question {id: $q_id})
OPTIONAL MATCH (u)-[:HAS_ROLE]->(role:Role {id: q.role_id})
OPTIONAL MATCH (u)-[:HAS_POSITION]->(pos:Position {id: q.position_key})
OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
OPTIONAL MATCH (q)-[:HAS_PRACTICE]->(p:Practice)
OPTIONAL MATCH (f:File)-[:LINKED_TO]->(target)
WHERE (target = role OR target = pos)
  AND f.text_content IS NOT NULL AND f.text_content <> ''
RETURN q, role, pos, collect(DISTINCT a), collect(DISTINCT p), collect(DISTINCT f)
```

3. Two additional helpers add user-wide context:
   - **`load_user_stories()`** — pulls user's `:Story` nodes, filtered to `role_id IS NULL` (universal) or matching the current chat role.
   - **`load_user_preferences()`** — pulls `:Preference` nodes filtered by chat scope (prep/files/all) + role.
4. All retrieved nodes are flattened into a text block, capped per item (1500 chars for answers/practices, 3000 for files), and prepended to the system prompt.
5. The system prompt + chat history are sent to the **Anthropic Claude API** (`claude-haiku-4-5-20251001`) via the **anthropic** Python SDK.
6. Claude's reply is returned to the frontend and persisted as `(:ChatSession)-[:HAS_MESSAGE]->(:Message)` so the conversation survives reloads.

**Selection focus**: when the user has a specific saved answer or practice selected, that node is tagged `[FOCUS]` in the prompt and an extra instruction tells Claude "when the user says 'this answer', they mean the [FOCUS] item." Avoids ambiguity.

### 6. Mobile chat with voice input

1. AIChatScreen reuses the same `/chat/` endpoint.
2. Mic button on the input row: **expo-av** records → POST `/transcribe` → Whisper transcript fills the text field → user edits and sends.

### 7. Demo mode

1. Visitor taps "Try demo" → POST `/auth/demo-login`.
2. Backend's `services/demo.create_demo_guest()` creates a fresh `:User:DemoGuest` and **clones** every node owned by the admin user (`haoming.p@berkeley.edu`) into the guest. Files share R2 keys — only graph metadata is duplicated.
3. The guest can edit freely; everything they touch only affects their own copy.
4. A cron-style endpoint `/demo/internal/cleanup` (called periodically with a shared secret) deletes guests older than 24 hours.

### 8. Local → prod data sync

Two scripts under `backend/scripts/`:

- `sync_demo_to_prod.py` — copies a user's full subgraph from local Neo4j to **Neo4j AuraDB** (cloud). Covers every label (`User`, `Role`, `Position`, `Question`, `Answer`, `Practice`, `File`, `Story`, `Preference`, `ChatSession`, `Message`). Used to refresh prod after local dev.
- `cleanup_prod_demos.py` — wipes all `:DemoGuest` accounts on prod so future demo visitors get cloned from the latest admin data.

---

## Knowledge graph schema (Neo4j)

**Node labels:**

```
:User              (also :User:DemoGuest for demo accounts)
:Role              user-defined role categories (PM, SDE, ...)
:Position          specific job postings (title, company, JD text)
:Question          interview questions, tagged by role/category/position
:Answer            saved drafts (TipTap HTML)
:Practice          recorded attempts (transcript, optional AI feedback)
:Story             reusable narratives, optionally role-tagged
:Preference        user style rules (scope + optional role)
:File              uploaded resumes/JDs with extracted text
:ChatSession       chat conversations
:Message           individual chat messages
:PreloadedQuestion  global seed pool from Kaggle interview dataset
```

**Key relationships:**

```
(User)-[:HAS_QUESTION]->(Question)
(User)-[:HAS_ROLE]->(Role)
(User)-[:HAS_POSITION]->(Position)-[:FOR_ROLE]->(Role)
(User)-[:OWNS]->(File)-[:LINKED_TO]->(Role | Position)
(User)-[:HAS_STORY]->(Story)
(User)-[:HAS_PREFERENCE]->(Preference)
(User)-[:HAS_CHAT]->(ChatSession)-[:HAS_MESSAGE]->(Message)
(Question)-[:HAS_ANSWER]->(Answer)
(Question)-[:HAS_PRACTICE]->(Practice)
```

Authoritative ownership is via JSON properties on `:User` for roles/positions/statuses/categories; the corresponding `:Role` / `:Position` nodes are *mirrors* rebuilt on every save (`services/graph_sync.sync_user_from_json`). This dual-write lets the existing list UIs stay fast while the graph stays traversable for RAG.

---

## Tech stack & APIs — everything we actually use

| Layer | Tool / Service | What it does | Where in the codebase |
|---|---|---|---|
| **Web frontend** | React 19 + Vite | UI framework + dev server | `frontend/src/` |
| | Tailwind CSS | Styling | throughout `frontend/` |
| | TipTap | Rich-text editor (answer drafts, stories) | `frontend/src/components/RichTextEditor.jsx` |
| | react-markdown + remark-gfm | Render bot replies as markdown | `AIAssistantPanel.jsx`, `FileAIChat.jsx` |
| | lucide-react | Icon set | sidebars, buttons everywhere |
| | Web Speech API (browser-native) | Live transcription during desktop practice recording | `PracticePanel.jsx` |
| | sessionStorage / localStorage | Persisted view state (active tab, prep nav) | `HomePage.jsx`, `PrepPage.jsx` |
| **Mobile** | React Native 0.81 + Expo SDK 54 | Cross-platform mobile runtime | `mobile/` |
| | TypeScript | Static typing | `mobile/` |
| | React Navigation (native stack + bottom tabs) | Screen routing | `mobile/src/navigation/` |
| | expo-av | Audio recording on phone | `PracticeRecorderScreen.tsx`, `AIChatScreen.tsx` |
| | @react-native-async-storage/async-storage | Token + active-role persistence | `AuthContext`, `RoleContext` |
| | lucide-react-native | Icon set | mobile screens |
| **Backend API** | FastAPI (Python) | REST endpoints, async support | `backend/routers/` |
| | Pydantic | Request/response validation | `backend/models/` |
| | uvicorn | ASGI server | dev: `uvicorn main:app --reload` |
| | python-jose + cryptography | JWT signing/verification | `backend/auth/jwt.py` |
| | passlib + bcrypt | Password hashing | `backend/auth/passwords.py` |
| **Database** | Neo4j 5 | Knowledge graph (single DB for everything) | local Docker for dev, **AuraDB** for prod |
| | `neo4j` Python driver | Cypher execution | `backend/database.py` |
| **File storage** | Cloudflare R2 (S3-compatible) | Resume / JD / cover-letter uploads | `backend/storage.py` (boto3) |
| | boto3 | R2 client | `backend/storage.py` |
| **File parsing** | pdfplumber | PDF → text | `backend/routers/files.py` |
| | Python `zipfile` + regex | DOCX → text (strip XML tags) | `backend/routers/files.py` |
| **AI / APIs** | Anthropic Claude API (`claude-haiku-4-5-20251001`) | Chat, answer drafting, practice feedback | `backend/routers/chat.py`, `practices.py` |
| | OpenAI Whisper API (`whisper-1`) | Audio → text for mobile practice + chat dictation | `backend/routers/transcribe.py` |
| | **RAG via Cypher** | Per-user knowledge retrieval (no vector DB) | `backend/services/rag_context.py` |
| **Auth** | JWT with `HS256` | Stateless session tokens | `backend/auth/jwt.py` |
| **Deployment** | Vercel | Frontend hosting (web) | `https://offerbloom.vercel.app` |
| | Railway (or similar) | Backend hosting (FastAPI) | configured via env |
| | Neo4j AuraDB | Production graph database | `NEO4J_URI=neo4j+s://…` |
| | Expo Go | Mobile dev preview | `npx expo start` |
| **Dev tooling** | Docker Compose | Local Neo4j container | `docker-compose.yml` |
| | npm | Frontend + mobile deps | `frontend/package.json`, `mobile/package.json` |
| | pip + venv | Backend deps | `backend/requirements.txt` |

---

## Running locally

```bash
# Backend (terminal 1)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys (Anthropic, OpenAI, R2, Neo4j)
docker compose up -d neo4j   # OR point .env at AuraDB to skip Docker
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Web frontend (terminal 2)
cd frontend
npm install
npm run dev   # → http://localhost:5173

# Mobile (terminal 3)
cd mobile
npm install
# In mobile/.env.local:  EXPO_PUBLIC_API_URL=http://<your-laptop-LAN-IP>:8000
npx expo start
# Scan the QR with Expo Go on your phone (same WiFi as laptop)
```

---

## Project layout

```
OfferBloom/
├── backend/
│   ├── auth/                 JWT + password hashing
│   ├── models/               Pydantic schemas
│   ├── routers/              FastAPI endpoints (auth, chat, files, …)
│   ├── services/
│   │   ├── rag_context.py    Graph traversal for AI context
│   │   ├── graph_sync.py     JSON → :Role/:Position graph mirror
│   │   └── demo.py           Demo-guest cloning + cleanup
│   ├── scripts/              Local↔prod sync, demo cleanup, migrations
│   ├── database.py           Neo4j driver
│   ├── storage.py            Cloudflare R2 client (boto3)
│   └── main.py               FastAPI app + router registration
├── frontend/
│   ├── src/
│   │   ├── pages/            Top-level screens (Dashboard, Prep, Library, Me, …)
│   │   ├── components/       Per-feature folders (preppage, librarypage, mepage, dashboardpage)
│   │   └── services/         API clients
│   └── public/               Static assets (favicon, logo)
├── mobile/
│   ├── App.tsx               Entry + providers + RootNavigator
│   └── src/
│       ├── api/              fetch wrappers
│       ├── context/          Auth + Role
│       ├── navigation/       Stacks + tabs
│       ├── screens/          Hello, Login, Home, Prep, Library, Profile
│       └── theme/            Colors, spacing, typography constants
└── docker-compose.yml        Local Neo4j 5 container
```
