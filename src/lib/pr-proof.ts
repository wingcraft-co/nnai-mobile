export type PrProofValidationErrorCode =
  | 'empty'
  | 'invalid_url'
  | 'invalid_protocol'
  | 'invalid_host'
  | 'invalid_path'
  | 'invalid_pr_number';

export type PrProofValidationResult =
  | {
      ok: true;
      normalized_url: string;
      owner: string;
      repo: string;
      pr_number: number;
    }
  | {
      ok: false;
      code: PrProofValidationErrorCode;
      message: string;
    };

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com', 'm.github.com']);

function fail(code: PrProofValidationErrorCode, message: string): PrProofValidationResult {
  return { ok: false, code, message };
}

function normalizePath(pathname: string): string[] {
  return pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function toNormalizedUrl(url: URL): string {
  url.hash = '';
  return url.toString();
}

export function validatePrProofUrl(input: string): PrProofValidationResult {
  const raw = input.trim();
  if (!raw) return fail('empty', 'PR proof URL is required');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail('invalid_url', 'PR proof URL must be a valid URL');
  }

  if (url.protocol !== 'https:') {
    return fail('invalid_protocol', 'PR proof URL must use https');
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return fail('invalid_host', 'PR proof URL must be a github.com URL');
  }

  const segments = normalizePath(url.pathname);
  if (segments.length < 4) {
    return fail('invalid_path', "PR proof URL must match '/owner/repo/pull/{number}'");
  }

  const [owner, repo, pullLiteral, prNumberText] = segments;
  if (!owner || !repo || pullLiteral !== 'pull') {
    return fail('invalid_path', "PR proof URL must match '/owner/repo/pull/{number}'");
  }

  const prNumber = Number(prNumberText);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    return fail('invalid_pr_number', 'PR number must be a positive integer');
  }

  return {
    ok: true,
    normalized_url: toNormalizedUrl(url),
    owner,
    repo,
    pr_number: prNumber,
  };
}

