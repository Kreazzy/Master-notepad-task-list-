import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  CornerDownRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { NotepadPlaybook, PlaybookStep } from '../types';
import {
  downloadTextFile,
  extractSnippetsFromLine,
  getPlaybookMetrics,
  parseNotepadTextToSteps,
  serializePlaybookToNotepadText,
} from '../utils/parser';

interface PlaybookDetailViewProps {
  playbook: NotepadPlaybook;
  onBack: () => void;
  onUpdatePlaybook: (updated: NotepadPlaybook) => void;
  onDeletePlaybook: (id: string) => void;
}

export const PlaybookDetailView: React.FC<PlaybookDetailViewProps> = ({
  playbook,
  onBack,
  onUpdatePlaybook,
  onDeletePlaybook,
}) => {
  const [viewMode, setViewMode] = useState<'checklist' | 'raw'>('checklist');
  const [rawEditorText, setRawEditorText] = useState(() =>
    serializePlaybookToNotepadText(playbook, 'txt')
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inline step editing states
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState('');
  const [newStepText, setNewStepText] = useState('');
  const [newStepSection, setNewStepSection] = useState('');

  // Title & Category inline editing
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState(playbook.title);
  const [headerCategory, setHeaderCategory] = useState(playbook.category);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const metrics = getPlaybookMetrics(playbook);

  const handleToggleStep = (stepId: string) => {
    const updatedSteps = playbook.steps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    const allCompletedNow =
      updatedSteps.length > 0 && updatedSteps.every((s) => s.completed);
    const wasAllCompleted =
      playbook.steps.length > 0 && playbook.steps.every((s) => s.completed);

    onUpdatePlaybook({
      ...playbook,
      steps: updatedSteps,
      runCount:
        allCompletedNow && !wasAllCompleted
          ? playbook.runCount + 1
          : playbook.runCount,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCheckNextStep = () => {
    const nextUnfinished = playbook.steps.find((s) => !s.completed);
    if (nextUnfinished) {
      handleToggleStep(nextUnfinished.id);
    }
  };

  const handleResetPlaybookRun = () => {
    const hadAnyCompleted = playbook.steps.some((s) => s.completed);
    const wasAllCompleted =
      playbook.steps.length > 0 && playbook.steps.every((s) => s.completed);

    const resetSteps = playbook.steps.map((s) => ({
      ...s,
      completed: false,
    }));

    onUpdatePlaybook({
      ...playbook,
      steps: resetSteps,
      // If they partially ran it and wasn't already incremented at 100%, keep runCount or increment if all were done
      runCount:
        hadAnyCompleted && !wasAllCompleted
          ? playbook.runCount + 1
          : playbook.runCount,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopySnippet = async (snippet: string, key: string) => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      // Fallback copy
    }
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStepText.trim();
    if (!trimmed) return;

    const { cleanText, snippets } = extractSnippetsFromLine(trimmed);
    const lastStep = playbook.steps[playbook.steps.length - 1];
    const sectionToUse =
      newStepSection.trim() || (lastStep ? lastStep.section : undefined);

    const newStep: PlaybookStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      index: playbook.steps.length + 1,
      text: cleanText,
      completed: false,
      snippets,
      section: sectionToUse,
    };

    onUpdatePlaybook({
      ...playbook,
      steps: [...playbook.steps, newStep],
      updatedAt: new Date().toISOString(),
    });
    setNewStepText('');
  };

  const handleSaveEditedStep = (stepId: string) => {
    const trimmed = editingStepText.trim();
    if (!trimmed) return;

    const { cleanText, snippets } = extractSnippetsFromLine(trimmed);
    const updatedSteps = playbook.steps.map((s) =>
      s.id === stepId ? { ...s, text: cleanText, snippets } : s
    );

    onUpdatePlaybook({
      ...playbook,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    });
    setEditingStepId(null);
    setEditingStepText('');
  };

  const handleDeleteStep = (stepId: string) => {
    const filtered = playbook.steps
      .filter((s) => s.id !== stepId)
      .map((s, i) => ({ ...s, index: i + 1 }));

    onUpdatePlaybook({
      ...playbook,
      steps: filtered,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= playbook.steps.length) return;

    const copy = [...playbook.steps];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const reindexed = copy.map((s, idx) => ({ ...s, index: idx + 1 }));
    onUpdatePlaybook({
      ...playbook,
      steps: reindexed,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSwitchMode = (mode: 'checklist' | 'raw') => {
    if (mode === 'raw') {
      setRawEditorText(serializePlaybookToNotepadText(playbook, 'txt'));
      setViewMode('raw');
    } else {
      // Parse raw text back into steps while preserving completion states
      const parsed = parseNotepadTextToSteps(rawEditorText, playbook.steps);
      if (parsed.steps.length > 0) {
        onUpdatePlaybook({
          ...playbook,
          title: parsed.inferredTitle || playbook.title,
          category: parsed.inferredCategory || playbook.category,
          steps: parsed.steps,
          updatedAt: new Date().toISOString(),
        });
      }
      setViewMode('checklist');
    }
  };

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePlaybook({
      ...playbook,
      title: headerTitle.trim() || playbook.title,
      category: headerCategory.trim() || playbook.category,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingHeader(false);
  };

  const handleExportSingle = (format: 'txt' | 'md') => {
    const content = serializePlaybookToNotepadText(playbook, format);
    const baseName = playbook.fileName.replace(/\.(txt|md|log)$/i, '');
    downloadTextFile(`${baseName}.${format}`, content);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Breadcrumb & Back Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Master Homepage
        </button>

        {/* Segmented Mode Switch + Export & Reset Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('checklist')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'checklist'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interactive Checklist
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('raw')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'raw'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Notepad Editor
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleExportSingle('txt')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            title="Download updated notepad (.txt) with [x] checkmarks"
          >
            <Download className="h-3.5 w-3.5" />
            Export .txt
          </button>

          <button
            type="button"
            onClick={() => handleExportSingle('md')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            title="Download updated Markdown (.md) checklist"
          >
            <FileText className="h-3.5 w-3.5" />
            Export .md
          </button>
        </div>
      </div>

      {/* Main Playbook Surface */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {/* Playbook Header & Progress Bar */}
        <div className="border-b border-slate-200 p-6">
          {isEditingHeader ? (
            <form onSubmit={handleSaveHeader} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Playbook Title
                  </label>
                  <input
                    type="text"
                    value={headerTitle}
                    onChange={(e) => setHeaderTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={headerCategory}
                    onChange={(e) => setHeaderCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  Save Details
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingHeader(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                {/* Zero-Pill Unboxed Metadata Line */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {playbook.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{playbook.fileName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {playbook.runCount} completed{' '}
                    {playbook.runCount === 1 ? 'run' : 'runs'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderTitle(playbook.title);
                      setHeaderCategory(playbook.category);
                      setIsEditingHeader(true);
                    }}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 hover:underline whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit title/tag
                  </button>
                </div>

                <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900">
                  {playbook.title}
                </h1>
              </div>

              {/* Execution Control Strip */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {metrics.completed < metrics.total && (
                  <button
                    type="button"
                    onClick={handleCheckNextStep}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Check Next Step
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetPlaybookRun}
                  disabled={metrics.completed === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Checkmarks
                </button>

                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDeletePlaybook(playbook.id)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    title="Delete Playbook"
                    aria-label="Delete Playbook"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar & Status Readout */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {metrics.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    All Steps Completed
                  </span>
                ) : metrics.status === 'in_progress' ? (
                  <span className="font-medium text-amber-700">
                    Execution In Progress
                  </span>
                ) : (
                  <span className="text-slate-500">Ready to Execute</span>
                )}
              </div>

              <div className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                {String(metrics.completed).padStart(2, '0')} /{' '}
                {String(metrics.total).padStart(2, '0')} steps (
                {metrics.percentage}%)
              </div>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all duration-150 ${
                  metrics.status === 'completed'
                    ? 'bg-emerald-600'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${metrics.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body: Either Interactive Checklist or Raw Notepad Mode */}
        {viewMode === 'raw' ? (
          <div className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Edit raw notepad lines directly. Use <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">[x]</code> or <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">[ ]</code> for checkmarks and wrap commands in backticks <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">`command`</code>.
              </p>
              <button
                type="button"
                onClick={() => handleSwitchMode('checklist')}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Apply & Return to Checklist
              </button>
            </div>
            <textarea
              rows={18}
              value={rawEditorText}
              onChange={(e) => setRawEditorText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {playbook.steps.map((step, idx) => {
              const showSectionHeader =
                step.section &&
                (idx === 0 || playbook.steps[idx - 1].section !== step.section);
              const isEditingThisStep = editingStepId === step.id;

              return (
                <React.Fragment key={step.id}>
                  {showSectionHeader && (
                    <div className="bg-slate-50/90 px-6 py-2.5 text-xs font-semibold tracking-tight text-slate-700">
                      {step.section}
                    </div>
                  )}

                  <div
                    className={`group flex items-start gap-4 px-6 py-4 transition-colors ${
                      step.completed
                        ? 'bg-emerald-50/25 hover:bg-emerald-50/40'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Tactile Checkbox Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStep(step.id)}
                      aria-label={
                        step.completed
                          ? `Mark step ${idx + 1} as incomplete`
                          : `Mark step ${idx + 1} as complete`
                      }
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        step.completed
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-blue-600'
                      }`}
                    >
                      {step.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </button>

                    {/* Tabular Step Number */}
                    <span
                      onClick={() => handleToggleStep(step.id)}
                      className={`mt-0.5 cursor-pointer select-none font-mono text-xs font-medium tabular-nums ${
                        step.completed ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}.
                    </span>

                    {/* Step Instruction Content */}
                    <div className="min-w-0 flex-1">
                      {isEditingThisStep ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={editingStepText}
                            onChange={(e) => setEditingStepText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditedStep(step.id);
                              if (e.key === 'Escape') setEditingStepId(null);
                            }}
                            className="flex-1 rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEditedStep(step.id)}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStepId(null)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleToggleStep(step.id)}
                          className="cursor-pointer select-text"
                        >
                          <p
                            className={`text-[15px] leading-relaxed transition-colors ${
                              step.completed
                                ? 'text-slate-500 line-through decoration-slate-400'
                                : 'text-slate-900'
                            }`}
                          >
                            {step.text}
                          </p>
                          {step.note && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <CornerDownRight className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{step.note}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Extracted Command Snippets with Copy Button */}
                      {step.snippets.length > 0 && !isEditingThisStep && (
                        <div className="mt-2.5 space-y-1.5">
                          {step.snippets.map((snippet, sIdx) => {
                            const copyId = `${step.id}-snippet-${sIdx}`;
                            const isCopied = copiedKey === copyId;
                            return (
                              <div
                                key={copyId}
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-900 px-3.5 py-2 text-xs text-slate-100"
                              >
                                <code className="overflow-x-auto font-mono text-xs text-slate-100">
                                  <span className="mr-2 select-none text-slate-500">
                                    $
                                  </span>
                                  {snippet}
                                </code>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopySnippet(snippet, copyId);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white whitespace-nowrap shrink-0"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-400" />
                                      <span className="text-emerald-300">
                                        Copied
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Step Row Quick Actions (Move Up/Down, Edit, Delete) */}
                    {!isEditingThisStep && (
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, -1)}
                          disabled={idx === 0}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
                          title="Move step up"
                          aria-label="Move step up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 1)}
                          disabled={idx === playbook.steps.length - 1}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
                          title="Move step down"
                          aria-label="Move step down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStepId(step.id);
                            setEditingStepText(step.text);
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Edit step instruction"
                          aria-label="Edit step instruction"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(step.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete step"
                          aria-label="Delete step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Inline Add New Step Footer */}
            <form
              onSubmit={handleAddStep}
              className="flex flex-col gap-3 bg-slate-50/70 px-6 py-4 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                value={newStepSection}
                onChange={(e) => setNewStepSection(e.target.value)}
                placeholder="Section (optional)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none sm:w-44"
              />
              <input
                type="text"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                placeholder="Add a new step instruction... (use `backticks` for commands)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
