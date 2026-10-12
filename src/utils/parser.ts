import { NotepadPlaybook, PlaybookStatus, PlaybookStep } from '../types';

const CLI_PREFIX_REGEX =
  /^(?:\$\s+|>\s+)?((?:git|npm|npx|pnpm|yarn|docker|docker-compose|kubectl|helm|ssh|scp|rsync|curl|wget|python|python3|pip|node|tsx|psql|mysql|redis-cli|sudo|systemctl|journalctl|service|apt|apt-get|brew|cd|cp|mv|rm|mkdir|chmod|chown|tar|zip|unzip|aws|gcloud|az|terraform|ansible|make|cargo|go)\s+.+)$/i;

/**
 * Extracts copyable command or code snippets from a step line.
 */
export function extractSnippetsFromLine(line: string): {
  cleanText: string;
  snippets: string[];
} {
  const snippets: string[] = [];

  // 1. Extract backtick-wrapped snippets: `command here`
  const backtickMatches = Array.from(line.matchAll(/`([^`]+)`/g));
  for (const match of backtickMatches) {
    const candidate = match[1].trim();
    if (candidate.length > 1 && !snippets.includes(candidate)) {
      snippets.push(candidate);
    }
  }

  // 2. Check if line has "Run: <cmd>" or "Command: <cmd>"
  const labeledCmdMatch = line.match(/(?:run|command|execute|cmd)\s*:\s*(.+)$/i);
  if (labeledCmdMatch && snippets.length === 0) {
    const candidate = labeledCmdMatch[1].trim().replace(/^["'`]|["'`]$/g, '');
    if (candidate.length > 2) {
      snippets.push(candidate);
    }
  }

  // 3. Check if the entire step text is a shell command
  const trimmed = line.trim();
  const cliMatch = trimmed.match(CLI_PREFIX_REGEX);
  if (cliMatch && snippets.length === 0) {
    const cmd = cliMatch[1].trim();
    if (!snippets.includes(cmd)) {
      snippets.push(cmd);
    }
  }

  // Keep clean readable text (strip backticks for clean display while keeping the text natural)
  const cleanText = line.replace(/`([^`]+)`/g, '$1').trim();

  return { cleanText, snippets };
}

/**
 * Parses raw notepad text (.txt or .md) into structured PlaybookSteps.
 * Preserves existing [x] / [✓] completion states and extracts inline commands.
 */
export function parseNotepadTextToSteps(
  rawText: string,
  existingSteps: PlaybookStep[] = []
): {
  inferredTitle?: string;
  inferredCategory?: string;
  steps: PlaybookStep[];
} {
  const lines = rawText.split(/\r?\n/);
  const steps: PlaybookStep[] = [];
  let currentSection: string | undefined = undefined;
  let inferredTitle: string | undefined = undefined;
  let inferredCategory: string | undefined = undefined;

  // Map existing steps by normalized text to preserve completion states when editing raw notepad text
  const existingStateMap = new Map<string, { completed: boolean; id: string; note?: string }>();
  for (const s of existingSteps) {
    existingStateMap.set(s.text.trim().toLowerCase(), {
      completed: s.completed,
      id: s.id,
      note: s.note,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Skip horizontal rules
    if (/^[-=_*]{3,}$/.test(trimmed)) continue;

    // Metadata tag line e.g. "Category: Deployment" or "Tag: Database"
    const categoryMatch = trimmed.match(/^(?:category|tag|folder|group)\s*:\s*(.+)$/i);
    if (categoryMatch && steps.length === 0) {
      inferredCategory = categoryMatch[1].trim();
      continue;
    }

    // Top-level Markdown Heading (# Title) on first non-empty line -> inferredTitle
    if (/^#\s+(.+)$/.test(trimmed) && !inferredTitle && steps.length === 0) {
      inferredTitle = trimmed.replace(/^#\s+/, '').trim();
      continue;
    }

    // Sub-headings (## Section or === Section === or "SECTION NAME:")
    if (/^#{2,4}\s+(.+)$/.test(trimmed)) {
      currentSection = trimmed.replace(/^#{2,4}\s+/, '').replace(/:$/, '').trim();
      continue;
    }

    // Indented command or note line belonging to the previous step
    if (
      steps.length > 0 &&
      (/^\s{2,}(?:\$\s+|>\s+)/.test(rawLine) ||
        (/^\s{4,}\S+/.test(rawLine) && !/^\s*(?:[-*•]|\d+[.)])/.test(rawLine)))
    ) {
      const prevStep = steps[steps.length - 1];
      const subTrimmed = trimmed.replace(/^(?:\$\s+|>\s+)/, '').trim();
      if (
        CLI_PREFIX_REGEX.test(trimmed) ||
        rawLine.trim().startsWith('$') ||
        rawLine.trim().startsWith('>')
      ) {
        if (!prevStep.snippets.includes(subTrimmed)) {
          prevStep.snippets.push(subTrimmed);
        }
      } else {
        prevStep.note = prevStep.note ? `${prevStep.note} · ${subTrimmed}` : subTrimmed;
      }
      continue;
    }

    // Short header line ending with colon (e.g. "Pre-Flight Checks:") that isn't a command
    if (
      trimmed.endsWith(':') &&
      trimmed.length < 48 &&
      !/^(?:[-*•]|\d+[.)]|\[[ xX✓✔]\])/.test(trimmed) &&
      !/^(?:run|command|execute|cmd|note|http|https):/i.test(trimmed)
    ) {
      currentSection = trimmed.slice(0, -1).trim();
      continue;
    }

    // Parse checkbox and list markers:
    // Matches: "- [x] 1. Do thing", "[x] Do thing", "1. [x] Do thing", "1) Do thing", "- Do thing", "* Do thing"
    let working = trimmed;
    let explicitlyChecked: boolean | undefined = undefined;

    // Leading bullet
    working = working.replace(/^[-*•+]\s+/, '');

    // Leading checkbox [x] or [ ]
    const checkboxBeforeNumber = working.match(/^\[([ xX✓✔-])\]\s*(.*)$/);
    if (checkboxBeforeNumber) {
      const marker = checkboxBeforeNumber[1].toLowerCase();
      explicitlyChecked = marker === 'x' || marker === '✓' || marker === '✔';
      working = checkboxBeforeNumber[2].trim();
    }

    // Leading step number: "01.", "1.", "1)", "(1)", "Step 1:", "Step 1 -"
    working = working.replace(/^(?:step\s+\d+\s*[:.-]\s*|\(\d+\)\s*|\d+[.)]\s+)/i, '');

    // Checkbox after number: "1. [x] Do thing"
    const checkboxAfterNumber = working.match(/^\[([ xX✓✔-])\]\s*(.*)$/);
    if (checkboxAfterNumber) {
      const marker = checkboxAfterNumber[1].toLowerCase();
      explicitlyChecked = marker === 'x' || marker === '✓' || marker === '✔';
      working = checkboxAfterNumber[2].trim();
    }

    if (!working) continue;

    const { cleanText, snippets } = extractSnippetsFromLine(working);
    const normalizedKey = cleanText.toLowerCase();
    const prevSaved = existingStateMap.get(normalizedKey);

    const stepIndex = steps.length + 1;
    steps.push({
      id: prevSaved?.id || `step-${Date.now()}-${stepIndex}-${Math.random().toString(36).slice(2, 7)}`,
      index: stepIndex,
      text: cleanText,
      completed:
        explicitlyChecked !== undefined
          ? explicitlyChecked
          : prevSaved
          ? prevSaved.completed
          : false,
      snippets,
      section: currentSection,
      note: prevSaved?.note,
    });
  }

  return {
    inferredTitle,
    inferredCategory,
    steps,
  };
}

/**
 * Serializes a NotepadPlaybook back into clean, human-readable notepad text (.txt / .md)
 * with current [x] and [ ] checkmarks preserved.
 */
export function serializePlaybookToNotepadText(
  playbook: NotepadPlaybook,
  format: 'txt' | 'md' = 'txt'
): string {
  const lines: string[] = [];

  if (format === 'md') {
    lines.push(`# ${playbook.title}`);
    lines.push(`Category: ${playbook.category}`);
    lines.push('');
  } else {
    lines.push(`${playbook.title}`);
    lines.push(`Category: ${playbook.category}`);
    lines.push('----------------------------------------');
    lines.push('');
  }

  let lastSection: string | undefined = undefined;

  for (let i = 0; i < playbook.steps.length; i++) {
    const step = playbook.steps[i];
    if (step.section && step.section !== lastSection) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('');
      }
      lines.push(format === 'md' ? `## ${step.section}` : `${step.section}:`);
      lastSection = step.section;
    }

    const checkMarker = step.completed ? '[x]' : '[ ]';
    const numPrefix = `${i + 1}.`;

    // Re-wrap snippets in backticks if they appear in the step text, or append them
    let formattedText = step.text;
    for (const snippet of step.snippets) {
      if (formattedText.includes(snippet) && !formattedText.includes(`\`${snippet}\``)) {
        formattedText = formattedText.replace(snippet, `\`${snippet}\``);
      } else if (!formattedText.includes(snippet)) {
        formattedText = `${formattedText} (\`${snippet}\`)`;
      }
    }

    if (format === 'md') {
      lines.push(`- ${checkMarker} ${numPrefix} ${formattedText}`);
    } else {
      lines.push(`${checkMarker} ${numPrefix} ${formattedText}`);
    }

    if (step.note) {
      lines.push(`    ${step.note}`);
    }
  }

  return lines.join('\n');
}

/**
 * Computes playbook status and completion metrics.
 */
export function getPlaybookMetrics(playbook: NotepadPlaybook): {
  total: number;
  completed: number;
  percentage: number;
  status: PlaybookStatus;
} {
  const total = playbook.steps.length;
  const completed = playbook.steps.filter((s) => s.completed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  let status: PlaybookStatus = 'not_started';
  if (total > 0 && completed === total) {
    status = 'completed';
  } else if (completed > 0) {
    status = 'in_progress';
  }

  return { total, completed, percentage, status };
}

/**
 * Formats a clean title from a raw filename (e.g. "01_prod_release_checklist.txt" -> "Prod Release Checklist")
 */
export function titleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.(txt|md|log|note|checklist)$/i, '');
  const cleaned = withoutExt
    .replace(/^[\d_-]+\s*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!cleaned) return withoutExt || 'Untitled Notepad';

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Triggers a browser file download of a text/markdown notepad.
 */
export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
