import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Competition, Event, EventId, Person, WcaId } from "@wca/helpers";

import pdfMake from "./pdfmake";
import { pdfName } from "./pdf-utils";
import { shortEventNameById } from "../events";
import { chunk, times } from "../utils";
import type {
  ConfigData,
  EventData,
  PdfName,
  ScorecardPaperSize,
  ScorecardsData,
} from "../../types";

/* See: https://github.com/bpampuch/pdfmake/blob/3da11bd8148b190808b06f7bc27883102bf82917/src/standardPageSizes.js#L10 */
const scorecardPaperSizeInfos = {
  a4: {
    pageWidth: 595.28,
    pageHeight: 841.89,
    scorecardsPerRow: 2,
    scorecardsPerPage: 4,
    horizontalMargin: 15,
    verticalMargin: 15,
  },
  a6: {
    pageWidth: 297.64,
    pageHeight: 419.53,
    scorecardsPerRow: 1,
    scorecardsPerPage: 1,
    horizontalMargin: 15,
    verticalMargin: 15,
  },
  letter: {
    pageWidth: 612.0,
    pageHeight: 792.0,
    scorecardsPerRow: 2,
    scorecardsPerPage: 4,
    horizontalMargin: 15,
    verticalMargin: 10,
  },
};

export const downloadScorecards = (
  wcif: Competition,
  configData: ConfigData,
  scorecardsData: ScorecardsData
) => {
  const pdfDefinition = scorecardsPdfDefinition(
    scorecards(wcif, configData, scorecardsData),
    configData.scorecardPaperSize
  );
  pdfMake.createPdf(pdfDefinition).download(`${wcif.id}-scorecards.pdf`);
};

const scorecardsPdfDefinition = (
  scorecardList: Content[],
  scorecardPaperSize: ScorecardPaperSize
) => {
  const {
    pageWidth,
    pageHeight,
    scorecardsPerRow,
    scorecardsPerPage,
    horizontalMargin,
    verticalMargin,
  } = scorecardPaperSizeInfos[scorecardPaperSize];
  const cutLines =
    scorecardsPerPage === 4
      ? {
          canvas: [
            cutLine({
              x1: horizontalMargin,
              y1: pageHeight / 2,
              x2: pageWidth - horizontalMargin,
              y2: pageHeight / 2,
            }),
            cutLine({
              x1: pageWidth / 2,
              y1: verticalMargin,
              x2: pageWidth / 2,
              y2: pageHeight - verticalMargin,
            }),
          ],
        }
      : {};

  return {
    background: [cutLines],
    pageSize: { width: pageWidth, height: pageHeight },
    pageMargins: [horizontalMargin, verticalMargin],
    content: {
      layout: {
        /* Outer margin is done using pageMargins, we use padding for the remaining inner margins. */
        paddingLeft: (i: number) =>
          i % scorecardsPerRow === 0 ? 0 : horizontalMargin,
        paddingRight: (i: number) =>
          i % scorecardsPerRow === scorecardsPerRow - 1 ? 0 : horizontalMargin,
        paddingTop: (i: number) =>
          i % scorecardsPerRow === 0 ? 0 : verticalMargin,
        paddingBottom: (i: number) =>
          i % scorecardsPerRow === scorecardsPerRow - 1 ? 0 : verticalMargin,
        /* Get rid of borders. */
        hLineWidth: () => 0,
        vLineWidth: () => 0,
      },
      table: {
        widths: Array(scorecardsPerRow).fill("*"),
        heights: pageHeight / scorecardsPerRow - 2 * verticalMargin,
        dontBreakRows: true,
        body: chunk(scorecardList, scorecardsPerRow),
      },
    },
  } as TDocumentDefinitions;
};

const cutLine = (properties: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) => ({
  ...properties,
  type: "line",
  lineWidth: 0.1,
  dash: { length: 10 },
  lineColor: "#888888",
});

