import { describe, expect, it } from "vitest";
import { formatTtlDuration } from "@/features/paste/utils/formatTtl";

describe("formatTtlDuration", () => {
    it.each([
        [60, "1 min"],
        [300, "5 mins"],
        [3600, "1 hr"],
        [86400, "24 hrs"],
        [259200, "3 days"],
        [604800, "1 week"],
        [undefined, "24 hrs"],
    ])("labels %s seconds as %s", (seconds, label) => {
        expect(formatTtlDuration(seconds)).toBe(label);
    });
});
