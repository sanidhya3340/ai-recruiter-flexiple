import { CandidateProfile, ObjectiveFilters } from "@/types/recruiter";
import profilesData from "@/data/profiles.json";

export function filterProfiles(filters: ObjectiveFilters): CandidateProfile[] {
  const profiles = profilesData as CandidateProfile[];

  const runFilter = (strictLocation: boolean, strictSkills: boolean) => {
    return profiles.filter((p) => {
      // 1. Min Experience
      if (filters.min_years_experience && p.years_experience < filters.min_years_experience) {
        return false;
      }

      // 2. Max Experience
      if (filters.max_years_experience && p.years_experience > filters.max_years_experience) {
        return false;
      }

      // 3. Location (case-insensitive)
      if (strictLocation && filters.locations && filters.locations.length > 0) {
        const matchesLoc = filters.locations.some((loc) =>
          p.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (!matchesLoc) return false;
      }

      // 4. Company Types
      if (filters.company_types && filters.company_types.length > 0) {
        const matchingCompanyType =
          filters.company_types.includes(p.current_company_type) ||
          p.past_companies.some((past) => filters.company_types.includes(past.company_type));
        if (!matchingCompanyType) return false;
      }

      // 5. Skills (matching at least one specified skill if strict)
      if (strictSkills && filters.skills && filters.skills.length > 0) {
        const hasSkill = filters.skills.some((s) =>
          p.skills.some((ps) => ps.toLowerCase().includes(s.toLowerCase()))
        );
        if (!hasSkill) return false;
      }

      return true;
    });
  };

  // Attempt strict match
  let results = runFilter(true, true);

  // Fallback 1: Relax location if results are too sparse
  if (results.length < 4) {
    results = runFilter(false, true);
  }

  // Fallback 2: Relax skills if still too sparse
  if (results.length < 4) {
    results = runFilter(false, false);
  }

  return results;
}