import eventConfig from "../../event.config";
import type { Event, Status } from "../types";
import { demoEvent, demoText } from "./demo";

export type TextConfig = Partial<typeof demoText>;
export type EventConfig = Partial<Omit<Event, "id">> & {
  text?: TextConfig;
};

export function resolveText(overrides: TextConfig = {}): typeof demoText {
  const resolved = { ...demoText };
  for (const key of Object.keys(demoText) as (keyof typeof demoText)[]) {
    if (overrides[key] !== undefined) resolved[key] = overrides[key];
  }
  return resolved;
}

export const uiText = resolveText(eventConfig.text);
export const statusLabels: Record<Status, string> = {
  pending: uiText.statusPending,
  approved: uiText.statusApproved,
  shortlisted: uiText.statusShortlisted,
  answered: uiText.statusAnswered,
  hidden: uiText.statusHidden,
};

export function resolveEvent(
  config: EventConfig,
  defaults: Event = demoEvent,
): Event {
  return {
    id: defaults.id,
    name: config.name ?? defaults.name,
    slug: config.slug ?? defaults.slug,
    description:
      config.description === undefined
        ? defaults.description
        : config.description,
    starts_at:
      config.starts_at === undefined ? defaults.starts_at : config.starts_at,
    ends_at: config.ends_at === undefined ? defaults.ends_at : config.ends_at,
    is_active: config.is_active ?? defaults.is_active,
    ...(config.sessions !== undefined || defaults.sessions !== undefined
      ? { sessions: config.sessions ?? defaults.sessions }
      : {}),
  };
}

export const configuredEvent = resolveEvent(eventConfig);

// Explicit links to other database events keep their own event details.
export function configureDatabaseEvent(event: Event): Event {
  return event.slug === configuredEvent.slug
    ? resolveEvent({ ...eventConfig, sessions: event.sessions }, event)
    : event;
}