const scorecards = (
  wcif: Competition,
  configData: ConfigData,
  scorecardsData: ScorecardsData
) => {
  const { scorecardPaperSize, scorecardOrder } = configData;
  const { scorecardsPerPage } = scorecardPaperSizeInfos[scorecardPaperSize];
  let cards = (Object.keys(scorecardsData) as EventId[]).flatMap((eventId) => {
    const eventData = scorecardsData[eventId] as EventData;
    const stages = Object.keys(eventData)
      .map(Number)
      .sort((a, b) => b - a);
    let competitors: { id: number; name: PdfName; wcaId: WcaId | null }[] = [];
    const event = wcif.events.find((event) => event.id === eventId) as Event;
    const round = event.rounds.at(-1);
    const previousRound = event.rounds.at(-2);
    let personsIds: number[] = [];
    if (
      round &&
      previousRound &&
      round.results.length === stages[0] &&
      !round.results.some((result) => !result.ranking)
    ) {
      personsIds = previousRound.results
        .filter((result) =>
          round.results
            .map((result) => result.personId)
            .includes(result.personId)
        )
        .sort((a, b) => (a.ranking as number) - (b.ranking as number))
        .map((result) => result.personId);
    } else if (previousRound) {
      const results = previousRound.results;
      if (results.length > 0 && !results.some((result) => !result.ranking)) {
        personsIds = results
          .filter((result) => (result.ranking as number) <= stages[0])
          .sort((a, b) => (a.ranking as number) - (b.ranking as number))
          .map((result) => result.personId);
      }
    } else {
      personsIds = wcif.persons
        .filter((person) => person.registration?.eventIds.includes(eventId))
        .sort(
          (a, b) =>
            (a.personalBests?.find((pb) => pb.eventId === eventId)
              ?.worldRanking as number) -
            (b.personalBests?.find((pb) => pb.eventId === eventId)
              ?.worldRanking as number)
        )
        .map((person) => person.registrantId);
    }
    competitors = personsIds.map((personId) => {
      const person = wcif.persons.find(
        (person) => person.registrantId === personId
      ) as Person;
      return {
        id: personId,
        name: pdfName(person.name),
        wcaId: person.wcaId || null,
      };
    });
    let matchNumber = 0;
    return stages.flatMap((stage) => {
      const numberOfMatches = [1, 2].includes(stage)
        ? 1
        : stage === 12
          ? 4
          : stage / 2;
      const numberOfSets = eventData[stage];
      const stageCards = Array.from(
        { length: numberOfMatches },
        (_, matchIndex) => {
          const currentMatchNumber = matchNumber + 1 + matchIndex;
          let firstSeed: number, secondSeed: number;
          if (stage === stages[0]) {
            type SupportedStages = 4 | 8 | 12 | 16;
            const seedMap: Record<SupportedStages, number[]> = {
              4: [1, 2],
              8: [1, 4, 2, 3],
              12: [8, 5, 6, 7],
              16: [1, 8, 5, 4, 6, 3, 7, 2],
            };
            firstSeed =
              seedMap[stage as SupportedStages][currentMatchNumber - 1];
            secondSeed = stage - firstSeed + (stage === 12 ? 5 : 1);
          } else if (stages[0] === 12 && stage === 8) {
            switch (currentMatchNumber) {
              case 5:
                firstSeed = 1;
                break;
              case 6:
                secondSeed = 4;
                break;
              case 7:
                firstSeed = 3;
                break;
              case 8:
                secondSeed = 2;
                break;
            }
          }
          return Array.from({ length: numberOfSets }, (_, setIndex) => {
            const setNumber = setIndex + 1;
            return [
              scorecard({
                scorecardNumber: firstSeed,
                competitionName: wcif.shortName,
                eventId,
                stageNumber: stage,
                matchNumber: currentMatchNumber,
                setNumber,
                id: competitors[firstSeed - 1]?.id,
                name: competitors[firstSeed - 1]?.name,
                wcaId: competitors[firstSeed - 1]?.wcaId,
              }),
              scorecard({
                scorecardNumber: secondSeed,
                competitionName: wcif.shortName,
                eventId,
                stageNumber: stage,
                matchNumber: currentMatchNumber,
                setNumber,
                id: competitors[secondSeed - 1]?.id,
                name: competitors[secondSeed - 1]?.name,
                wcaId: competitors[secondSeed - 1]?.wcaId,
              }),
            ];
          });
        }
      ).flat(2);
      matchNumber += numberOfMatches;
      return stageCards;
    });
  });
  if (scorecardOrder === "stacked") {
    const scorecardsOnLastPage = cards.length % scorecardsPerPage;
    if (scorecardsOnLastPage !== 0) {
      cards = cards.concat(
        times(scorecardsPerPage - scorecardsOnLastPage, () => ({}) as Content)
      );
    }
    cards = cards
      .map((card, idx) => {
        return { overallNumber: idx, card };
      })
      .sort((cardA, cardB) => {
        const sectionA =
          cardA.overallNumber % (cards.length / scorecardsPerPage);
        const sectionB =
          cardB.overallNumber % (cards.length / scorecardsPerPage);
        if (sectionA !== sectionB) {
          return sectionA - sectionB;
        }
        return cardA.overallNumber - cardB.overallNumber;
      })
      .map((card) => card.card);
  }
  return cards;
};

