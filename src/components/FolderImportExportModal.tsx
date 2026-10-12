import React, { useRef, useState } from 'react';
import {
  X,
  FolderOpen,
  Upload,
  Download,
  RotateCcw,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { NotepadPlaybook } from '../types';
import {
  downloadTextFile,
  getPlaybookMetrics,
  parseNotepadTextToSteps,
  serializePlaybookToNotepadText,
  titleFromFileName,
} from '../utils/parser';

interface FolderImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbooks: NotepadPlaybook[];
  onImportPlaybooks: (imported: NotepadPlaybook[], replaceExisting: boolean) => void;
  onResetAllRuns: () => void;
}

export const FolderImportExportModal: React.FC<FolderImportExportModalProps> = ({
  isOpen,
  onClose,
  playbooks,
  onImportPlaybooks,
  onResetAllRuns,
}) => {
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [defaultCategory, setDefaultCategory] = useState('Imported');

  if (!isOpen) return null;

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => {
      const name = file.name.toLowerCase();
      return (
        !name.startsWith('.') &&
        (name.endsWith('.txt') ||
          name.endsWith('.md') ||
          name.endsWith('.log') ||
          name.endsWith('.checklist') ||
          file.type === 'text/plain' ||
          file.type === 'text/markdown')
      );
    });

    if (files.length === 0) {
      setImportSummary(
        'No compatible notepad files (.txt, .md, .log) found in selection.'
      );
      return;
    }

    const importedPlaybooks: NotepadPlaybook[] = [];

    for (const file of files) {
      const text = await file.text();
      const parsed = parseNotepadTextToSteps(text);
      if (parsed.steps.length === 0) continue;

      // Derive category from subfolder path if loaded via folder picker (webkitRelativePath)
      const relPath = (file as File & { webkitRelativePath?: string })
        .webkitRelativePath;
      let folderCategory = defaultCategory || 'Imported';
      if (relPath && relPath.includes('/')) {
        const parts = relPath.split('/');
        if (parts.length >= 2 && parts[parts.length - 2]) {
          folderCategory = parts[parts.length - 2]
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }

      importedPlaybooks.push({
        id: `playbook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: parsed.inferredTitle || titleFromFileName(file.name),
        fileName: file.name,
        category: parsed.inferredCategory || folderCategory,
        steps: parsed.steps,
        runCount: 0,
        updatedAt: new Date(file.lastModified || Date.now()).toISOString(),
      });
    }

    if (importedPlaybooks.length > 0) {
      onImportPlaybooks(importedPlaybooks, replaceExisting);
      setImportSummary(
        `Loaded ${importedPlaybooks.length} notepad playbook${
          importedPlaybooks.length === 1 ? '' : 's'
        } onto your Master Homepage.`
      );
    } else {
      setImportSummary('Selected files did not contain any non-empty step lines.');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleExportMasterBundle = (format: 'txt' | 'md') => {
    const sections = playbooks.map((pb) =>
      serializePlaybookToNotepadText(pb, format)
    );
    const separator =
      format === 'md'
        ? '\n\n---\n\n'
        : '\n\n========================================\n\n';
    const header =
      format === 'md'
        ? `# TaskPad Master Playbook Index (${playbooks.length} Notepads)\nExported: ${new Date().toLocaleString()}\n\n`
        : `TASKPAD MASTER PLAYBOOK INDEX (${playbooks.length} NOTEPADS)\nExported: ${new Date().toLocaleString()}\n========================================\n\n`;

    downloadTextFile(
      `taskpad_master_checklists.${format}`,
      header + sections.join(separator)
    );
  };

  const totalSteps = playbooks.reduce((acc, p) => acc + p.steps.length, 0);
  const totalCompletedSteps = playbooks.reduce(
    (acc, p) => acc + getPlaybookMetrics(p).completed,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="folder-modal-title"
              className="font-display text-lg font-semibold text-slate-900"
            >
              Notepad Folder Location & Batch Export
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Point TaskPad to a folder of `.txt` or `.md` notepads to populate the Master Homepage, or export your updated progress back to files.
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

        <div className="space-y-6 overflow-y-auto p-6">
          {/* Hidden File Inputs */}
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-expect-error webkitdirectory is standard in modern browsers for directory selection
            webkitdirectory=""
            directory=""
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={filesInputRef}
            type="file"
            multiple
            accept=".txt,.md,.log,.checklist,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Dropzone & Folder Selector */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50/70'
            }`}
          >
            <FolderOpen className="mx-auto h-8 w-8 text-slate-500" />
            <h3 className="mt-2.5 font-display text-sm font-semibold text-slate-900">
              Load Notepads from a Folder or Drop `.txt` / `.md` Files
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Select the directory where you keep your task notepads. Every file will automatically become an interactive checklist on the Master Homepage.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Select Local Notepad Folder
              </button>
              <button
                type="button"
                onClick={() => filesInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                Choose `.txt` / `.md` Files
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-slate-200/80 pt-4 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>Replace current homepage playbooks on import</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Default tag:</span>
                <input
                  type="text"
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {importSummary && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* Export & Global Run Management */}
          <div className="space-y-3 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Export Updated Progress to Notepad Files
                </h3>
                <p className="text-xs text-slate-500">
                  Download all {playbooks.length} playbooks ({totalCompletedSteps} of{' '}
                  {totalSteps} steps checked) with `[x]` and `[ ]` markers preserved.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleExportMasterBundle('txt')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export Master Bundle (.txt)
              </button>
              <button
                type="button"
                onClick={() => handleExportMasterBundle('md')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <FileText className="h-3.5 w-3.5" />
                Export Master Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllRuns();
                  setImportSummary(
                    'All playbook checkmarks have been reset for a fresh run.'
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Playbook Checkmarks
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
