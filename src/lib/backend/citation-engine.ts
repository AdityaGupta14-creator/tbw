export interface CitationIssue {
  id: string;
  type: "uncited_reference" | "missing_citation" | "formatting" | "numbering_gap";
  severity: "potential_issue" | "detected" | "unable_to_verify";
  text: string;
  target?: string;
  referenceNumber?: number;
  referenceText?: string;
  reason?: string;
  isIeeeViolation?: boolean;
}

export interface CitationAnalysisResult {
  style: "IEEE" | "APA" | "ACM";
  totalReferencesCount: number;
  inTextCitationsCount: number;
  uniqueInTextCited: number[];
  bibliographyNumbers: number[];
  issues: CitationIssue[];
}

/**
 * IEEE Citation Analysis Engine
 * Extracts in-text bracket citations [1], [2], [8], parses reference entries,
 * and identifies uncited bibliography records or claims lacking citations.
 * Operates purely on observable document text without synthetic mock fallbacks.
 * Every issue is traceable directly to the underlying document text and paragraph.
 */
export function analyzeIeeeCitations(documentText: string): CitationAnalysisResult {
  const text = (documentText || "").trim();
  if (!text) {
    return {
      style: "IEEE",
      totalReferencesCount: 0,
      inTextCitationsCount: 0,
      uniqueInTextCited: [],
      bibliographyNumbers: [],
      issues: [],
    };
  }

  // Document paragraphs for reliable target positioning
  const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // 1. Locate References / Bibliography section
  const refSectionRegex = /(?:^|[\r\n]+)\s*(?:references|bibliography|works cited)\s*[\r\n]+([\s\S]*)$/i;
  const refSectionMatch = refSectionRegex.exec(text);
  const bodyText = refSectionMatch ? text.slice(0, refSectionMatch.index).trim() : text;
  const refSectionText = refSectionMatch ? refSectionMatch[1]!.trim() : "";

  // 2. Find all in-text bracket citations in the document body: e.g. [1], [2], [14]
  const inTextRegex = /\[(\d+)\]/g;
  const inTextMatches: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = inTextRegex.exec(bodyText)) !== null) {
    const num = parseInt(match[1]!, 10);
    if (!isNaN(num)) {
      inTextMatches.push(num);
    }
  }

  const uniqueInTextCited = Array.from(new Set(inTextMatches)).sort((a, b) => a - b);

  // 3. Extract numbered entries in references section: [1] ... [2] ... or 1. ... 2. ...
  const bibEntryRegex = /(?:\[(\d+)\]|^(\d+)[.)]|\((\d+)\))\s*([^\r\n]+)/gm;
  const bibNumbers: number[] = [];
  const bibEntries = new Map<number, string>();

  while ((match = bibEntryRegex.exec(refSectionText)) !== null) {
    const rawNum = match[1] || match[2] || match[3];
    if (rawNum) {
      const num = parseInt(rawNum, 10);
      if (!isNaN(num)) {
        bibNumbers.push(num);
        bibEntries.set(num, match[0].trim());
      }
    }
  }

  const uniqueBib = Array.from(new Set(bibNumbers)).sort((a, b) => a - b);
  const rawRefLines = refSectionText
    ? refSectionText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 3)
    : [];

  const issues: CitationIssue[] = [];

  const findParagraphForText = (snippet: string, fallbackPara = "p-1"): string => {
    if (!snippet) return fallbackPara;
    const idx = rawParagraphs.findIndex((p) => p.includes(snippet));
    if (idx !== -1) return `p-${idx + 1}`;
    return fallbackPara;
  };

  const defaultRefPara = (() => {
    const rIdx = rawParagraphs.findIndex((p) => /(?:references|bibliography|works cited)/i.test(p));
    return rIdx !== -1 ? `p-${rIdx + 1}` : `p-${Math.max(1, rawParagraphs.length)}`;
  })();

  if (refSectionMatch) {
    // A References section exists
    if (uniqueBib.length > 0) {
      // 4a. Check for uncited references (in bibliography but not cited in text)
      for (const bibNum of uniqueBib) {
        if (!uniqueInTextCited.includes(bibNum)) {
          const entryLine = bibEntries.get(bibNum) || `[${bibNum}]`;
          const targetPara = findParagraphForText(`[${bibNum}]`, defaultRefPara);

          issues.push({
            id: `ci-uncited-${bibNum}`,
            type: "uncited_reference",
            severity: "potential_issue",
            text: `Reference [${bibNum}] appears in bibliography but is not cited in the text.`,
            target: targetPara,
            referenceNumber: bibNum,
            referenceText: entryLine,
            reason: `Reference [${bibNum}] is listed in the bibliography but is never cited in the body of the paper. Under IEEE citation guidelines, every numbered reference must be cited sequentially in-text.`,
            isIeeeViolation: true,
          });
        }
      }

      // 4b. Check for citations in text that lack bibliography entries
      for (const citedNum of uniqueInTextCited) {
        if (!uniqueBib.includes(citedNum)) {
          const targetPara = findParagraphForText(`[${citedNum}]`, "p-1");
          issues.push({
            id: `ci-missing-bib-${citedNum}`,
            type: "formatting",
            severity: "potential_issue",
            text: `In-text citation [${citedNum}] does not match any entry in the bibliography.`,
            target: targetPara,
            referenceNumber: citedNum,
            referenceText: `[${citedNum}]`,
            reason: `In-text citation [${citedNum}] is cited in the prose body, but no corresponding reference entry [${citedNum}] exists in the bibliography.`,
            isIeeeViolation: true,
          });
        }
      }
    } else if (rawRefLines.length > 0) {
      // References section exists with unnumbered or non-IEEE formatted entries
      issues.push({
        id: "ci-format-unnumbered",
        type: "formatting",
        severity: "potential_issue",
        text: `Bibliography contains ${rawRefLines.length} reference entry(s), but entries do not follow IEEE bracket numbering standard (e.g., [1] Author, Title).`,
        target: defaultRefPara,
        referenceText: rawRefLines[0] || "",
        reason: "IEEE citation style mandates bracketed numerical identifiers [1], [2] at the start of each bibliography entry.",
        isIeeeViolation: true,
      });

      if (uniqueInTextCited.length === 0) {
        issues.push({
          id: "ci-no-intext-citations",
          type: "missing_citation",
          severity: "potential_issue",
          text: "Document lists bibliography references, but no corresponding in-text bracket citations [X] were detected in the text body.",
          target: "p-1",
          reason: "Document contains a references section but has zero in-text citations in the body text.",
          isIeeeViolation: true,
        });
      }
    }
  } else {
    // No references section found
    if (uniqueInTextCited.length > 0) {
      issues.push({
        id: "ci-missing-references-section",
        type: "missing_citation",
        severity: "detected",
        text: `Document contains in-text citations [${uniqueInTextCited.join(", ")}], but lacks a dedicated References / Bibliography section.`,
        target: "p-1",
        reason: "Document includes numeric in-text bracket citations, but has no References or Bibliography section.",
        isIeeeViolation: true,
      });
    }
  }

  const totalReferencesCount = uniqueBib.length > 0 ? uniqueBib.length : rawRefLines.length;

  return {
    style: "IEEE",
    totalReferencesCount,
    inTextCitationsCount: inTextMatches.length,
    uniqueInTextCited,
    bibliographyNumbers: uniqueBib,
    issues,
  };
}
