#!/usr/bin/env node
/* global process, console */
import { execSync, spawnSync } from "node:child_process";

// Known high-risk patterns to block from git commit
const SECRET_PATTERNS = [
  {
    name: "Supabase Service Role Key assignment",
    regex: /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*=\s*['"]?eyJ[a-zA-Z0-9_\-.]+/i,
  },
  {
    name: "Private Key block",
    regex: /-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/,
  },
  {
    name: "GitHub Personal Access Token",
    regex: /(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})/,
  },
  {
    name: "Slack API Token / Webhook",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Za-z]+\/B[0-9A-Za-z]+\/[0-9A-Za-z]+/,
  },
  {
    name: "AWS Access Key ID",
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
  },
];

function checkWithGitleaks() {
  const check = spawnSync("gitleaks", ["version"], { stdio: "ignore" });
  if (check.status === 0) {
    const res = spawnSync("gitleaks", ["protect", "--staged", "--verbose", "--redact"], {
      stdio: "inherit",
    });
    return res.status === 0;
  }
  return null; // Not installed
}

export function scanStagedFiles() {
  // If gitleaks CLI is installed locally, use it directly
  const gitleaksResult = checkWithGitleaks();
  if (gitleaksResult !== null) {
    if (!gitleaksResult) {
      console.error("\x1b[31m[ERROR] Gitleaks detected secrets in staged files!\x1b[0m");
      process.exit(1);
    }
    return true;
  }

  // Fallback to pattern scanning staged diff
  let stagedDiff = "";
  try {
    stagedDiff = execSync("git diff --staged -U0", { encoding: "utf8" });
  } catch {
    // If not a git repo or no git, pass through
    return true;
  }

  if (!stagedDiff.trim()) {
    return true;
  }

  const lines = stagedDiff.split("\n");
  let currentFile = "";
  const violations = [];

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = match ? match[2] : "";
      continue;
    }

    // Skip automated test files that contain intentional mock patterns
    if (currentFile && /\.(test|spec)\.[jt]sx?$/.test(currentFile)) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const addedContent = line.substring(1);
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(addedContent)) {
          violations.push({
            file: currentFile,
            pattern: pattern.name,
            preview: addedContent.trim().substring(0, 60) + (addedContent.length > 60 ? "..." : ""),
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("\x1b[31m========================================================\x1b[0m");
    console.error("\x1b[31m[SECURITY BLOCKED] Secrets detected in staged changes!\x1b[0m");
    console.error("\x1b[31m========================================================\x1b[0m");
    for (const v of violations) {
      console.error(`  - File:    \x1b[36m${v.file}\x1b[0m`);
      console.error(`    Pattern: \x1b[33m${v.pattern}\x1b[0m`);
      console.error(`    Line:    \x1b[90m${v.preview}\x1b[0m`);
    }
    console.error("\n\x1b[31mCommit has been rejected. Never commit secrets.\x1b[0m");
    process.exit(1);
  }

  return true;
}

// When executed directly as script
if (process.argv[1] && process.argv[1].endsWith("protect-secrets.mjs")) {
  scanStagedFiles();
}
