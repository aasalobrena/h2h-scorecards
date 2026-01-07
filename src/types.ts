import type { EventId } from "@wca/helpers";

export type ConfigData = {
  scorecardPaperSize: ScorecardPaperSize;
  scorecardOrder: ScorecardOrder;
};
export type EventData = Record<number, number>;
export type PdfName =
  | string
  | (
      | string
      | {
          text: string;
          font: string;
        }
    )[];
export type ScorecardOrder = "natural" | "stacked";
export type ScorecardPaperSize = "a4" | "a6" | "letter";
export type ScorecardsData = Partial<Record<EventId, EventData>>;
