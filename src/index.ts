export interface OpenClawApi {
  registerTool: (definition: unknown, options?: { optional?: boolean }) => void;
}

export default function register(api: OpenClawApi): void {
  if (!api || typeof api.registerTool !== "function") {
    throw new Error("OpenClaw API is unavailable");
  }

  // Tools are added in later phases.
}
