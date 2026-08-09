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
