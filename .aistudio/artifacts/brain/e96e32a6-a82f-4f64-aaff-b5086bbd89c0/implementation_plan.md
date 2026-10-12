# TaskPad — Master Notepad Playbook & Checklist Hub

TaskPad transforms a collection of raw notepad instructions—whether pasted directly into the workspace or loaded in bulk from a local folder of `.txt` / `.md` files—into an interactive Master Homepage of executable task playbooks with step-by-step checkmarks, one-click command copying, run resets, and markdown/text export.

## User Review & Critical Decisions

> [!IMPORTANT]
> Below is the summary of your confirmed workflow choices and how the application will handle both direct notepad entry and bulk folder/file loading.

- **Confirmed Decision 1 — Loading & Creating Notepads**: Primary support for **pasting or typing notepad text directly inside the app** to instantly generate a task card, paired with a **Local Folder / Batch File Dropzone** (`webkitdirectory` / `.txt` & `.md` file selector) so you can also point the app to a folder of notepad files and auto-populate the master homepage in one click.
- **Confirmed Decision 2 — Line-by-Line & Numbered Step Parsing**: Automatic parser that converts numbered lines (`1.`, `1)`), bullets (`-`, `*`, `[ ]`, `[x]`), or plain non-empty lines into individual interactive checklist steps, while automatically detecting inline commands or code snippets (e.g., text in backticks, shell prefixes like `$`, `npm`, `git`, `docker`, paths, or indented code blocks) and attaching a one-click **Copy Snippet** button.
- **Confirmed Decision 3 — Reusable Playbooks with Reset**: Tasks act as repeatable Standard Operating Procedures (SOPs). You can check off steps as you execute a task, see real-time progress across the Master Homepage, and click **Reset Run** (for a single notepad or across all playbooks) to clear checkmarks for the next execution while keeping a counter of completed runs.
- **Confirmed Decision 4 — Full Editing, Filtering & File Export**:
  - **In-App Editor**: Edit step text, reorder/add/delete individual steps, or switch to a raw Notepad Editor mode to edit the underlying plain text directly.
  - **Master Homepage Filtering**: Live search across titles and step contents, tag filtering, and segmented status tabs (`All`, `Not Started`, `In Progress`, `Completed`).
  - **Export Progress to Notepad Files**: Export any single task (or batch-export all tasks) back to `.txt` or `.md` format with updated `[x]` / `[ ]` checkmarks so your files reflect current progress.

---

## 1. Overview & Core Concept

- **What It Does**: Serves as a centralized command center for procedural notepad tasks. Every notepad becomes a structured, trackable playbook card on a Master Homepage. Clicking any task opens its interactive step-by-step execution view where each instruction line has a completion checkbox, optional command copy action, inline editing, and file export.
- **Target Audience / Persona**: Engineers, operations specialists, and power users who maintain numerous `.txt` or `.md` notepads containing multi-step instructions, checklists, deployment steps, or repeatable workflows.
- **Key Value**: Eliminates losing track of which step you are on inside static text files, turns passive notes into interactive checklists without manual reformatting, and keeps everything organized in one searchable master dashboard.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Master Homepage & Instant Ingestion**:
   - Upon opening TaskPad, the user sees a pre-populated set of realistic sample notepad playbooks (so the interface is immediately demonstrable) alongside two prominent ingestion actions: **New Notepad (Paste / Type)** and **Load Notepad Folder / Files**.
   - Selecting a local folder or dragging `.txt`/`.md` files reads every file's title, tags, and lines, immediately generating cards on the Master Homepage.
   - Pasting raw multi-line instructions into the **Quick Paste Notepad Modal** shows a live preview of how many steps and command snippets were detected before saving.
2. **Filtering & Discovering Tasks**:
   - A workspace toolbar provides a real-time search input (matching both notepad titles and internal step instructions), a segmented status filter (`All` · `To Do` · `In Progress` · `Completed`), and unboxed tag filters.
3. **Interactive Step Execution View**:
   - Clicking a task card opens the **Playbook Execution View** (split master-detail or focused full-canvas drawer/view).
   - Each step displays its step number (`01`, `02` in tabular monospace), a tactile checkbox, the instruction text, and—if a command, URL, or snippet is detected—a dedicated **Copy** button with instant `"Copied"` feedback.
   - Clicking a step row toggles its completion checkmark, updates the playbook's completion bar, and increments the overall Master Homepage metrics.
   - Keyboard navigation allows pressing `Space` or `Enter` on focused steps, or clicking **"Check Next Step"** to advance sequentially.
4. **In-App Editing & Raw Notepad Sync**:
   - Users can toggle between **Checklist Mode** (check off steps, add a quick step inline, edit step text, or delete a step) and **Raw Notepad Mode** (a clean monospace notepad editor where editing lines directly updates the parsed steps while preserving check states for unchanged lines).
