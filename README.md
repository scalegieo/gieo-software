# GIEO — Internal Agency CRM

A high-performance desktop CRM for performance marketing agencies. Built with Electron-Vite, React 18, Tailwind CSS, shadcn/ui, Supabase, and Zustand.

## Features

- **Dashboard** — MRR, active clients, ad spend metrics, task list
- **CRM Kanban** — Drag-and-drop pipeline with automated onboarding checklist on Won
- **Client Hub** — Retainer tracking, Meta Ads table, financials, local file storage
- **Team Comms** — Real-time global chat + task comments via Supabase Realtime
- **AI Sidebar** — OpenRouter (Llama 3) with active client/task context
- **Local Storage** — Contracts/invoices saved to `~/GIEO_Data/Active/` via Electron IPC

## Quick Start

```bash
cd ~/Projects/gieo-app
npm install
cp .env.example .env   # Add Supabase + OpenRouter keys (optional — demo mode works without)
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key for AI sidebar |

Without env vars, the app runs in **Demo Mode** with seeded data.

## Supabase Setup

Run `supabase/schema.sql` in your Supabase SQL editor to create tables and enable Realtime on `messages`.

## Local File Storage

The Electron main process exposes IPC APIs via `window.gieo`:

- `saveFileToLocalSSD(data, path)` — Write text to `~/GIEO_Data/`
- `readFileFromSSD(path)` — Read file contents
- `pickAndSaveFile(clientSlug)` — Native file picker → save to Active folder
- `listLocalFiles('Active' | 'Archive')` — List stored files

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

Electron-Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui · @dnd-kit · Supabase · Zustand · Lucide React
