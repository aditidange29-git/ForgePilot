import type { TrueForge } from "@truefoundry/trueforge-sdk";

export type TrueForgeClient = InstanceType<typeof TrueForge>;

export interface ActiveRequest {
  controller: AbortController;
  conversationId: string;
  sessionId?: string;
  turnStarted?: boolean;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
