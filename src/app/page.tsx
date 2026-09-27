"use client";

import { useState } from "react";
import { ObjectiveFilters, FitRubric, ScoredCandidate } from "@/types/recruiter";
import { 
  Search, 
  Sparkles, 
  Send, 
  Lock, 
  RotateCcw, 
  CheckCircle2, 
  Building2, 
  Briefcase, 
  MapPin, 
  GraduationCap, 
  User, 
  AlertCircle 
} from "lucide-react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function RecruiterDashboard() {
  // State Management
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ObjectiveFilters | null>(null);
  const [rubric, setRubric] = useState<FitRubric | null>(null);
  const [candidates, setCandidates] = useState<ScoredCandidate[]>([]);
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // 1. Initial Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      setFilters(data.filters);
      setRubric(data.rubric);
      setCandidates(data.candidates);
      setChatHistory([
        {
          sender: "ai",
          text: `I parsed your query into objective filters and a subjective fit rubric. Showing the top ${data.candidates.length} matching candidates below. Let me know what you think!`,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Refinement Loop
  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isRefining || !filters || !rubric) return;

    const userFeedback = chatInput;
    setChatInput("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userFeedback }]);
    setIsRefining(true);
    setError(null);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          rubric,
          feedback: userFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refinement failed");

      setFilters(data.filters);
      setRubric(data.rubric);
      setCandidates(data.candidates);
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.changeExplanation || "Updated search parameters based on your feedback.",
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to refine search");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Flexiple AI Recruiter</h1>
            <p className="text-xs text-slate-500 mt-1">Sourcing Refinement Engine</p>
          </div>
        </div>

        {filters && (
          <div className="flex items-center gap-3">
            {!isFrozen ? (
              <button
                onClick={() => setIsFrozen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <Lock className="w-4 h-4" /> Freeze Search
              </button>
            ) : (
              <span className="flex items-center gap-2 bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Search Frozen
              </span>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs underline font-semibold">Dismiss</button>
          </div>
        )}

        {/* Initial Search Form */}
        {!filters && (
          <div className="max-w-2xl w-full mx-auto my-auto text-center space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">What candidate are you looking for?</h2>
              <p className="text-slate-500 mt-2 text-sm">Describe requirements in plain English, including skills, experience, and background.</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. RDS developers with 4-7 years experience who have worked at startups, for Bangalore"
                className="flex-1 px-4 py-3 text-sm outline-none bg-transparent"
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2 text-sm transition"
              >
                {isSearching ? <Sparkles className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isSearching ? "Thinking..." : "Search"}
              </button>
            </form>
          </div>
        )}

        {/* Dashboard Workspace */}
        {filters && rubric && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Column: Objective Filters & Subjective Rubric */}
            <div className="lg:col-span-4 space-y-6">
              {/* Objective Filters Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" /> Objective Filters
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Years of Experience</span>
                    <p className="font-medium text-slate-800">
                      {filters.min_years_experience}
                      {filters.max_years_experience ? ` - ${filters.max_years_experience}` : "+"} Years
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Locations</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {filters.locations.length > 0 ? (
                        filters.locations.map((loc, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium">
                            {loc}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">Any Location</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Required Skills</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {filters.skills.map((skill, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-md font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Company Background</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {filters.company_types.map((ct, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-md font-medium capitalize">
                          {ct}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subjective Rubric Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Fit Rubric
                </h3>
                <ul className="space-y-2 text-sm">
                  {rubric.criteria.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700 text-xs leading-relaxed">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Middle Column: Candidate Cards */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-lg">Top Matches ({candidates.length})</h2>
                {isRefining && <span className="text-xs text-indigo-600 font-medium animate-pulse">Re-scoring profiles...</span>}
              </div>

              {candidates.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500">
                  No candidates matched all criteria. Try refining your request in the chat below.
                </div>
              ) : (
                candidates.map((c) => (
                  <div key={c.profile.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{c.profile.name}</h4>
                        <p className="text-xs text-slate-500">{c.profile.current_title} at <span className="font-medium text-slate-700">{c.profile.current_company}</span> ({c.profile.current_company_type})</p>
                      </div>
                      <div className="bg-indigo-50 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-full border border-indigo-100">
                        Score: {c.score}/100
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> {c.profile.years_experience} YOE</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.profile.location}</span>
                      <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5 text-slate-400" /> {c.profile.education}</span>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {c.profile.summary}
                    </p>

                    {/* Evidence-backed Explanation */}
                    <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900 space-y-1">
                      <span className="font-semibold text-indigo-700 block">Why this candidate matched:</span>
                      <p className="leading-relaxed">{c.explanation}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Refinement Chat Box */}
              {!isFrozen && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mt-auto space-y-3">
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-3 rounded-xl ${
                          msg.sender === "user"
                            ? "bg-indigo-600 text-white ml-auto max-w-md"
                            : "bg-slate-100 text-slate-800 max-w-lg"
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleRefine} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder='e.g. "Candidate 1 is too junior, find candidates with scaleup experience"'
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500"
                      disabled={isRefining}
                    />
                    <button
                      type="submit"
                      disabled={isRefining || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition"
                    >
                      {isRefining ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Refine
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}