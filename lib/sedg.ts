// Framework mapping (QA item 15, decision confirmed: Bursa-aligned SEDG).
// Codes and disclosure texts verified against the official document:
// "Simplified ESG Disclosure Guide (SEDG) for SMEs in Supply Chains",
// Version 2, Capital Markets Malaysia (affiliate of the Securities
// Commission Malaysia), 2025 — sedg.capitalmarketsmalaysia.com.

export const SEDG_FRAMEWORK = {
  name: "Simplified ESG Disclosure Guide (SEDG) for SMEs in Supply Chains",
  version: "Version 2 · Capital Markets Malaysia, 2025",
};

export interface SedgDisclosure {
  code: string;
  tier: "Basic" | "Intermediate" | "Advanced";
  disclosure: string;
}

export const SEDG_BY_INDICATOR: Record<string, SedgDisclosure> = {
  E1_ELECTRICITY: {
    code: "SEDG-E2.1",
    tier: "Basic",
    disclosure: "Report the consumption of electricity (and other energy sources) in joules or watt-hours",
  },
  S1_HEADCOUNT: {
    code: "SEDG-S2.2",
    tier: "Intermediate",
    disclosure: "Report the total number of employees and the turnover rate",
  },
  S2_TRAINING: {
    code: "SEDG-S2.1",
    tier: "Basic",
    disclosure: "Report the average hours of training per employee",
  },
  S3_WAGE_COMPLIANCE: {
    code: "SEDG-S2.3",
    tier: "Basic",
    disclosure: "Report the percentage of employees meeting or above applicable minimum wage laws",
  },
  G1_ABC_POLICY: {
    code: "SEDG-G2.1",
    tier: "Basic",
    disclosure: "List the company's policies, including an Anti-Corruption Policy",
  },
};

// SEDG disclosures the current uploads cannot evidence yet — surfaced so the
// report is honest about coverage, not silent.
export const SEDG_UNEVIDENCED: (SedgDisclosure & { blocked_by: string })[] = [
  {
    code: "SEDG-S4.1",
    tier: "Basic",
    disclosure: "Report the number of fatalities and injuries in the company, if any",
    blocked_by: "no safety incident log uploaded (finding S-ABSENT)",
  },
  {
    code: "SEDG-S2.2",
    tier: "Intermediate",
    disclosure: "…and the turnover rate",
    blocked_by: "no leavers report uploaded (finding S-ABSENT)",
  },
];
