export type WindowLimit = {
  limit: number;
  windowMs: number;
};

export const LOGIN_PER_IP: WindowLimit = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

export const LOGIN_PER_EMAIL: WindowLimit = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
};

export const AI_PER_USER_HOUR: WindowLimit = {
  limit: 20,
  windowMs: 60 * 60 * 1000,
};

export const AI_PER_IP_HOUR: WindowLimit = {
  limit: 30,
  windowMs: 60 * 60 * 1000,
};

export const AI_IN_FLIGHT_MAX = 3;

export const AI_IN_FLIGHT_TTL_MS = 120 * 1000;

export type DailyCap = {
  requests: number;
  cents: number;
};

export const AI_DAILY_PER_USER: DailyCap = {
  requests: 60,
  cents: 100,
};

export const AI_DAILY_GLOBAL: DailyCap = {
  requests: 900,
  cents: 2_000,
};

// How many sites one account may hold at once, unless it holds a `pro` entitlement (R3 D8).
//
// The number is a placeholder for a product decision nobody has made yet, and it is here on
// its own line so that making it is a one-line change rather than a hunt. What is not a
// placeholder is that the count is taken on the server, from the projects table: a cap the
// client is trusted to observe is not a cap.
//
// Deleting a site frees a slot, because the cap is on what is held rather than on what has
// ever been made — a limit somebody cannot get back under by tidying up is a trap.
export const PROJECTS_PER_USER = 25;

// Free AI regenerations for one site. After this, they pick from the looks
// already made, or hold `pro` to generate more. Separate from AI_DAILY_PER_USER,
// which is the cost safety net rather than the product rule.
export const FREE_GENERATIONS_PER_PROJECT = 5;
