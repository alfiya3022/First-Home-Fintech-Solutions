import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const dashboard = readSource("../src/pages/Dashboard.tsx");
const leads = readSource("../src/pages/Leads.tsx");
const leadDetails = readSource("../src/pages/LeadDetails.tsx");
const cases = readSource("../src/pages/Cases.tsx");
const caseDetails = readSource("../src/pages/CaseDetails.tsx");
const api = readSource("../src/services/api.ts");
const caseApi = readSource("../../backend/app/api/admin_cases.py");

test("dashboard distinguishes lead loading, empty, failure, and loaded data", () => {
  assert.match(dashboard, /Promise\.all\(/);
  assert.match(dashboard, /leadsError/);
  assert.match(dashboard, /Unavailable/);
  assert.match(dashboard, /Loading enquiries\.\.\./);
  assert.match(dashboard, /Enquiries could not be loaded\./);
  assert.match(dashboard, /No enquiries have been received yet\./);
  assert.match(dashboard, /href=\{`\/dashboard\/leads\/\$\{lead\.id\}`\}/);
  assert.match(dashboard, /getCaseSummary\(\)/);
  assert.match(dashboard, /user\.is_admin && \(/);
});

test("lead list and details display and search by stable lead identifiers", () => {
  assert.match(leads, /String\(lead\.id\)\.includes\(normalizedSearch\)/);
  assert.match(leads, /Lead ID/);
  assert.match(
    leads,
    /href=\{`\/dashboard\/leads\/\$\{lead\.id\}`\}[\s\S]*?\{lead\.id\}/,
  );
  assert.match(leads, /href=\{`\/dashboard\/leads\/\$\{lead\.id\}`\}/);
  assert.match(
    leadDetails,
    /<p className="mt-1 text-sm text-muted-foreground">\s*\{lead\.id\}/,
  );
  assert.match(leads, /onDoubleClick=\{\(event\) =>/);
  assert.match(
    leads,
    /target\.closest\([\s\S]*?"a, button, input, select, textarea"/,
  );
  assert.match(leads, /cursor-pointer[\s\S]*?hover:bg-muted\/50/);
});

test("case list and details map leads and use accessible record links", () => {
  assert.match(cases, /currentCase\.lead_name \?\?/);
  assert.match(
    cases,
    /currentCase\.lead_name \?\? ""\)\.toLowerCase\(\)\.includes\(query\)/,
  );
  assert.match(cases, /href=\{`\/dashboard\/cases\/\$\{currentCase\.id\}`\}/);
  assert.match(
    cases,
    /href=\{`\/dashboard\/leads\/\$\{currentCase\.lead_id\}`\}/,
  );
  assert.match(caseDetails, /caseData\.lead_name/);
  assert.match(caseDetails, /Case \{caseData\.id\}/);
  assert.match(caseDetails, /caseData\.lead_id/);
  assert.match(cases, /currentCase\.id\}\s*<\/a>/);
  assert.doesNotMatch(caseDetails, /caseData\.case_reference\}/);
  assert.doesNotMatch(cases, /currentCase\.case_reference\}/);
  assert.match(
    caseApi,
    /select\(Case, Lead\.name\)[\s\S]*?\.where\(Case\.id == case_id\)/,
  );
});

test("date filters are shared by lead, case, and dashboard data views", () => {
  assert.match(leads, /<FilterToolbar[\s\S]*?dateFilter=\{dateFilter\}/);
  assert.match(cases, /<FilterToolbar[\s\S]*?dateFilter=\{dateFilter\}/);
  assert.match(
    dashboard,
    /<DateFilter value=\{dateFilter\} onChange=\{setDateFilter\}/,
  );
  for (const source of [leads, cases, dashboard])
    assert.match(source, /matchesDateFilter\(/);
  const toolbar = readSource("../src/components/dashboard/FilterToolbar.tsx");
  assert.match(
    toolbar,
    /<DateFilter value=\{dateFilter\} onChange=\{onDateFilterChange\}/,
  );
  assert.match(toolbar, /sm:grid-cols-2/);
  assert.match(toolbar, /xl:grid-cols-/);
  assert.match(toolbar, /Clear filters/);
  assert.match(
    leads,
    /setSearch\(""\)[\s\S]*setStatusFilter\("ALL"\)[\s\S]*setServiceFilter\("ALL"\)/,
  );
  assert.match(cases, /setSearchQuery\(""\)[\s\S]*setStatusFilter\("ALL"\)/);
  const dateFilterComponent = readSource(
    "../src/components/dashboard/DateFilter.tsx",
  );
  assert.match(dateFilterComponent, /Week \(Mon–Sun\)/);
  assert.match(dateFilterComponent, /Custom range/);
  assert.match(dateFilterComponent, /<option value="all">All<\/option>/);
  assert.match(cases, /matchesDateFilter\(\s*currentCase\.created_at/);
  assert.match(leads, /matchesDateFilter\(lead\.created_at/);
});

test("case creation keeps CONTACTED eligibility and handles in-flight and duplicate requests", () => {
  assert.match(leadDetails, /lead\.status === "CONTACTED"/);
  assert.match(leadDetails, /after this lead reaches CONTACTED/);
  assert.match(leadDetails, /disabled=\{isCreatingCase\}/);
  assert.match(leadDetails, /A case already exists for this lead\./);
  assert.match(leadDetails, /getCaseForLead\(lead\.id\)/);
  assert.match(api, /\/api\/admin\/cases\/by-lead\/\$\{leadId\}/);
});
