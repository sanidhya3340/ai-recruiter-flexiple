🤖 AI Recruiter ToolAn intelligent candidate sourcing and evaluation engine built with Next.js 16, TypeScript, and the Google Gemini API. The tool transforms natural language hiring requests into objective filters and subjective scoring rubrics, evaluating candidates through a two-stage sourcing architecture.✨ Key FeaturesTwo-Stage Sourcing Architecture:Stage 1 (Hard Filtering): Parses free-text job requests into structured criteria (years of experience, locations, required skills, and target company types) to filter candidates locally.Stage 2 (Rubric Evaluation): Scores remaining candidates on a 0–100 scale using Gemini structured outputs and generates precise, candidate-specific reasoning based on their profile data.Interactive Refinement Loop: Allows recruiters to adjust search criteria via conversational feedback (e.g., "Focus more on candidates with early-stage startup experience"), instantly recalculating filters and scores.Resilient API Handling: Implemented exponential backoff retries and automatic fallback model switching (gemini-3.8-flash $\rightarrow$ gemini-3.5-flash-lite) to handle temporary API rate limits (429) or server load spikes (503) gracefully.🛠️ Tech StackFramework: Next.js 16 (App Router & Turbopack)Language: TypeScriptStyling: Tailwind CSSLLM SDK: @google/genai (Google Gen AI SDK)Models: gemini-3.8-flash (Primary), gemini-3.5-flash-lite (Fallback)🚀 Getting StartedPrerequisitesEnsure you have the following installed on your machine:Node.js (v18 or higher)npm or yarnInstallationClone the repository:Bashgit clone https://github.com/your-username/ai-recruiter-tool.git
cd ai-recruiter-tool
Install dependencies:Bashnpm install
Configure environment variables:Create a .env.local file in the root directory:Code snippetGEMINI_API_KEY=your_gemini_api_key_here
Run the development server:Bashnpm run dev
Open the application:Navigate to http://localhost:3000 in your browser.🏗️ System Architecture                               ┌──────────────────────────────────┐
                               │       Recruiter Search Prompt     │
                               └────────────────┬─────────────────┘
                                                │
                                                ▼
                               ┌──────────────────────────────────┐
                               │  parseQueryToCriteria (Gemini)   │
                               └────────────────┬─────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
           ┌──────────────────────────┐                    ┌──────────────────────────┐
           │   Objective Filters      │                    │     Fit Rubric           │
           │ (Experience, Location)   │                    │ (Qualitative Criteria)    │
           └────────────┬─────────────┘                    └────────────┬─────────────┘
                        │                                               │
                        ▼                                               │
           ┌──────────────────────────┐                                 │
           │ Local Candidate Dataset  │                                 │
           └────────────┬─────────────┘                                 │
                        │                                               │
                        └───────────────────────┬───────────────────────┘
                                                │
                                                ▼
                               ┌──────────────────────────────────┐
                               │    scoreCandidates (Gemini)       │
                               │  Scores (0-100) + Explanations   │
                               └────────────────┬─────────────────┘
                                                │
                                                ▼
                               ┌──────────────────────────────────┐
                               │    Refinement Loop (Chat UI)     │
                               └──────────────────────────────────┘
💡 Usage ExampleInitial Search:"Looking for a Senior React Engineer in Bangalore with 4+ years of experience and startup background."Review Candidates:Inspect candidate match scores and reasoning citing specific companies and years of experience.Refine Results:"Lower experience requirement to 3 years and prioritize candidates who know Node.js."