5. **Resetting Runs & Exporting Back to Files**:
   - When a repeatable task is finished (or ready to be run again), clicking **Reset Checkmarks** clears all step checkmarks for a fresh run and increments the playbook's `Completed Runs` counter.
   - Clicking **Export Notepad (`.txt` / `.md`)** downloads the notepad file formatted with `[x]` and `[ ]` markers reflecting the exact current completion state.

### Visual Identity & Theme

- **Aesthetic Direction**: High-craft utilitarian SaaS workspace inspired by precision developer and operations tools—crisp hairline borders, zero visual bloat, and tactile checklist ergonomics.
- **Color Palette & Mood (60-30-10 Discipline)**:
  - **60% Dominant Neutral Canvas**: Crisp warm-cool neutral light slate `#F8FAFC` (`bg-slate-50`) main canvas with pure white `#FFFFFF` (`bg-white`) primary workspace surfaces.
  - **30% Structural Surfaces & Typography**: Deep slate ink `#0F172A` (`text-slate-900`) for primary titles, muted slate `#475569` (`text-slate-600`) for secondary prose, and subtle `1px solid #E2E8F0` (`border-slate-200`) hairline dividers.
  - **10% Accent & Semantic Budget**:
    - Primary Interactive Accent: Deep Indigo/Slate `#0F172A` for primary CTAs and `#2563EB` (`blue-600`) for active selection and focus states.
    - Completed / Nominal State: Emerald `#16A34A` (`emerald-600`) paired with explicit `"Completed"` text labels and checkmark iconography.
    - In-Progress State: Amber `#D97706` (`amber-600`) paired with step ratio text (`3 / 8 steps`).
- **Typography & Hierarchy (2+1 Font Rule)**:
  - **Display & Navigation Face**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700) for the application wordmark, section headers, and task playbook titles with `text-wrap: balance`.
  - **Body & Step Instruction Face**: `DM Sans` (Regular 400 / Medium 500, `15px`–`16px`, line-height `1.6`) for comfortable reading of procedural instructions.
  - **Monospace & Tabular Data Face**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` strictly for step indices (`01`, `02`), completion ratios (`04 / 12`), timestamps, and inline copyable command blocks.
- **Component Styling & Spatial Rules**:
  - **Top Bar Contract**: Strict single-row, three-zone header separated by `gap-8`:
    1. *Brand Zone*: Single-line wordmark (`TaskPad`).
    2. *Navigation Zone*: Concise single-line links (`All Playbooks`, `In Progress`, `Completed`, `Import / Export`).
    3. *Action Zone*: Single primary CTA button (`+ New Notepad`).
  - **Zero-Pill Metadata Discipline**: Task categories, last-updated dates, run counts, and step counts on cards are rendered as clean, unboxed inline text separated by middle dots (`DevOps · 8 steps · 3 runs completed`), never wrapped in rounded pill badges.
  - **Single-Elevation Depth**: Task cards sit on a flat 1px bordered surface (`border border-slate-200 bg-white`) with subtle hover transition (`hover:border-slate-300`), avoiding nested bordered boxes or thick left accent stripes.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Ingestion (Direct Paste/Type + Local Folder/File Batch Upload)**
  - *Chosen Approach*: Provide both a rich "Paste / Type Notepad" modal and a browser-native Folder & Multi-File selector (`<input type="file" webkitdirectory multiple />` + drag-and-drop).
  - *Why*: You indicated wanting to paste/type notepad text directly in the app as well as placing notepad files in a location to auto-build the master homepage. Supporting both means you can import an entire folder of existing `.txt`/`.md` files in seconds and also create or paste new notepads directly in the browser.
  - *Alternatives Considered*: Requiring a local Node.js filesystem path watcher, which cannot access a user's local desktop folder when hosted in a cloud browser environment.
- **Decision 2: Smart Deterministic Step & Command Parser**
  - *Chosen Approach*: An instant client-side parser that splits notepad text into steps by line, strips redundant bullet/number prefixes while preserving existing `[x]`/`[ ]` states, treats lines ending with `:` or `# Header` as section dividers/headers, and extracts inline commands (backticks `` `...` `` or common CLI patterns) into copyable blocks.
  - *Why*: Delivers zero-latency parsing the instant you paste text or drop 50 notepad files, without waiting on network calls.
- **Decision 3: Persistent Local Storage + Two-Way `.txt`/`.md` Export**
  - *Chosen Approach*: Automatically persist all notepads, step checkmarks, tags, and run counts in `localStorage` so progress is never lost on refresh, paired with one-click export to `.txt` or `.md` files (with `[x]` checkmarks written into the text).
  - *Why*: Gives immediate reliability across browser sessions while allowing you to save updated checklist states back to portable text files whenever needed.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Header                            │
