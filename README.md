# Tech Stack Suggestions 

## Frontend - Building
| Tech | Purpose |
|------|---------|
| React + Vite | UI framework (already built) |
| Tailwind CSS v4 | Styling (already built) |
| TipTap | Rich text editing (Content Library, answers) |
| @tanstack/react-table | Table management (Prep tab) |
| @dnd-kit | Drag-and-drop reordering |

## Backend
| Tech | Purpose |
|------|---------|
| FastAPI (Python) | REST API server, async support, great Python ML ecosystem |
| Pydantic | Request/response validation (built into FastAPI) |
| JWT (python-jose) | Authentication tokens |

## Database — Neo4j (single DB)
| Data | Why Neo4j Works |
|------|-----------------|
| Users, Auth | Stored as `:User` nodes with properties |
| Roles → Positions → Questions → Answers | Natural graph relationships, easy traversal |
| Knowledge Graph (concepts, categories) | Core strength — "find all BQ questions linked to leadership across PM roles" |
| Content Library sections | Text stored as node properties |
| Interview timeline entries | Linked to `:Position` nodes as ordered relationships |
| File/URL metadata | Stored as `:File` nodes linked to roles/positions |
| AI chat history | Stored as `:ChatSession` → `:Message` chains |
| Custom statuses | `:Status` nodes per user with sort order |

**Why single DB:** Simpler deployment, fewer moving parts for capstone. Neo4j handles both graph traversals AND structured data. Meets academic requirement for graph/semantic web.

**When to add PostgreSQL later:** If you need complex aggregation queries, full-text search at scale, or high-volume append-only logs (chat messages, analytics).

## File Storage
| Tech | Purpose |
|------|---------|
| S3 | Resumes, cover letters, audio recordings |
| Pre-signed URLs | Secure upload/download without exposing storage |

For demo: browser memory (already implemented). For production: S3-compatible storage.

## AI / ML
| Tech | Purpose |
|------|---------|
| OpenAI GPT-4 API | Answer drafting, practice feedback, JD formatting, chat |
| SpaCy | NER for JD parsing (extract skills, requirements) |

## Additions
| Tech | Purpose | When |
|------|---------|------|
| Neo4j Vector Index — retrieve similar answers, match questions to JD | After core features work |
| Celery + Redis | Async task queue for long AI operations | When AI calls need background processing |
| Web Speech API | Real voice transcription in Practice page | Replace fake transcript |
| SPARQL | Semantic web layer on top of Neo4j | Academic requirement compliance |
| SHACL | Graph shape validation | Academic requirement compliance |

## Deployment
| Tech | Purpose |
|------|---------|
| Vercel | Frontend hosting (static React build) |
| Railway or Render | Backend hosting (FastAPI + Neo4j) |
| GitHub Actions | CI/CD pipeline |
