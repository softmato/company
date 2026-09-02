# Softmato AI & LLM Integration Architecture Plan

## Overview

This document outlines the architecture, model routing, provider abstraction, function calling, and knowledge retrieval strategy for the Softmato AI Assistant in Next.js, referencing the multi-provider LLM infrastructure from `ai_local/server` (`D:\siddhant-files\projects\ai_assistant\ai_local\server`).

---

## 1. Provider Abstraction & Model Routing Strategy

Inspired by the reference python server (`app/ai/providers/manager.py`, `router.py`, `key_manager.py`), our Next.js AI system uses a unified provider layer (`AiProvider`) with automatic fallback and key rotation capability.

### Supported LLM Providers & Fallback Priority:

1. **Google Gemini** (`GEMINI_API_KEY`, model: `gemini-2.5-flash` / `gemini-1.5-flash`) — Primary default for speed, large context window, and function calling.
2. **Groq** (`GROQ_API_KEY`, model: `llama-3.3-70b-versatile`) — High-speed inference for quick user responses.
3. **OpenRouter** (`OPENROUTER_API_KEY`, model: `mistralai/mistral-7b-instruct` / `meta-llama/llama-3.3-70b-instruct`) — Multi-model access & fallback routing.
4. **Cerebras / SambaNova / Mistral / Cohere** — Secondary fallback options.
5. **Softmato Local Fallback Engine** (`SmartFallbackProvider`) — Built-in, zero-external-dependency local provider that performs intent recognition and function tool calls locally if all external API keys are omitted or unavailable.

---

## 2. Function Tools & Dynamic Action Capabilities

As required by `Softmato_AI_Company_Assistant_Architecture.docx`, dynamic operations are isolated from static knowledge files and implemented via server-validated tool functions (`apps/web/lib/ai/tools.ts`):

- **`get_available_meeting_slots`**: Queries upcoming available discovery meeting slots for technical consulting and project planning.
- **`book_meeting(name, email, date, time, details)`**: Validates inputs server-side with Zod and records meeting bookings.
- **`create_lead(name, email, company, requirements)`**: Captures new project inquiries and generates lead tracking IDs.
- **`contact_human_team(name, email, message)`**: Routes urgent or custom inquiries directly to Softmato leadership (Jiwan Mijhar / Siddhant Yadav) and engineering leads.

---

## 3. Knowledge Base Retrieval (Repository RAG)

Static company data lives in Markdown files inside `knowledge/`:

- `company.md`: Softmato Technology overview, leadership, tech stack, and location.
- `services.md`: Product engineering, web applications, mobile apps, software development.
- `pricing.md`: Project tiers (Static, Advanced, Custom) and retainer guidelines.
- `portfolio.md`: Case studies, SaaS platforms, custom enterprise applications.
- `policies.md`: NDA provisions, security standards, IP ownership, SLA.
- `faq.md`: Frequently asked questions.

### Retrieval Pipeline:

1. User message enters `POST /api/chat`.
2. `retrieveContext()` performs query intent token analysis to select relevant `.md` documents.
3. `buildSystemPrompt()` injects retrieved knowledge context into the system prompt with strict rules forbidding hallucinated meeting availability or unconfirmed bookings.
4. LLM processes query and returns structured text or function call instructions.
