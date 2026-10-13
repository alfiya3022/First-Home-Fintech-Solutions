import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const compose = readFileSync(
  new URL("../../docker-compose.yml", import.meta.url),
  "utf8",
);
const viteConfig = readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);
const apiService = readFileSync(
  new URL("../src/services/api.ts", import.meta.url),
  "utf8",
);
const hero = readFileSync(
  new URL("../src/components/sections/Hero.tsx", import.meta.url),
  "utf8",
);
const leadsPage = readFileSync(
  new URL("../src/pages/Leads.tsx", import.meta.url),
  "utf8",
);
const sidebar = readFileSync(
  new URL("../src/components/dashboard/Sidebar.tsx", import.meta.url),
  "utf8",
);
const loginPage = readFileSync(
  new URL("../src/pages/Login.tsx", import.meta.url),
  "utf8",
);
const dashboardPage = readFileSync(
  new URL("../src/pages/Dashboard.tsx", import.meta.url),
  "utf8",
);
const dockerfile = readFileSync(
  new URL("../Dockerfile", import.meta.url),
  "utf8",
);
const nginx = readFileSync(
  new URL("../../nginx/nginx.conf.template", import.meta.url),
  "utf8",
);

test("Docker frontend build leaves the API base empty for /api routes", () => {
  assert.match(compose, /frontend:\s*[\s\S]*?VITE_API_BASE_URL:\s*""/);
  assert.match(dockerfile, /^ARG VITE_API_BASE_URL=\s*$/m);
  assert.match(
    nginx,
    /location \/api\/\s*\{[\s\S]*?proxy_pass http:\/\/backend;/,
  );
});

test("Vite proxies local API requests to the First Home IPv4 backend", () => {
  assert.match(
    viteConfig,
    /proxy:\s*\{\s*"\/api":\s*\{\s*target:\s*"http:\/\/127\.0\.0\.1:8000"/,
  );
});

test("every frontend API URL adds exactly one /api prefix", () => {
  const routes = [
    ...apiService.matchAll(/`\$\{API_BASE_URL\}(\/api\/[^`]+)`/g),
  ];

  assert.ok(routes.length >= 15, "expected the complete API route set");
  for (const [, route] of routes) {
    assert.match(route, /^\/api\//);
    assert.doesNotMatch(route, /^\/api\/api\//);
    assert.equal((route.match(/\/api\//g) ?? []).length, 1, route);
  }
});

test("consultant lead reads use authenticated consultant endpoints", () => {
  const getLeadsImplementation = apiService.match(
    /export async function getLeads[\s\S]*?\n\}/,
  )?.[0];
  const getLeadImplementation = apiService.match(
    /export async function getLead\([\s\S]*?\n\}/,
  )?.[0];

  assert.match(getLeadsImplementation ?? "", /\/api\/consultant\/leads/);
  assert.match(getLeadImplementation ?? "", /\/api\/consultant\/leads\//);
  assert.match(getLeadsImplementation ?? "", /credentials: "include"/);
  assert.match(
    apiService,
    /export interface CurrentUser[\s\S]*?is_admin: boolean/,
  );
  assert.match(
    apiService,
    /export async function getCurrentUser[\s\S]*?credentials: "include"/,
  );
  assert.match(apiService, /\/api\/admin\/leads\/export/);
  assert.match(leadsPage, /user\.is_admin &&/);
  assert.match(sidebar, /item\.href !== "\/dashboard\/cases" \|\| isAdmin/);
  assert.match(loginPage, /Staff Portal/);
  assert.match(
    dashboardPage,
    /user\.is_admin \? "Administrator Portal" : "Consultant Portal"/,
  );
});

test("dashboard displays an error instead of rendering blank when auth lookup fails", () => {
  assert.match(dashboardPage, /if \(!user\) \{[\s\S]*?role="alert"/);
  assert.match(dashboardPage, /Return to sign in/);
  assert.doesNotMatch(dashboardPage, /if \(!user\) \{\s*return null;/);
});

test("homepage displays temporary hard-coded EIBOR rates with a publication date", () => {
  assert.match(hero, /oneMonth:\s*"4\.074230"/);
  assert.match(hero, /threeMonths:\s*"4\.443480"/);
  assert.match(hero, /sixMonths:\s*"4\.616510"/);
  assert.match(hero, /publicationDate:\s*"13 October 2026"/);
  assert.match(hero, /manually maintained rates/i);
  assert.match(hero, /Verify rates with CBUAE/);
  assert.match(
    hero,
    /https:\/\/centralbank\.ae\/en\/forex-eibor\/eibor-rates\//,
  );
});

test("Nginx redirects HTTP and overwrites forwarded client addresses", () => {
  assert.match(
    nginx,
    /listen 80;[\s\S]*?return 301 https:\/\/\$host\$request_uri;/,
  );
  assert.match(nginx, /listen 443 ssl;/);
  assert.match(nginx, /ssl_certificate \$\{TLS_CERTIFICATE_PATH\};/);
  assert.match(nginx, /ssl_certificate_key \$\{TLS_PRIVATE_KEY_PATH\};/);
  assert.match(nginx, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/);
});

test("Nginx routes readiness checks to the backend readiness endpoint", () => {
  assert.match(
    nginx,
    /location = \/ready\s*\{\s*proxy_pass http:\/\/backend\/ready;\s*proxy_set_header Host \$host;\s*proxy_set_header X-Real-IP \$remote_addr;\s*proxy_set_header X-Forwarded-For \$remote_addr;\s*proxy_set_header X-Forwarded-Proto \$scheme;\s*\}/,
  );
});

test("backend trusts the Nginx container IP configured by Compose", () => {
  assert.match(
    compose,
    /TRUSTED_PROXY_IP:\s*\$\{NGINX_PROXY_IP:-172\.30\.0\.2\}/,
  );
  assert.match(compose, /ipv4_address:\s*\$\{NGINX_PROXY_IP:-172\.30\.0\.2\}/);
});

test("Compose requires a read-only Let's Encrypt mount and production cookies", () => {
  assert.match(compose, /ENVIRONMENT:\s*production/);
  assert.match(compose, /source:\s*\$\{LETSENCRYPT_ROOT:/);
  assert.match(compose, /target:\s*\/etc\/letsencrypt/);
  assert.match(compose, /read_only:\s*true/);
  assert.match(compose, /- "443:443"/);
});