const stageShortName = (stageNumber: number) => {
  switch (stageNumber) {
    case 1:
      return "F";
    case 2:
      return "TP";
    case 4:
      return "SF";
    case 8:
      return "QF";
    default:
      return `${stageNumber}`;
  }
};

type ScorecardParams = {
  scorecardNumber: number;
  competitionName: string;
  eventId: EventId;
  stageNumber: number;
  matchNumber: number;
  setNumber: number;
  id: number;
  name: PdfName;
  wcaId: WcaId | null;
};

const scorecard = ({
  scorecardNumber,
  competitionName,
  eventId,
  stageNumber,
  matchNumber,
  setNumber,
  id,
  name,
  wcaId,
}: ScorecardParams) =>
  [
    {
      fontSize: 10,
      columns: [
        {
          text: scorecardNumber,
          alignment: "left",
        },
        {},
      ],
    },
    {
      text: competitionName,
      bold: true,
      fontSize: 15,
      margin: [0, 0, 0, 0],
      alignment: "center",
    },
    {
      margin: [25, 0, 0, 0],
      table: {
        widths: ["*", 30, 30, 30],
        body: [
          columnLabels([
            "Round",
            { text: "Stage", alignment: "center" },
            { text: "Match", alignment: "center" },
            { text: "Set", alignment: "center" },
          ]),
          [
            `${shortEventNameById(eventId)} H2H Final`,
            {
              text: stageShortName(stageNumber),
              alignment: "center",
            },
            { text: matchNumber, alignment: "center" },
            { text: setNumber, alignment: "center" },
          ],
        ],
      },
    },
    {
      margin: [25, 0, 0, 0],
      table: {
        widths: [30, "*"],
        body: [
          columnLabels([
            "ID",
            [
              { text: "Name", alignment: "left" /*width: "auto"*/ },
              {
                text: wcaId || "",
                alignment: "right",
              },
            ],
          ]),
          [
            { text: id, alignment: "center" },
            {
              text: name,
              maxHeight: 20 /* See: https://github.com/bpampuch/pdfmake/issues/264#issuecomment-108347567 */,
            },
          ],
        ],
      },
    },
    {
      margin: [0, 10, 0, 0, 0],
      table: {
        widths: [
          16,
          25,
          "*",
          25,
          25,
          25,
        ] /* Note: 16 (width) + 4 + 4 (defult left and right padding) + 1 (left border) = 25 */,
        body: [
          columnLabels(["", "Scr", "Result", "W/L", "Judge", "Comp"], {
            alignment: "center",
          }),
          ...attemptRows(),
        ],
      },
    },
  ] as Content;

const columnLabels = (labels: Content[], style = {}) =>
  labels.map((label) => ({
    ...style,
    ...noBorder,
    fontSize: 9,
    ...(Array.isArray(label) ? { columns: label } : { text: label }),
  }));

const attemptRows = () =>
  times(7, (attemptIndex) => attemptRow(attemptIndex + 1)).reduce(
    (rows, attemptRow, attemptIndex) =>
      attemptIndex === 6
        ? [...rows, attemptRow]
        : [...rows, attemptRow, attemptsSeparator()],
    []
  );

const attemptsSeparator = () => [
  {
    ...noBorder,
    colSpan: 6,
    margin: [0, 1],
    columns: [],
  },
];

const attemptRow = (attemptNumber: number) => [
  {
    text: attemptNumber,
    ...noBorder,
    fontSize: 20,
    bold: true,
    alignment: "center",
  },
  {},
  {},
  {},
  {},
  {},
];

const noBorder = { border: [false, false, false, false] };
