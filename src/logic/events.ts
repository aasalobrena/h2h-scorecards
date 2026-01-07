import type { EventId } from "@wca/helpers";

const shortEventNameMap: Record<EventId, string> = {
  "333": "3x3",
  "222": "2x2",
  "444": "4x4",
  "555": "5x5",
  "666": "6x6",
  "777": "7x7",
  "333bf": "3BLD",
  "333fm": "FMC",
  "333oh": "OH",
  "333ft": "3WF",
  clock: "Clock",
  minx: "Minx",
  pyram: "Pyra",
  skewb: "Skewb",
  sq1: "Sq1",
  "444bf": "4BLD",
  "555bf": "5BLD",
  "333mbf": "MBLD",
  magic: "Magic",
  mmagic: "M-Magic",
  "333mbo": "3MBLD-O",
};

export const shortEventNameById = (eventId: EventId) =>
  shortEventNameMap[eventId];
