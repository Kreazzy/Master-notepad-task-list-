import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  FolderOpen,
  Plus,
  RotateCcw,
  Search,
  Terminal,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { NotepadPlaybook, StatusFilter } from './types';
import { getInitialPlaybooks } from './data/samplePlaybooks';
import {
  downloadTextFile,
  getPlaybookMetrics,
  parseNotepadTextToSteps,
  serializePlaybookToNotepadText,
  titleFromFileName,
} from './utils/parser';
import { NewNotepadModal } from './components/NewNotepadModal';
import { FolderImportExportModal } from './components/FolderImportExportModal';
import { PlaybookDetailView } from './components/PlaybookDetailView';

const STORAGE_KEY = 'taskpad_master_playbooks_v1';

export default function App() {
  const [playbooks, setPlaybooks] = useState<NotepadPlaybook[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial sample playbooks
    }
    return getInitialPlaybooks();
  });

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const quickFolderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks));
    } catch {
      // Ignore storage quota errors
    }
  }, [playbooks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    playbooks.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [playbooks]);

  const summaryStats = useMemo(() => {
    let totalSteps = 0;
    let completedSteps = 0;
    let inProgressPlaybooks = 0;
    let completedPlaybooks = 0;
    let totalRuns = 0;

    for (const pb of playbooks) {
      const m = getPlaybookMetrics(pb);
      totalSteps += m.total;
      completedSteps += m.completed;
      if (m.status === 'in_progress') inProgressPlaybooks += 1;
      if (m.status === 'completed') completedPlaybooks += 1;
      totalRuns += pb.runCount;
    }

    return {
      totalPlaybooks: playbooks.length,
      totalSteps,
      completedSteps,
      inProgressPlaybooks,
      completedPlaybooks,
      totalRuns,
    };
  }, [playbooks]);

  const filteredPlaybooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return playbooks.filter((pb) => {
      const metrics = getPlaybookMetrics(pb);

      if (statusFilter !== 'all' && metrics.status !== statusFilter) {
        return false;
      }

      if (
        selectedCategory !== 'all' &&
        pb.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      if (!q) return true;

      const matchesHeader =
        pb.title.toLowerCase().includes(q) ||
        pb.category.toLowerCase().includes(q) ||
        pb.fileName.toLowerCase().includes(q);

      const matchesSteps = pb.steps.some(
        (s) =>
          s.text.toLowerCase().includes(q) ||
          s.snippets.some((snip) => snip.toLowerCase().includes(q)) ||
          (s.section && s.section.toLowerCase().includes(q))
      );

      return matchesHeader || matchesSteps;
    });
  }, [playbooks, searchQuery, statusFilter, selectedCategory]);

  const selectedPlaybook = useMemo(
    () => playbooks.find((p) => p.id === selectedPlaybookId) || null,
    [playbooks, selectedPlaybookId]
  );

  const handleCreatePlaybook = (newPlaybook: NotepadPlaybook) => {
    setPlaybooks((prev) => [newPlaybook, ...prev]);
    setSelectedPlaybookId(newPlaybook.id);
    showToast(`Created playbook "${newPlaybook.title}"`);
  };

  const handleUpdatePlaybook = (updated: NotepadPlaybook) => {
    setPlaybooks((prev) =>
      prev.map((pb) => (pb.id === updated.id ? updated : pb))
    );
  };

  const handleDeletePlaybook = (id: string) => {
    const target = playbooks.find((p) => p.id === id);
    setPlaybooks((prev) => prev.filter((pb) => pb.id !== id));
    if (selectedPlaybookId === id) {
      setSelectedPlaybookId(null);
    }
    if (target) {
      showToast(`Deleted "${target.title}"`);
    }
  };

  const handleImportPlaybooks = (
    imported: NotepadPlaybook[],
    replaceExisting: boolean
  ) => {
    setPlaybooks((prev) =>
      replaceExisting ? imported : [...imported, ...prev]
    );
    showToast(
      `Loaded ${imported.length} notepad ${
        imported.length === 1 ? 'task' : 'tasks'
      } onto the Master Homepage`
    );
  };

  const handleResetAllRuns = () => {
    setPlaybooks((prev) =>
      prev.map((pb) => ({
        ...pb,
        steps: pb.steps.map((s) => ({ ...s, completed: false })),
        updatedAt: new Date().toISOString(),
      }))
    );
    showToast('Reset checkmarks across all playbooks');
  };

  const handleQuickResetCard = (e: React.MouseEvent, pb: NotepadPlaybook) => {
    e.stopPropagation();
    const hadCompleted = pb.steps.some((s) => s.completed);
    if (!hadCompleted) return;

    const wasAllCompleted =
      pb.steps.length > 0 && pb.steps.every((s) => s.completed);

    handleUpdatePlaybook({
      ...pb,
      steps: pb.steps.map((s) => ({ ...s, completed: false })),
      runCount: !wasAllCompleted ? pb.runCount + 1 : pb.runCount,
      updatedAt: new Date().toISOString(),
    });
    showToast(`Reset checkmarks for "${pb.title}"`);
  };

  const handleQuickCheckNextOnCard = (
    e: React.MouseEvent,
    pb: NotepadPlaybook
  ) => {
    e.stopPropagation();
    const nextStep = pb.steps.find((s) => !s.completed);
    if (!nextStep) return;

    const updatedSteps = pb.steps.map((s) =>
      s.id === nextStep.id ? { ...s, completed: true } : s
    );
    const allCompletedNow =
      updatedSteps.length > 0 && updatedSteps.every((s) => s.completed);

    handleUpdatePlaybook({
      ...pb,
      steps: updatedSteps,
      runCount: allCompletedNow ? pb.runCount + 1 : pb.runCount,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleQuickExportCard = (e: React.MouseEvent, pb: NotepadPlaybook) => {
    e.stopPropagation();
    const content = serializePlaybookToNotepadText(pb, 'txt');
    const baseName = pb.fileName.replace(/\.(txt|md|log)$/i, '');
    downloadTextFile(`${baseName}.txt`, content);
    showToast(`Exported "${baseName}.txt" with current checkmarks`);
  };

  const handlePageFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverPage(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const files = Array.from(e.dataTransfer.files).filter((file) => {
      const name = file.name.toLowerCase();
      return (
        !name.startsWith('.') &&
        (name.endsWith('.txt') ||
          name.endsWith('.md') ||
          name.endsWith('.log') ||
          file.type === 'text/plain' ||
          file.type === 'text/markdown')
      );
    });

    if (files.length === 0) {
      showToast('Please drop .txt or .md notepad files');
      return;
    }

    const imported: NotepadPlaybook[] = [];
    for (const file of files) {
      const text = await file.text();
      const parsed = parseNotepadTextToSteps(text);
      if (parsed.steps.length === 0) continue;

      imported.push({
        id: `playbook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: parsed.inferredTitle || titleFromFileName(file.name),
        fileName: file.name,
        category: parsed.inferredCategory || 'Imported',
        steps: parsed.steps,
        runCount: 0,
        updatedAt: new Date(file.lastModified || Date.now()).toISOString(),
      });
    }

    if (imported.length > 0) {
      handleImportPlaybooks(imported, false);
    }
  };

  const handleDirectFolderChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files).filter((f) => {
      const n = f.name.toLowerCase();
      return (
        !n.startsWith('.') &&
        (n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.log'))
      );
    });

    const imported: NotepadPlaybook[] = [];
    for (const file of files) {
      const text = await file.text();
      const parsed = parseNotepadTextToSteps(text);
      if (parsed.steps.length === 0) continue;

      const relPath = (file as File & { webkitRelativePath?: string })
        .webkitRelativePath;
      let folderCategory = 'Imported';
      if (relPath && relPath.includes('/')) {
        const parts = relPath.split('/');
        if (parts.length >= 2 && parts[parts.length - 2]) {
          folderCategory = parts[parts.length - 2]
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }

      imported.push({
        id: `playbook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: parsed.inferredTitle || titleFromFileName(file.name),
        fileName: file.name,
        category: parsed.inferredCategory || folderCategory,
        steps: parsed.steps,
        runCount: 0,
        updatedAt: new Date(file.lastModified || Date.now()).toISOString(),
      });
    }

    if (imported.length > 0) {
      handleImportPlaybooks(imported, false);
    } else {
      showToast('No .txt or .md notepad files found in selected folder');
    }
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDraggingOverPage) setIsDraggingOverPage(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOverPage(false);
      }}
      onDrop={handlePageFileDrop}
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      {/* Hidden Direct Folder Picker Input */}
      <input
        ref={quickFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is supported for local folder selection
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleDirectFolderChange}
      />

      {/* Full-Viewport Drag Overlay */}
      {isDraggingOverPage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-8 backdrop-blur-[1px]">
          <div className="flex max-w-md flex-col items-center rounded-xl border-2 border-dashed border-blue-600 bg-white p-8 text-center shadow-xl">
            <FolderOpen className="h-10 w-10 text-blue-600" />
            <p className="mt-3 font-display text-base font-semibold text-slate-900">
              Drop Notepad Files (.txt / .md) Here
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Every dropped notepad file will be parsed into an interactive checklist card on your Master Homepage.
            </p>
          </div>
        </div>
      )}

      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setSelectedPlaybookId(null);
            setStatusFilter('all');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          TaskPad
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => {
              setSelectedPlaybookId(null);
              setStatusFilter('all');
            }}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 ${
              !selectedPlaybookId && statusFilter === 'all'
                ? 'text-slate-900 underline decoration-blue-600 decoration-2 underline-offset-8'
                : ''
            }`}
          >
            All Playbooks
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPlaybookId(null);
              setStatusFilter('in_progress');
            }}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 ${
              !selectedPlaybookId && statusFilter === 'in_progress'
                ? 'text-slate-900 underline decoration-blue-600 decoration-2 underline-offset-8'
                : ''
            }`}
          >
            In Progress
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPlaybookId(null);
              setStatusFilter('completed');
            }}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 ${
              !selectedPlaybookId && statusFilter === 'completed'
                ? 'text-slate-900 underline decoration-blue-600 decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Completed
          </button>
          <button
            type="button"
            onClick={() => setIsFolderModalOpen(true)}
            className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            Folder & Export
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            New Notepad
          </button>
        </div>
      </header>

      {/* Main Content Area: Either Selected Playbook Execution View or Master Homepage */}
      {selectedPlaybook ? (
        <PlaybookDetailView
          playbook={selectedPlaybook}
          onBack={() => setSelectedPlaybookId(null)}
          onUpdatePlaybook={handleUpdatePlaybook}
          onDeletePlaybook={handleDeletePlaybook}
        />
      ) : (
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Master Homepage Header & Folder Ingestion Bar */}
          <section className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Master Task Directory & Execution Hub
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900">
                Notepad Task Playbooks
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Point TaskPad to a local folder of <code className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-xs text-slate-800">.txt</code> or <code className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-xs text-slate-800">.md</code> notepads—or paste instructions directly—to generate interactive checklists with step-by-step checkmarks and copyable commands.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => quickFolderInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <FolderOpen className="h-4 w-4 text-slate-600" />
                Load Notepad Folder
              </button>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Batch Import / Export
              </button>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                Paste Notepad Text
              </button>
            </div>
          </section>

          {/* 4-Column Tabular KPI Summary Strip */}
          <section
            aria-label="Workspace Metrics"
            className="mt-6 grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
          >
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">
                Total Notepad Playbooks
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {String(summaryStats.totalPlaybooks).padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-500">
                  {categories.length} categories
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">
                Checked Steps Across Homepage
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {String(summaryStats.completedSteps).padStart(2, '0')}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / {String(summaryStats.totalSteps).padStart(2, '0')}
                  </span>
                </span>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {summaryStats.totalSteps > 0
                    ? Math.round(
                        (summaryStats.completedSteps /
                          summaryStats.totalSteps) *
                          100
                      )
                    : 0}
                  % done
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">
                Active vs Completed Tasks
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {summaryStats.inProgressPlaybooks} active
                </span>
                <span className="font-mono text-xs text-emerald-700 tabular-nums">
                  {summaryStats.completedPlaybooks} completed
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">
                Cumulative Playbook Runs
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {summaryStats.totalRuns}
                </span>
                <button
                  type="button"
                  onClick={handleResetAllRuns}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline whitespace-nowrap shrink-0"
                >
                  Reset all checkmarks
                </button>
              </div>
            </div>
          </section>

          {/* Search, Status Segmented Control & Category Filter Toolbar */}
          <section className="mt-8 space-y-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              {/* Search Input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notepads by title, step instruction, or CLI command..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Segmented Status Filter Controls */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {(
                  [
                    { id: 'all', label: 'All Tasks' },
                    { id: 'not_started', label: 'Not Started' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'completed', label: 'Completed' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Category Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
              <span className="mr-1 text-xs font-medium text-slate-500">
                Category:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                All ({playbooks.length})
              </button>
              {categories.map((cat) => {
                const count = playbooks.filter(
                  (p) => p.category.toLowerCase() === cat.toLowerCase()
                ).length;
                const isSelected =
                  selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(isSelected ? 'all' : cat)
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </section>

          {/* Master Homepage Task Card Grid */}
          {filteredPlaybooks.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
                No matching notepad playbooks found
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Try clearing your search or status filter, or add a new task notepad from a local folder or text paste.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setSelectedCategory('all');
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  + Paste New Notepad
                </button>
              </div>
            </div>
          ) : (
            <section
              aria-label="Notepad Task Cards"
              className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredPlaybooks.map((pb) => {
                const metrics = getPlaybookMetrics(pb);
                const nextUnfinishedStep = pb.steps.find((s) => !s.completed);
                const totalSnippets = pb.steps.reduce(
                  (acc, s) => acc + s.snippets.length,
                  0
                );

                return (
                  <article
                    key={pb.id}
                    onClick={() => setSelectedPlaybookId(pb.id)}
                    className="group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300"
                  >
                    <div>
                      {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {pb.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {metrics.total} steps
                        </span>
                        {totalSnippets > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Terminal className="h-3 w-3 text-slate-400" />
                              {totalSnippets} cmd
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {pb.runCount} {pb.runCount === 1 ? 'run' : 'runs'}
                        </span>
                      </div>

                      {/* Card Title */}
                      <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors">
                        {pb.title}
                      </h2>

                      {/* Next Active Step Preview or Completed Status */}
                      <div className="mt-4 border-t border-slate-100 pt-3.5">
                        {nextUnfinishedStep ? (
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                              <span>
                                Next Step (#
                                {String(
                                  pb.steps.findIndex(
                                    (s) => s.id === nextUnfinishedStep.id
                                  ) + 1
                                ).padStart(2, '0')}
                                )
                              </span>
                              {nextUnfinishedStep.section && (
                                <span className="truncate max-w-[140px]">
                                  {nextUnfinishedStep.section}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-700">
                              {nextUnfinishedStep.text}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>
                              All {metrics.total} steps checked off for this run
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Progress Bar & Quick Card Controls */}
                    <div className="mt-6 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-medium ${
                            metrics.status === 'completed'
                              ? 'text-emerald-700'
                              : metrics.status === 'in_progress'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {metrics.status === 'completed'
                            ? 'Completed'
                            : metrics.status === 'in_progress'
                            ? 'In Progress'
                            : 'Not Started'}
                        </span>
                        <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                          {String(metrics.completed).padStart(2, '0')} /{' '}
                          {String(metrics.total).padStart(2, '0')} (
                          {metrics.percentage}%)
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full transition-all duration-150 ${
                            metrics.status === 'completed'
                              ? 'bg-emerald-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${metrics.percentage}%` }}
                        />
                      </div>

                      {/* Card Footer Action Row */}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          {nextUnfinishedStep && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickCheckNextOnCard(e, pb)}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap shrink-0"
                              title="Mark the next unfinished step as done"
                            >
                              <Check className="h-3 w-3" />
                              Check Step
                            </button>
                          )}

                          {metrics.completed > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickResetCard(e, pb)}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap shrink-0"
                              title="Reset all step checkmarks for a new run"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reset
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleQuickExportCard(e, pb)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 whitespace-nowrap shrink-0"
                            title="Export updated .txt notepad"
                          >
                            <Download className="h-3 w-3" />
                            .txt
                          </button>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 group-hover:text-blue-600 whitespace-nowrap shrink-0">
                          Open Steps
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>
      )}

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <NewNotepadModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        existingCategories={categories}
        onCreatePlaybook={handleCreatePlaybook}
      />

      <FolderImportExportModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        playbooks={playbooks}
        onImportPlaybooks={handleImportPlaybooks}
        onResetAllRuns={handleResetAllRuns}
      />
    </div>
  );
}
