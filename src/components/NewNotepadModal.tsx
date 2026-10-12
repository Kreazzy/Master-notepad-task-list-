import React, { useMemo, useState } from 'react';
import { X, FileText, Terminal, CheckSquare, Plus } from 'lucide-react';
import { NotepadPlaybook } from '../types';
import { parseNotepadTextToSteps } from '../utils/parser';

interface NewNotepadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCategories: string[];
  onCreatePlaybook: (playbook: NotepadPlaybook) => void;
}

const SAMPLE_PASTE_PLACEHOLDER = `Pre-Deployment Checks:
1. Pull latest main branch changes with \`git pull origin main\`
2. Run typecheck and linter via \`npm run lint\`
3. Build production bundle: \`npm run build\`

Release Execution:
4. Restart PM2 application process with \`pm2 reload all\`
5. Verify production status page responds HTTP 200`;

export const NewNotepadModal: React.FC<NewNotepadModalProps> = ({
  isOpen,
  onClose,
  existingCategories,
  onCreatePlaybook,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Operations');
  const [customCategory, setCustomCategory] = useState('');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');

  const livePreview = useMemo(() => {
    return parseNotepadTextToSteps(rawText);
  }, [rawText]);

  if (!isOpen) return null;

  const effectiveCategory =
    category === '__custom__'
      ? customCategory.trim() || 'General'
      : category || livePreview.inferredCategory || 'General';

  const effectiveTitle =
    title.trim() || livePreview.inferredTitle || 'Untitled Task Playbook';

  const snippetCount = livePreview.steps.reduce(
    (sum, s) => sum + s.snippets.length,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (livePreview.steps.length === 0) {
      setError('Please enter or paste at least one step instruction line.');
      return;
    }

    const sanitizedFileName =
      effectiveTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') + '.txt';

    const newPlaybook: NotepadPlaybook = {
      id: `playbook-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: effectiveTitle,
      fileName: sanitizedFileName,
      category: effectiveCategory,
      steps: livePreview.steps,
      runCount: 0,
      updatedAt: new Date().toISOString(),
    };

    onCreatePlaybook(newPlaybook);
    setTitle('');
    setRawText('');
    setError('');
    onClose();
  };

  const handleLoadExample = () => {
    setTitle('PM2 Production Node Service Reload');
    setCategory('Deployment');
    setRawText(SAMPLE_PASTE_PLACEHOLDER);
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-notepad-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="new-notepad-modal-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Paste or Write New Notepad Playbook
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Each numbered item, bullet point, or line automatically becomes a checkable task step. Wrap commands in backticks for a copy button.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="grid flex-1 grid-cols-1 divide-y divide-slate-200 overflow-y-auto lg:grid-cols-12 lg:divide-x lg:divide-y-0"
        >
          {/* Left Column: Notepad Input */}
          <div className="flex flex-col gap-4 p-6 lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="notepad-title"
                  className="block text-xs font-medium text-slate-700"
                >
                  Task Playbook Title
                </label>
                <input
                  id="notepad-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Database Failover Check"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="notepad-category"
                  className="block text-xs font-medium text-slate-700"
                >
                  Category / Group
                </label>
                {category === '__custom__' ? (
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter category name..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setCategory(existingCategories[0] || 'Operations')}
                      className="rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    id="notepad-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    {Array.from(
                      new Set([
                        'Deployment',
                        'Operations',
                        'Infrastructure',
                        'Onboarding',
                        'Security',
                        'Database',
                        ...existingCategories,
                      ])
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ New Custom Category...</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="notepad-raw-content"
                  className="block text-xs font-medium text-slate-700"
                >
                  Notepad Instructions (one step per line)
                </label>
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Insert Sample Notepad
                </button>
              </div>
              <textarea
                id="notepad-raw-content"
                rows={11}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  if (error) setError('');
                }}
                placeholder={SAMPLE_PASTE_PLACEHOLDER}
                className="mt-1.5 w-full flex-1 rounded-lg border border-slate-300 bg-slate-50/60 p-3.5 font-mono text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              {error && (
                <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
              )}
            </div>
          </div>

          {/* Right Column: Live Step Parsing Preview */}
          <div className="flex flex-col bg-slate-50/70 p-6 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-semibold text-slate-700">
                Live Checklist Preview
              </span>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-500 tabular-nums">
                <span>{livePreview.steps.length} steps</span>
                <span aria-hidden="true">·</span>
                <span>{snippetCount} commands</span>
              </div>
            </div>

            {livePreview.steps.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Waiting for notepad instructions
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-400">
                  Type or paste lines on the left to see how TaskPad parses steps and terminal snippets.
                </p>
              </div>
            ) : (
              <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 max-h-[340px]">
                {livePreview.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    {step.section &&
                      (idx === 0 ||
                        livePreview.steps[idx - 1].section !== step.section) && (
                        <div className="mb-1.5 text-[11px] font-semibold text-slate-500">
                          {step.section}
                        </div>
                      )}
                    <div className="flex items-start gap-2">
                      <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="flex-1 text-slate-800">{step.text}</span>
                    </div>
                    {step.snippets.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                        <Terminal className="h-3 w-3 shrink-0 text-slate-500" />
                        <span className="truncate">{step.snippets[0]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Task Playbook
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
