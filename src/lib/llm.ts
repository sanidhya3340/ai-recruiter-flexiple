import { GoogleGenAI, Type } from "@google/genai";
import { ObjectiveFilters, FitRubric, CandidateProfile, ScoredCandidate } from "@/types/recruiter";

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
}

// Fixed model identifiers matching current API specifications
const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

// Robust caller handling transient API congestion and rate limits
async function callGeminiWithRetry(params: any, retries = 5, delayMs = 2000): Promise<any> {
  const ai = getAIClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isRateOrBusy = error?.status === 503 || error?.status === 429;
      
      if (isRateOrBusy && attempt < retries) {
        // Switch to the updated lite fallback model on high traffic
        if (attempt >= 2 && params.model !== FALLBACK_MODEL) {
          console.warn(`Primary model overloaded. Switching to fallback model: ${FALLBACK_MODEL}`);
          params.model = FALLBACK_MODEL;
        }
        console.warn(`Gemini API busy (${error.status}). Retrying attempt ${attempt}/${retries} in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

// 1. Initial Prompt Parsing: Convert free-text query -> Filters & Rubric
export async function parseQueryToCriteria(userQuery: string): Promise<{
  filters: ObjectiveFilters;
  rubric: FitRubric;
}> {
  const prompt = `
    You are an expert AI Recruiter parsing a hiring request.
    Extract objective filter parameters and a subjective fit rubric based on this requirement:
    "${userQuery}"
  `;

  const response = await callGeminiWithRetry({
    model: PRIMARY_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          filters: {
            type: Type.OBJECT,
            properties: {
              min_years_experience: { type: Type.INTEGER },
              max_years_experience: { type: Type.INTEGER },
              locations: { type: Type.ARRAY, items: { type: Type.STRING } },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              company_types: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["min_years_experience", "locations", "skills", "company_types"],
          },
          rubric: {
            type: Type.OBJECT,
            properties: {
              criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["criteria"],
          },
        },
        required: ["filters", "rubric"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

// 2. Score Filtered Candidates Against Rubric
export async function scoreCandidates(
  candidates: CandidateProfile[],
  rubric: FitRubric
): Promise<ScoredCandidate[]> {
  if (candidates.length === 0) return [];

  const prompt = `
    Score these candidate profiles against the following evaluation rubric.
    
    RUBRIC CRITERIA:
    ${rubric.criteria.map((c) => `- ${c}`).join("\n")}

    CANDIDATES DATA:
    ${JSON.stringify(candidates, null, 2)}

    INSTRUCTIONS:
    - Score each candidate from 0 to 100 based on the rubric.
    - Provide a short 1-2 sentence explanation for each candidate.
    - CRITICAL: Your explanation MUST cite specific fields from their profile (e.g. current company, exact years, skills, past roles).
  `;

  const response = await callGeminiWithRetry({
    model: PRIMARY_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            score: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: ["id", "score", "explanation"],
        },
      },
    },
  });

  const scoresMap = new Map<string, { score: number; explanation: string }>();
  const parsedScores = JSON.parse(response.text || "[]");

  parsedScores.forEach((item: { id: string; score: number; explanation: string }) => {
    scoresMap.set(item.id, { score: item.score, explanation: item.explanation });
  });

  return candidates
    .map((profile) => ({
      profile,
      score: scoresMap.get(profile.id)?.score || 50,
      explanation:
        scoresMap.get(profile.id)?.explanation ||
        `Matches key criteria for ${profile.current_title} at ${profile.current_company}.`,
    }))
    .sort((a, b) => b.score - a.score);
}

// 3. Refinement: Tweak Filters & Rubric based on recruiter feedback
export async function refineSearchSession(
  currentFilters: ObjectiveFilters,
  currentRubric: FitRubric,
  feedback: string
): Promise<{
  updatedFilters: ObjectiveFilters;
  updatedRubric: FitRubric;
  changeExplanation: string;
}> {
  const prompt = `
    You are an AI Recruiter updating a search query based on recruiter feedback.

    CURRENT FILTERS:
    ${JSON.stringify(currentFilters, null, 2)}

    CURRENT RUBRIC:
    ${JSON.stringify(currentRubric, null, 2)}

    RECRUITER FEEDBACK:
    "${feedback}"

    INSTRUCTIONS:
    - Update the objective filters and subjective rubric to reflect the feedback.
    - Provide a concise explanation ("changeExplanation") detailing what changed and why.
  `;

  const response = await callGeminiWithRetry({
    model: PRIMARY_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          updatedFilters: {
            type: Type.OBJECT,
            properties: {
              min_years_experience: { type: Type.INTEGER },
              max_years_experience: { type: Type.INTEGER },
              locations: { type: Type.ARRAY, items: { type: Type.STRING } },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              company_types: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["min_years_experience", "locations", "skills", "company_types"],
          },
          updatedRubric: {
            type: Type.OBJECT,
            properties: {
              criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["criteria"],
          },
          changeExplanation: { type: Type.STRING },
        },
        required: ["updatedFilters", "updatedRubric", "changeExplanation"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}