import type { BrowserContext, Page, Response } from "playwright";

export type Mime = string;

export type CrawlOptions = {
  startUrl: string;
  sameOriginOnly: boolean;
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  navTimeoutMs: number;
  userAgent?: string;
};

export type ResourceKind = "html" | "pdf" | "other" | "unknown";

export type ResourceContext = {
  // identification
  url: string;
  finalUrl?: string;
  depth: number;

  // network
  status?: number;
  mime?: Mime;
  kind: ResourceKind;

  // playwright
  page: Page;
  context: BrowserContext;
  response?: Response;

  // payload (selon kind)
  html?: string;
  pdfBuffer?: Buffer;

  // signals collected
  console: { type: string; text: string; location?: string }[];
  pageErrors: string[];
  links: string[]; // liens extraits (si html)
  extractedText?: string; // ex: textract PDF

  // shared state
  engineState: EngineState;

  // reporting
  findings: Finding[];
};

export type EngineState = {
  startedAt: string;
  origin: string;
  seen: Set<string>;
  htmlVisitedCount: number;
  any: Record<string, unknown>;
};

export type Finding = {
  plugin: string;
  type: "info" | "warning" | "error";
  code: string;
  message: string;
  url: string;
  data?: string;
};

export type PluginPhase = "beforeGoto" | "afterGoto" | "afterExtract" | "afterProcess" | "periodic";

export interface IPlugin {
  name: string;

  /** Est-ce que le plugin s'applique à cette ressource ? (mime/kind/url/etc.) */
  applies(ctx: ResourceContext): boolean;

  /** Phases supportées */
  phases: PluginPhase[];

  /** Hook appelé sur les phases indiquées */
  run(phase: PluginPhase, ctx: ResourceContext): Promise<void>;
}
