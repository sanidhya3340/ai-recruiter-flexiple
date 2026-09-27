import { NextResponse } from "next/server";
import { refineSearchSession, scoreCandidates } from "@/lib/llm";
import { filterProfiles } from "@/lib/filter";

export async function POST(req: Request) {
  try {
    const { filters, rubric, feedback } = await req.json();

    if (!feedback) {
      return NextResponse.json({ error: "Feedback is required" }, { status: 400 });
    }

    // 1. Refine criteria using LLM
    const { updatedFilters, updatedRubric, changeExplanation } = await refineSearchSession(
      filters,
      rubric,
      feedback
    );

    // 2. Re-filter locally
    const filteredProfiles = filterProfiles(updatedFilters);

    // 3. Re-score candidates
    const rankedCandidates = await scoreCandidates(filteredProfiles, updatedRubric);

    return NextResponse.json({
      filters: updatedFilters,
      rubric: updatedRubric,
      candidates: rankedCandidates.slice(0, 5),
      changeExplanation,
    });
  } catch (error) {
    console.error("Refine API Error:", error);
    return NextResponse.json(
      { error: "Failed to process refinement." },
      { status: 500 }
    );
  }
}