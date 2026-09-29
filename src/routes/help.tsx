import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileCheck, HelpCircle, Info, ShieldAlert, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Academic Integrity Handbook — Verity" },
      {
        name: "description",
        content: "Institutional policies, guidance on interpreting similarity scores, and citation standards for engineering faculty.",
      },
      { property: "og:title", content: "Handbook & Help — Verity" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <AppShell>
      <PageHeader
        title="Faculty Academic Integrity Handbook"
        subtitle="Operational guidance, interpretation rules, and institutional adjudication procedures."
      />

      <div className="mt-6 max-w-4xl space-y-6">
        {/* Core Principles Alert */}
        <div className="rounded-md border border-brand/30 bg-brand-soft p-4 text-xs text-brand leading-relaxed">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" />
            <div>
              <strong className="font-semibold text-foreground">Evidence-First Analytical Principle:</strong>
              <p className="mt-0.5 text-foreground/80">
                Verity produces similarity measurements, source alignments, and citation verification metrics. The software does not independently conclude academic misconduct. Faculty guides must examine the context, discipline-specific boilerplate, and citation attribution before making an academic determination.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Topics Accordion */}
        <div className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h2 className="text-base font-semibold text-foreground mb-4">Integrity Interpretation Handbook</h2>

          <Accordion type="single" collapsible defaultValue="item-1" className="space-y-2 text-sm">
            <AccordionItem value="item-1" className="border-b border-border pb-2">
              <AccordionTrigger className="text-left font-medium text-foreground py-2 hover:no-underline">
                1. Interpreting Similarity Scores: Similarity ≠ Misconduct
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-1">
                <p>
                  A high similarity percentage does not automatically indicate plagiarism. In engineering courses, valid overlap frequently occurs in:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Standard laboratory apparatus descriptions and setup procedures.</li>
                  <li>Mathematical equations, standard governing theorems, and hardware pinout tables.</li>
                  <li>Properly cited verbatim quotations and standard bibliographical references.</li>
                </ul>
                <p>
                  Faculty reviewers should use the &quot;Inspect Match&quot; tool to examine whether matching text is attributed with standard IEEE citations.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-b border-border pb-2">
              <AccordionTrigger className="text-left font-medium text-foreground py-2 hover:no-underline">
                2. Student-to-Student Cohort Comparison Protocol
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-1">
                <p>
                  When the cohort cross-matching engine flags two student submissions (e.g., &gt;15% direct textual match):
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Open the <Link to="/compare" className="text-brand underline font-medium">Document Comparison</Link> workspace.</li>
                  <li>Determine whether the overlap is confined to course-provided lab starter templates.</li>
                  <li>Check timestamp records: determine whether one submission represents an earlier draft authored in collaborative group work.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-b border-border pb-2">
              <AccordionTrigger className="text-left font-medium text-foreground py-2 hover:no-underline">
                3. IEEE Citation Standards & Bibliography Verification
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-1">
                <p>
                  Engineering technical reports at ABCIT require standard IEEE numeric citation style [1]. The citation analysis tab flags two critical discrepancies:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Uncited Bibliography Item:</strong> Reference listed at the end but nowhere cited in the running technical text.</li>
                  <li><strong>Missing In-Text Attribution:</strong> Technical claim or experimental parameter that references external data without numeric brackets.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-b border-border pb-2">
              <AccordionTrigger className="text-left font-medium text-foreground py-2 hover:no-underline">
                4. Understanding Writing-Pattern Analytical Indicators
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-1">
                <p>
                  Writing-pattern analysis evaluates syntactic uniformity, vocabulary breadth, and sentence length cadence. It provides exploratory indicators for faculty review and must never be treated as automated proof. Non-native English engineering students frequently write in structured, uniform patterns that may trigger statistical indicators without any academic infringement.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left font-medium text-foreground py-2 hover:no-underline">
                5. Formal Department Disciplinary Adjudication Workflow
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-1">
                <p>
                  If serious, uncredited textual appropriation is confirmed after manual faculty review:
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Export the Official Academic Integrity Report PDF from the submission workspace.</li>
                  <li>Schedule an initial academic conference with the student to present the evidence.</li>
                  <li>If unresolved, submit the report to the Department Academic Integrity Committee.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </AppShell>
  );
}
