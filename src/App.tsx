import { useEffect, useRef, useState } from "react";
import {
  type Competition,
  type Event,
  type EventId,
  getEventName,
} from "@wca/helpers";

import { downloadScorecards } from "./logic/documents/scorecards";
import type {
  ConfigData,
  ScorecardOrder,
  ScorecardPaperSize,
  ScorecardsData,
} from "./types";

const getCompetitorLength = (event: Event) => {
  const nRounds = event.rounds.length;
  if (nRounds === 1) {
    const qualification = event.qualification;
    if (!qualification || qualification.type !== "ranking") {
      return 0;
    }
    return qualification.level;
  }
  const advancementCondition = event.rounds[nRounds - 2].advancementCondition;
  if (!advancementCondition || advancementCondition.type !== "ranking") {
    return 0;
  }
  return advancementCondition.level;
};

type ConfigSelectProps = {
  id: string;
  label: string;
  options: {
    value: string;
    text: string;
  }[];
};

const ConfigSelect = ({ id, label, options }: ConfigSelectProps) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={{ marginBottom: "4px", fontSize: "14px" }}>{label}</label>
    <select id={id} style={{ padding: "4px" }}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  </div>
);

type SelectProps = {
  eventId: EventId;
  stage: number;
};

const Select = ({ eventId, stage }: SelectProps) => (
  <select
    id={`${eventId}-${stage}`}
    style={{ padding: "4px", marginLeft: "6px" }}
  >
    <option value="1">1 set</option>
    <option value="3">3 sets</option>
    <option value="5">5 sets</option>
  </select>
);

export const App = () => {
  const [competitionId, setCompetitionId] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<EventId[]>([]);
  const [wcif, setWcif] = useState<Competition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!competitionId) return;
    const fetchData = async () => {
      const res = await fetch(
        `https://www.worldcubeassociation.org/api/v0/competitions/${competitionId}/wcif/public/`
      );
      const data = await res.json();
      setWcif(data.error ? null : data);
    };
    fetchData();
  }, [competitionId]);

  const handleCheckClick = () => {
    if (inputRef.current) {
      setCompetitionId(inputRef.current.value);
    }
  };

  const toggleEvent = (id: EventId) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleDownloadClick = () => {
    const configData: ConfigData = {
      scorecardOrder: (document.getElementById("order") as HTMLSelectElement)
        .value as ScorecardOrder,
      scorecardPaperSize: (document.getElementById("size") as HTMLSelectElement)
        .value as ScorecardPaperSize,
    };
    const scorecardsData: ScorecardsData = {};
    selectedEvents.forEach((eventId) => {
      scorecardsData[eventId] = {};
      for (let i = 0; i <= 16; i++) {
        const element = document.getElementById(`${eventId}-${i}`);
        if (element) {
          scorecardsData[eventId][i] = Number(
            (element as HTMLSelectElement).value
          );
        }
      }
    });
    if (!wcif) {
      return;
    }
    downloadScorecards(wcif, configData, scorecardsData);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label>Competition ID</label>
          <input
            type="text"
            ref={inputRef}
            placeholder="ExampleComp2026"
            style={{ padding: "8px", fontSize: "16px" }}
          />
        </div>
        <button
          onClick={handleCheckClick}
          style={{
            padding: "8px 12px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Search
        </button>
        {wcif && (
          <>
            <ConfigSelect
              id="size"
              label="Scorecard paper size"
              options={[
                {
                  value: "a4",
                  text: "Four scorecards per page (A4 paper)",
                },
                {
                  value: "letter",
                  text: "Four scorecards per page (Letter paper, used in North America)",
                },
                {
                  value: "a6",
                  text: "One scorecard per page (A6 paper)",
                },
              ]}
            />
            <ConfigSelect
              id="order"
              label="Scorecard order"
              options={[
                {
                  value: "natural",
                  text: "Scorecards are arranged by row, page by page (1/2/3/4 5/6/7/8 9/10/11/12)",
                },
                {
                  value: "stacked",
                  text: "Scorecards are arranged such that each stack of scorecards is sorted (1/4/7/10 2/5/8/11 3/6/9/12)",
                },
              ]}
            />
          </>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
        }}
      >
        {wcif ? (
          wcif.events
            .filter(
              (event) =>
                ["333", "444", "333bf", "333oh"].includes(event.id) &&
                [4, 8, 12, 16].includes(getCompetitorLength(event))
            )
            .map((event) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#f9f9f9",
                  marginBottom: "12px",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                  />
                  <span>
                    {getEventName(event.id)}: Bracket of{" "}
                    {getCompetitorLength(event)}
                  </span>
                </div>
                {selectedEvents.includes(event.id) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      marginLeft: "20px",
                    }}
                  >
                    {[12, 16].includes(getCompetitorLength(event)) && (
                      <>
                        Stage of {getCompetitorLength(event)}:
                        <Select
                          eventId={event.id}
                          stage={getCompetitorLength(event)}
                        />
                      </>
                    )}
                    {[8, 12, 16].includes(getCompetitorLength(event)) && (
                      <>
                        Quarterfinal Stage:
                        <Select eventId={event.id} stage={8} />
                      </>
                    )}
                    <>
                      Semifinal Stage:
                      <Select eventId={event.id} stage={4} />
                    </>
                    <>
                      Third Place Match:
                      <Select eventId={event.id} stage={2} />
                    </>
                    <>
                      Final Match:
                      <Select eventId={event.id} stage={1} />
                    </>
                  </div>
                )}
              </div>
            ))
        ) : (
          <p>This competition doesn't exist</p>
        )}
      </div>
      {wcif && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            onClick={handleDownloadClick}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Download scorecards
          </button>
        </div>
      )}
    </div>
  );
};
