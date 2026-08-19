import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestClientKey,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";

export const MAX_CHOICE_EVENT_BYTES = 12 * 1024;
export const CHOICE_EVENT_WINDOW_SECONDS = 60;
export const MAX_CHOICE_EVENTS_PER_WINDOW = 60;

export function choiceRequestOriginIsAllowed(request: Request) {
  return publicWriteRequestOriginIsAllowed(request);
}

export function choiceRequestBodyIsTooLarge(request: Request) {
  return publicWriteRequestBodyIsTooLarge(request, MAX_CHOICE_EVENT_BYTES);
}

export function readChoiceRequestTextWithinLimit(request: Request) {
  return readPublicWriteRequestTextWithinLimit(request, MAX_CHOICE_EVENT_BYTES);
}

export function choiceRequestClientKey(request: Request) {
  return publicWriteRequestClientKey(request);
}
