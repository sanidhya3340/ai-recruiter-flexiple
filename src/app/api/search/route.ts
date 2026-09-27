import { NextResponse } from "next/server";
import { parseQueryToCriteria, scoreCandidates } from "@/lib/llm";
import { filterProfiles } from "@/lib/filter";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Parse free text to criteria
    const { filters, rubric } = await parseQueryToCriteria(query);

    // 2. Hard filter profiles locally
    const filteredProfiles = filterProfiles(filters);

    // 3. Score candidates with LLM
    const rankedCandidates = await scoreCandidates(filteredProfiles, rubric);

    return NextResponse.json({
      filters,
      rubric,
      candidates: rankedCandidates.slice(0, 5), // Top 4-5 candidates
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to process search. Check API keys and logs." },
      { status: 500 }
    );
  }
}