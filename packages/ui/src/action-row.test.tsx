import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActionRow,
  ActionRowAction,
  ActionRowActions,
  ActionRowLabel,
  ActionRowMain,
  ActionRowStatus,
  getActionRowReserve,
} from "./action-row";

describe("ActionRow", () => {
  test("renders one semantic contract for the main label and row actions", () => {
    const markup = renderToStaticMarkup(
      <ActionRow>
        <ActionRowMain>
          <ActionRowLabel>A long row label</ActionRowLabel>
        </ActionRowMain>
        <ActionRowActions side="end">
          <ActionRowAction aria-label="Archive" />
        </ActionRowActions>
        <ActionRowStatus>Current</ActionRowStatus>
      </ActionRow>,
    );

    expect(markup).toContain('data-action-row=""');
    expect(markup).toContain('data-action-row-main=""');
    expect(markup).toContain('data-action-row-label=""');
    expect(markup).toContain('data-action-row-actions=""');
    expect(markup).toContain('data-side="end"');
    expect(markup).toContain('data-action-row-action=""');
    expect(markup).toContain('data-action-row-status=""');
  });

  test("reserves the complete logical action edge including its inset", () => {
    const row = { left: 10, right: 210 };

    expect(getActionRowReserve("start", row, { left: 14, right: 42 })).toBe(32);
    expect(getActionRowReserve("end", row, { left: 174, right: 202 })).toBe(36);
  });

  test("never emits a negative mask reserve", () => {
    expect(
      getActionRowReserve(
        "end",
        { left: 10, right: 210 },
        { left: 220, right: 248 },
      ),
    ).toBe(0);
  });
});
