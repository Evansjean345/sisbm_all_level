/**
 * Référentiel des événements GPS et des gravités (spécifications §III.3) —
 * identique à l'API (`app/domain/policy/rule_policy.ts`).
 */

/** Événements GPS pris en charge par le moteur de règles. */
export const EVENT_TYPES = [
  "overspeed",
  "geofence_exit",
  "geofence_entry",
  "schedule_violation",
  "power_cut",
  "disconnection",
  "sos",
  "jamming",
  "towing",
  "tamper",
  "harsh_driving",
  "engine_start",
  "engine_stop",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const NOTIFICATION_CHANNELS = ["sms", "email", "push"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
