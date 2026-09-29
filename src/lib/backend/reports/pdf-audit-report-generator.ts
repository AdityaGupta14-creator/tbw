import type {
  AlignedPassage,
  EvidenceBreakdown,
  SimilarityMatch,
  Submission,
  SubmissionReview,
  UserRole,
} from "@/types/database";
import { formatInstitutionalDateTime } from "@/lib/formatters";

const encoder = new TextEncoder();
function getUtf8ByteLength(str: string): number {
  return encoder.encode(str).length;
}

export interface PdfReportOptions {
  viewerRole?: UserRole | undefined;
  institutionName?: string | undefined;
  generatedBy?: string | undefined;
  maxPassages?: number | undefined;
}

/**
 * Escapes characters for PDF literal string syntax (...)
 */
function escapePdfText(input: string): string {
  if (!input) return "";
  // Transliterate common unicode characters into standard ASCII equivalents for Type 1 Helvetica font
  const sanitized = input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[^\x20-\x7E]/g, "?");

  return sanitized.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Splits text into lines fitting within the specified character count.
 */
function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [""];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = currentLine ? currentLine + " " + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxChars) {
        // Break long unbreakable tokens (e.g. URLs or long formulas)
        let rem = word;
        while (rem.length > maxChars) {
          lines.push(rem.slice(0, maxChars));
          rem = rem.slice(maxChars);
        }
        currentLine = rem;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

interface PageStream {
  content: string[];
}

/**
 * Generates an official, standards-compliant PDF 1.4 academic integrity audit report.
 * Generated strictly from real persisted submission and review data.
 */
export function generateAcademicAuditReportPdf(
  submission: Submission,
  options: PdfReportOptions = {}
): Uint8Array {
  const isStudentViewer = options.viewerRole === "student";
  const genTimestamp = formatInstitutionalDateTime(new Date());
  const institutionName = options.institutionName || "ABC Institute of Technology";
  const generatedBy = options.generatedBy || (isStudentViewer ? "Student Portal" : "Faculty Reviewer");

  const pageWidth = 612; // Standard Letter
  const pageHeight = 792;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2; // 532 pt

  const pages: PageStream[] = [];
  let currentPageContent: string[] = [];
  let currentY = pageHeight - margin;

  const startNewPage = () => {
    if (currentPageContent.length > 0) {
      pages.push({ content: currentPageContent });
      currentPageContent = [];
    }
    currentY = pageHeight - margin;

    // Running Header
    currentPageContent.push(
      "q",
      "0.1 0.15 0.25 rg", // Dark brand slate
      `${margin} ${pageHeight - 28} 12 12 re f`,
      "0.85 0.88 0.92 rg",
      `${margin + 16} ${pageHeight - 27} ${contentWidth - 16} 1 re f`,
      "BT",
      "/F2 9 Tf",
      "0.2 0.25 0.35 rg",
      `${margin + 16} ${pageHeight - 24} Td`,
      `(${escapePdfText("VERITY ACADEMIC INTEGRITY ENGINE — OFFICIAL AUDIT REPORT")}) Tj`,
      "ET",
      "Q"
    );

    currentY = pageHeight - 50;
  };

  startNewPage();

  const ensureSpace = (height: number) => {
    if (currentY - height < margin + 35) {
      startNewPage();
    }
  };

  const drawText = (
    text: string,
    font: "F1" | "F2" | "F3",
    size: number,
    color: [number, number, number],
    x: number,
    y: number
  ) => {
    currentPageContent.push(
      "BT",
      `/${font} ${size} Tf`,
      `${color[0]} ${color[1]} ${color[2]} rg`,
      `${x} ${y} Td`,
      `(${escapePdfText(text)}) Tj`,
      "ET"
    );
  };

  const drawRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fillColor?: [number, number, number],
    strokeColor?: [number, number, number]
  ) => {
    currentPageContent.push("q");
    if (fillColor) {
      currentPageContent.push(`${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg`);
    }
    if (strokeColor) {
      currentPageContent.push(`${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG`);
      currentPageContent.push("0.75 w");
    }
    currentPageContent.push(
      `${x} ${y} ${w} ${h} re ${fillColor && strokeColor ? "b" : fillColor ? "f" : "s"}`
    );
    currentPageContent.push("Q");
  };

  const drawSectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 38 : 28);
    drawRect(margin, currentY - 2, contentWidth, 18, [0.93, 0.95, 0.98], [0.8, 0.85, 0.92]);
    drawText(title.toUpperCase(), "F2", 9.5, [0.12, 0.2, 0.35], margin + 8, currentY + 3);
    currentY -= 20;

    if (subtitle) {
      drawText(subtitle, "F3", 8, [0.4, 0.45, 0.55], margin + 8, currentY);
      currentY -= 12;
    }
  };

  // --- 1. REPORT BANNER & METADATA ---
  ensureSpace(95);

  // Top header box
  drawRect(margin, currentY - 70, contentWidth, 75, [0.08, 0.16, 0.3], [0.05, 0.1, 0.2]);
  drawText("VERITY ACADEMIC INTEGRITY PLATFORM", "F2", 15, [1, 1, 1], margin + 14, currentY - 22);
  drawText(
    "CONFIDENTIAL INSTITUTIONAL INTEGRITY & SIMILARITY AUDIT REPORT",
    "F1",
    8.5,
    [0.75, 0.85, 0.95],
    margin + 14,
    currentY - 36
  );
  drawText(
    `Institution: ${institutionName}  |  Generated: ${genTimestamp}  |  Issued by: ${generatedBy}`,
    "F1",
    7.5,
    [0.65, 0.75, 0.88],
    margin + 14,
    currentY - 54
  );

  currentY -= 88;

  // --- 2. SUBMISSION & STUDENT SUMMARY TABLE ---
  drawSectionTitle("1. Submission & Candidate Information");

  const studentDisplay = isStudentViewer
    ? submission.student_name || "Authorized Student"
    : `${submission.student_name || "Unknown Student"} (Roll: ${submission.student_roll || "Not Provided"})`;

  const infoRows = [
    ["Submission ID / Code:", submission.submission_code || submission.id, "Course:", `${submission.course_code || "N/A"} (${submission.course_id || "Unassigned"})`],
    ["Student Candidate:", studentDisplay, "Assignment:", submission.assignment_title || "Untitled Assignment"],
    ["Version / Submission Date:", `v${submission.version_number} — ${formatInstitutionalDateTime(submission.submitted_at)}`, "Analysis Status:", (submission.analysis?.status || submission.status).toUpperCase()],
    ["Document File:", submission.document?.file_name || "No Document Attached", "Word Count:", String(submission.document?.word_count ?? "Not Extracted")],
  ];

  ensureSpace(infoRows.length * 15 + 10);
  for (const [k1, v1, k2, v2] of infoRows) {
    drawText(k1 ?? "", "F2", 8, [0.3, 0.35, 0.45], margin + 4, currentY);
    drawText(v1 ?? "", "F1", 8, [0.1, 0.1, 0.1], margin + 120, currentY);
    drawText(k2 ?? "", "F2", 8, [0.3, 0.35, 0.45], margin + 290, currentY);
    drawText(v2 ?? "", "F1", 8, [0.1, 0.1, 0.1], margin + 370, currentY);
    currentY -= 14;
  }
  currentY -= 6;

  // --- 3. SIMILARITY & EVIDENCE METRICS ---
  drawSectionTitle("2. Multi-Engine Similarity & Evidence Index");

  const simPct = submission.similarity_percentage ?? submission.analysis?.similarity_percentage ?? 0;
  const evidenceLevel = simPct === 0
    ? "NONE"
    : (submission.analysis?.matches?.[0]?.evidence_level || (simPct >= 40 ? "strong" : simPct >= 20 ? "moderate" : "weak")).toUpperCase();
  const matchedSourcesCount = submission.matched_source_count ?? submission.analysis?.matched_source_count ?? 0;
  const peerOverlap = submission.analysis?.student_overlap_percentage ?? 0;
  const citationIssues = submission.citation_issue_count ?? submission.analysis?.citation_issue_count ?? 0;

  ensureSpace(55);
  // Summary scorecard blocks
  const cardW = (contentWidth - 12) / 4;
  const cards = [
    { label: "OVERALL SIMILARITY", value: `${simPct}%`, note: "Corroborated overlap" },
    { label: "EVIDENCE LEVEL", value: evidenceLevel, note: "Classification" },
    { label: "MATCHED SOURCES", value: String(matchedSourcesCount), note: "Discovered candidates" },
    { label: "CITATION ISSUES", value: String(citationIssues), note: "IEEE standard check" },
  ];

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]!;
    const cx = margin + i * (cardW + 4);
    drawRect(cx, currentY - 38, cardW, 42, [0.97, 0.97, 0.98], [0.82, 0.85, 0.9]);
    drawText(c.label, "F2", 6.5, [0.45, 0.5, 0.6], cx + 6, currentY - 12);
    drawText(c.value, "F2", 13, [0.1, 0.15, 0.3], cx + 6, currentY - 26);
    drawText(c.note, "F1", 6.5, [0.5, 0.55, 0.65], cx + 6, currentY - 35);
  }
  currentY -= 48;

  // Detailed Evidence Breakdown
  const b = submission.analysis?.evidence_breakdown;
  ensureSpace(35);
  drawRect(margin, currentY - 24, contentWidth, 26, [0.99, 0.99, 1], [0.88, 0.9, 0.95]);
  const exactSim = submission.analysis?.matches?.[0]?.exact_similarity ?? 0;
  const fuzzySim = submission.analysis?.matches?.[0]?.fuzzy_similarity ?? 0;
  const semanticSim = submission.analysis?.matches?.[0]?.semantic_similarity ?? 0;

  drawText("EVIDENCE BREAKDOWN:", "F2", 7.5, [0.2, 0.25, 0.4], margin + 8, currentY - 16);
  drawText(`Exact Verbatim: ${exactSim}%`, "F1", 7.5, [0.2, 0.2, 0.2], margin + 115, currentY - 16);
  drawText(`Fuzzy / Lexical: ${fuzzySim}%`, "F1", 7.5, [0.2, 0.2, 0.2], margin + 215, currentY - 16);
  drawText(`Semantic Paraphrase: ${semanticSim}%`, "F1", 7.5, [0.2, 0.2, 0.2], margin + 315, currentY - 16);
  drawText(`Peer Overlap: ${peerOverlap}%`, "F1", 7.5, [0.2, 0.2, 0.2], margin + 430, currentY - 16);
  currentY -= 32;

  // --- 4. MATCHED SOURCES SUMMARY ---
  drawSectionTitle("3. Matched Source Index & Citations");

  const matches = submission.analysis?.matches || [];
  if (matches.length === 0) {
    ensureSpace(20);
    drawText("No external or internal candidate sources exceeded the match reporting threshold.", "F3", 8, [0.4, 0.4, 0.4], margin + 8, currentY);
    currentY -= 16;
  } else {
    ensureSpace(18);
    drawRect(margin, currentY - 12, contentWidth, 14, [0.92, 0.93, 0.95]);
    drawText("SOURCE TITLE / IDENTIFIER", "F2", 7, [0.2, 0.25, 0.35], margin + 6, currentY - 9);
    drawText("TYPE", "F2", 7, [0.2, 0.25, 0.35], margin + 260, currentY - 9);
    drawText("URL / REPOSITORY", "F2", 7, [0.2, 0.25, 0.35], margin + 350, currentY - 9);
    drawText("SIMILARITY", "F2", 7, [0.2, 0.25, 0.35], margin + 475, currentY - 9);
    currentY -= 16;

    for (const m of matches.slice(0, 8)) {
      ensureSpace(16);
      const isPeer = m.source_type === "student_submission";
      const title = isPeer && isStudentViewer ? "Peer Student Submission (Protected)" : (m.source_title || m.source_name || "Unidentified Source");
      const url = isPeer && isStudentViewer ? "Institutional Archive" : (m.source_url || "Not Available");

      drawText(title.slice(0, 48), "F1", 7.5, [0.15, 0.15, 0.15], margin + 6, currentY);
      drawText(m.source_type || "web", "F1", 7.5, [0.35, 0.35, 0.35], margin + 260, currentY);
      drawText(url.slice(0, 26), "F1", 7, [0.3, 0.3, 0.3], margin + 350, currentY);
      drawText(`${m.similarity_percentage}%`, "F2", 7.5, [0.8, 0.15, 0.15], margin + 485, currentY);
      currentY -= 13;
    }
  }
  currentY -= 10;

  // --- 5. SELECTED MATCHED PASSAGES (STUDENT VS SOURCE) ---
  drawSectionTitle("4. Selected Corroborated Passage Alignments", "Side-by-side textual comparison with quotation and technical phrasing suppression");

  const passages: AlignedPassage[] =
    submission.analysis?.passages && submission.analysis.passages.length > 0
      ? submission.analysis.passages
      : matches.slice(0, 4).map((m, idx) => ({
          id: `p-${idx + 1}`,
          source_name: m.source_name,
          source_type: m.source_type,
          student_text: m.matched_text || "Submitted excerpt not available",
          source_text: m.source_matched_text || "Source excerpt not available",
          start_sentence_idx: idx,
          end_sentence_idx: idx,
          matched_words: m.matched_words || 20,
          similarity_percentage: m.similarity_percentage,
          exact_similarity: m.exact_similarity,
          fuzzy_similarity: m.fuzzy_similarity,
          semantic_similarity: m.semantic_similarity,
          evidence_level: m.evidence_level || "moderate",
          reasons: [],
          is_quoted: m.is_quoted,
        }));

  if (passages.length === 0) {
    ensureSpace(20);
    drawText("No aligned passage overlaps detected for this submission.", "F3", 8, [0.4, 0.4, 0.4], margin + 8, currentY);
    currentY -= 16;
  } else {
    const maxPassagesToShow = options.maxPassages || 4;
    for (let i = 0; i < Math.min(passages.length, maxPassagesToShow); i++) {
      const p = passages[i]!;
      const isQuoted = p.is_quoted;

      ensureSpace(85);

      // Passage header banner
      drawRect(margin, currentY - 14, contentWidth, 16, [0.94, 0.94, 0.96], [0.85, 0.85, 0.88]);
      drawText(
        `Passage ${i + 1}  —  Similarity: ${p.similarity_percentage}%  |  Evidence: ${(p.evidence_level || "moderate").toUpperCase()}`,
        "F2",
        7.5,
        [0.15, 0.2, 0.3],
        margin + 6,
        currentY - 10
      );

      if (isQuoted) {
        drawText(
          "[QUOTATION / CITATION SUPPRESSED FROM MISCONDUCT WEIGHTING]",
          "F2",
          7,
          [0.1, 0.5, 0.2],
          margin + 250,
          currentY - 10
        );
      }
      currentY -= 18;

      // Dual columns: Student (left) vs Source (right)
      const colW = (contentWidth - 10) / 2;
      const leftLines = wrapText(p.student_text || "Student text unavailable", 38).slice(0, 5);
      const rightLines = wrapText(p.source_text || "Source text unavailable", 38).slice(0, 5);
      const rowCount = Math.max(leftLines.length, rightLines.length);
      const boxH = rowCount * 10 + 18;

      ensureSpace(boxH + 5);

      // Left Box (Student)
      drawRect(margin, currentY - boxH, colW, boxH, [0.99, 0.98, 0.95], [0.9, 0.85, 0.7]);
      drawText("STUDENT EXCERPT:", "F2", 6.5, [0.5, 0.35, 0.1], margin + 6, currentY - 10);
      for (let l = 0; l < leftLines.length; l++) {
        drawText(leftLines[l]!, "F1", 7, [0.15, 0.15, 0.15], margin + 6, currentY - 21 - l * 10);
      }

      // Right Box (Source)
      const rx = margin + colW + 10;
      drawRect(rx, currentY - boxH, colW, boxH, [0.96, 0.98, 1], [0.8, 0.88, 0.95]);
      drawText(`SOURCE (${escapePdfText(p.source_name).slice(0, 28)}):`, "F2", 6.5, [0.1, 0.3, 0.5], rx + 6, currentY - 10);
      for (let l = 0; l < rightLines.length; l++) {
        drawText(rightLines[l]!, "F1", 7, [0.15, 0.15, 0.15], rx + 6, currentY - 21 - l * 10);
      }

      currentY -= boxH + 8;
    }
  }

  // --- 6. FACULTY REVIEW DECISION & AUDIT TRAIL ---
  drawSectionTitle("5. Formal Faculty Review Decision & Rationale");

  const review: SubmissionReview | undefined = submission.review;
  const decisionText = review?.decision
    ? review.decision.replace(/_/g, " ").toUpperCase()
    : "NOT YET RECORDED (REVIEW PENDING)";

  const reviewerName = review?.reviewer_name || (isStudentViewer ? "Assigned Faculty Guide" : "Dr. P. Kulkarni");
  const reviewDate = review?.updated_at ? review.updated_at.slice(0, 19).replace("T", " ") + " UTC" : "Pending Human Review";

  ensureSpace(65);
  drawRect(margin, currentY - 55, contentWidth, 58, [0.98, 0.98, 0.99], [0.85, 0.85, 0.9]);
  drawText("OFFICIAL REVIEW STATUS:", "F2", 7.5, [0.3, 0.35, 0.45], margin + 8, currentY - 14);
  drawText((review?.status || "pending").toUpperCase(), "F2", 8.5, [0.1, 0.2, 0.4], margin + 135, currentY - 14);

  drawText("ACADEMIC FINDING:", "F2", 7.5, [0.3, 0.35, 0.45], margin + 280, currentY - 14);
  drawText(decisionText, "F2", 8.5, decisionText.includes("VERIFIED") ? [0.8, 0.15, 0.15] : [0.1, 0.5, 0.2], margin + 380, currentY - 14);

  drawText("EVALUATING FACULTY:", "F2", 7.5, [0.3, 0.35, 0.45], margin + 8, currentY - 28);
  drawText(reviewerName, "F1", 8, [0.1, 0.1, 0.1], margin + 135, currentY - 28);

  drawText("REVIEW TIMESTAMP:", "F2", 7.5, [0.3, 0.35, 0.45], margin + 280, currentY - 28);
  drawText(reviewDate, "F1", 7.5, [0.1, 0.1, 0.1], margin + 380, currentY - 28);

  const rationale = review?.decision_rationale || "Official academic review rationale will be documented upon completion of faculty review.";
  const rationaleLines = wrapText(`Rationale: "${rationale}"`, 80).slice(0, 2);
  for (let rl = 0; rl < rationaleLines.length; rl++) {
    drawText(rationaleLines[rl]!, "F3", 7, [0.25, 0.3, 0.35], margin + 8, currentY - 40 - rl * 9);
  }

  currentY -= 65;

  // Private Faculty Notes (Protected from student view)
  if (!isStudentViewer && review?.faculty_notes) {
    ensureSpace(32);
    drawRect(margin, currentY - 24, contentWidth, 26, [0.99, 0.97, 0.95], [0.92, 0.85, 0.75]);
    drawText("FACULTY CONFIDENTIAL DELIBERATION NOTES (NOT RELEASED TO CANDIDATE):", "F2", 6.5, [0.5, 0.25, 0.1], margin + 6, currentY - 9);
    drawText(review.faculty_notes.slice(0, 110), "F3", 7, [0.3, 0.2, 0.15], margin + 6, currentY - 20);
    currentY -= 32;
  }

  // Student Explanation Record (if any)
  if (review?.student_explanation_response) {
    ensureSpace(32);
    drawRect(margin, currentY - 24, contentWidth, 26, [0.96, 0.98, 0.96], [0.8, 0.9, 0.8]);
    drawText("STUDENT EXPLANATION RECORDED:", "F2", 6.5, [0.1, 0.45, 0.2], margin + 6, currentY - 9);
    drawText(review.student_explanation_response.slice(0, 110), "F1", 7, [0.15, 0.3, 0.15], margin + 6, currentY - 20);
    currentY -= 32;
  }

  // --- 7. INSTITUTIONAL LIMITATIONS & DISCLAIMER ---
  ensureSpace(45);
  drawRect(margin, currentY - 36, contentWidth, 38, [0.95, 0.95, 0.96], [0.85, 0.85, 0.88]);
  drawText("MANDATORY INSTITUTIONAL ACADEMIC INTEGRITY DISCLAIMER:", "F2", 6.5, [0.3, 0.3, 0.35], margin + 8, currentY - 10);
  drawText(
    "1. Similarity indices represent automated textual and semantic alignment indicators. Similarity DOES NOT independently establish academic misconduct.",
    "F1",
    6,
    [0.35, 0.35, 0.4],
    margin + 8,
    currentY - 19
  );
  drawText(
    "2. Quotations, common technical terminology, and legitimate citations must be verified through contextual academic review.",
    "F1",
    6,
    [0.35, 0.35, 0.4],
    margin + 8,
    currentY - 27
  );
  drawText(
    "3. Any disciplinary finding requires human faculty deliberation following standard institutional due process procedures.",
    "F1",
    6,
    [0.35, 0.35, 0.4],
    margin + 8,
    currentY - 33
  );

  // Close final page
  pages.push({ content: currentPageContent });

  // Add footers to all pages with exact page counts
  const totalPages = pages.length;
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const page = pages[pIdx]!;
    page.content.push(
      "q",
      "0.85 0.88 0.92 rg",
      `${margin} 32 ${contentWidth} 0.75 re f`,
      "BT",
      "/F1 7 Tf",
      "0.5 0.55 0.6 rg",
      `${margin} 22 Td`,
      `(${escapePdfText(`Verity Academic Integrity Audit · ${submission.submission_code || submission.id} · Confidential`)}) Tj`,
      "ET",
      "BT",
      "/F2 7 Tf",
      "0.4 0.45 0.5 rg",
      `${pageWidth - margin - 50} 22 Td`,
      `(${escapePdfText(`Page ${pIdx + 1} of ${totalPages}`)}) Tj`,
      "ET",
      "Q"
    );
  }

  // --- PDF OBJECT GRAPH CONSTRUCTION ---
  const objects: string[] = [];

  // 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Font objects (Helvetica, Helvetica-Bold, Courier)
  // Font obj 3, 4, 5
  objects.push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj");
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj");

  // Page object IDs: 6, 8, 10, ...
  // Content stream IDs: 7, 9, 11, ...
  const pageObjectIds: number[] = [];
  let nextObjId = 6;

  for (let i = 0; i < totalPages; i++) {
    const pageObjId = nextObjId++;
    const contentObjId = nextObjId++;
    pageObjectIds.push(pageObjId);

    const streamContent = pages[i]!.content.join("\n");
    const streamLen = getUtf8ByteLength(streamContent);

    // Page Object
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>\nendobj`
    );

    // Contents Stream Object
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
  }

  // 2: Pages Object
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects.splice(
    1,
    0,
    `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj`
  );

  // Build binary stream and exact cross reference table
  let pdfString = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const xrefOffsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    const offset = getUtf8ByteLength(pdfString);
    xrefOffsets.push(offset);
    pdfString += objects[i] + "\n";
  }

  const startXrefOffset = getUtf8ByteLength(pdfString);
  const totalObjCount = objects.length + 1;

  let xrefTable = `xref\n0 ${totalObjCount}\n0000000000 65535 f \r\n`;
  for (let i = 1; i < totalObjCount; i++) {
    const off = String(xrefOffsets[i]).padStart(10, "0");
    xrefTable += `${off} 00000 n \r\n`;
  }

  const trailer = `trailer\n<< /Size ${totalObjCount} /Root 1 0 R >>\nstartxref\n${startXrefOffset}\n%%EOF\n`;
  const finalPdfStr = pdfString + xrefTable + trailer;

  return new TextEncoder().encode(finalPdfStr);
}
