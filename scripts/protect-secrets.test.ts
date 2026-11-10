import { describe, expect, it } from "vitest";

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

function checkLineForSecrets(line: string) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(line)) {
      return pattern.name;
    }
  }
  return null;
}

describe("protect-secrets pattern scanner", () => {
  it("detects Supabase service role key assignments", () => {
    const leakedLine =
      "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_payload";
    expect(checkLineForSecrets(leakedLine)).toBe("Supabase Service Role Key assignment");
  });

  it("detects RSA/EC private keys", () => {
    const privateKeyLine = "-----BEGIN PRIVATE KEY-----";
    expect(checkLineForSecrets(privateKeyLine)).toBe("Private Key block");
  });

  it("detects GitHub personal access tokens", () => {
    const token = "ghp_123456789012345678901234567890123456";
    expect(checkLineForSecrets(token)).toBe("GitHub Personal Access Token");
  });

  it("detects AWS access keys", () => {
    const awsKey = "AKIAIOSFODNN7EXAMPLE";
    expect(checkLineForSecrets(awsKey)).toBe("AWS Access Key ID");
  });

  it("allows safe environment variable references", () => {
    const safeLine = 'const key = process.env.SUPABASE_ANON_KEY ?? "";';
    expect(checkLineForSecrets(safeLine)).toBeNull();
  });
});