│  [TaskPad]        [All Playbooks · In Progress · Completed]  [+ New]    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────┐
│        Master Homepage View           │   │   Notepad Ingestion Layer   │
│  ┌─────────────────────────────────┐  │   │  ┌───────────────────────┐  │
│  │ Summary Metrics Strip (Tabular) │  │   │  │ Paste / Type Modal    │  │
│  │ Total · Completed Steps · Runs  │  │   │  │ + Live Step Preview   │  │
│  └─────────────────────────────────┘  │   │  └───────────────────────┘  │
│  ┌─────────────────────────────────┐  │   │  ┌───────────────────────┐  │
│  │ Search + Status Tabs + Tag Bar  │  │   │  │ Folder & .txt/.md     │  │
│  └─────────────────────────────────┘  │   │  │ Batch Dropzone        │  │
│  ┌─────────────────────────────────┐  │   └──────────────┬──────────────┘
│  │ Task Playbook Card Grid         │  │                  │
│  │  • Title & Unboxed Metadata     │  │                  ▼
│  │  • Progress Bar (e.g. 4/7)      │  │   ┌─────────────────────────────┐
│  │  • Quick Reset / Open Actions   │  │   │  Step & Snippet Parser      │
│  └────────────────┬────────────────┘  │   │  • Line/Bullet Tokenizer    │
└───────────────────┼───────────────────┘   │  • [x]/[ ] State Detector   │
                    │                       │  • CLI/Backtick Extractor   │
                    ▼                       └──────────────┬──────────────┘
┌───────────────────────────────────────┐                  │
│    Playbook Step Execution View       │                  ▼
│  ┌─────────────────────────────────┐  │   ┌─────────────────────────────┐
│  │ Header: Title, Tag, Progress,   │  │   │  Playbook State Store       │
│  │ [Checklist | Raw Text] Toggle   │  │◄──┤  (React State + Persistent  │
│  │ [Reset Run] [Export .txt/.md]   │  │   │   localStorage Sync)        │
│  └─────────────────────────────────┘  │   └─────────────────────────────┘
│  ┌─────────────────────────────────┐  │
│  │ Interactive Step List           │  │
│  │  [✓] 01. Step instruction text  │  │
│  │      ┌───────────────────────┐  │  │
│  │      │ $ npm run deploy [Copy]│  │  │
│  │      └───────────────────────┘  │  │
│  │  [ ] 02. Next instruction...    │  │
│  │  [+ Add Step Inline]            │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

### Data Model & State

- **`NotepadPlaybook`**:
  - `id`: Unique identifier
  - `title`: Derived automatically from filename (without `.txt`/`.md`) or first heading/user input
  - `category`: Tag/folder label (e.g., `Deployment`, `Server Setup`, `Daily Ops`, `Database`)
  - `rawContent`: Full synchronized plain-text notepad content
  - `steps`: Array of `PlaybookStep` items
  - `runCount`: Number of times this playbook was completed and reset
  - `updatedAt`: ISO timestamp of last check/edit
- **`PlaybookStep`**:
  - `id`: Step identifier
  - `index`: 1-based tabular order number
  - `text`: Clean instruction text
  - `completed`: Boolean checkmark state
  - `snippets`: Array of extracted command/code strings for one-click copying
  - `note`: Optional secondary clarification line

### Interactive Component & State Mapping

- **Folder & Batch File Loader**: Reads `.txt`, `.md`, and `.log` files via `FileReader`, groups or tags them by folder name if loaded via directory picker, parses every line into `PlaybookStep` objects, and merges them into the Master Homepage state.
- **Paste / Create Modal**: Accepts a title, category tag, and raw notepad text; live-parses the text as the user types so they can immediately see the resulting step count and detected copyable snippets before saving.
- **Step Checkmark & Run Lifecycle**:
  - Toggling a step updates `step.completed` and recalculates playbook status (`not_started` when `0` checked, `in_progress` when `1..n-1` checked, `completed` when `n/n` checked).
  - Clicking **Check Next Unfinished Step** automatically marks the first unchecked step as done and scrolls it into view.
  - Clicking **Reset Run** clears all `completed` flags on the playbook and optionally increments `runCount` if steps were completed.
- **Bidirectional Raw Text Editor**: Switching a playbook to **Raw Notepad Mode** serializes steps back into clean lines (`[x] 1. Step...` or `[ ] 1. Step...`). Saving edits re-runs the parser while preserving completion states and step IDs where text matches.
- **Export Utility**: Generates a downloadable `.txt` or `.md` file for a single playbook—or a combined master checklist bundle—reflecting current `[x]` / `[ ]` progress.
