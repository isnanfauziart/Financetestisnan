import { describe, expect, it } from "vitest"
import { computeGoalPace, parseGoalDeadline } from "@/app/dashboard/_components/goalUtils"

const goal = {
  target: 900000,
  deadline: "2026-10",
  createdAt: "2026-08-01",
}

describe("goal pace", () => {
  it("calculates the required monthly contribution inclusively through the deadline month", () => {
    expect(computeGoalPace(goal, 100000, new Date("2026-08-15T00:00:00.000Z"))).toMatchObject({
      status: "behind",
      remaining: 800000,
      remainingMonths: 3,
      requiredMonthly: 266667,
      observedMonthly: 100000,
      additionalMonthly: 166667,
    })
  })

  it("marks a goal on track when the observed monthly pace covers the remaining pace", () => {
    expect(computeGoalPace(goal, 300000, new Date("2026-08-15T00:00:00.000Z"))).toMatchObject({
      status: "on_track",
      remaining: 600000,
      requiredMonthly: 200000,
      observedMonthly: 300000,
      additionalMonthly: 0,
    })
  })

  it("reports no contributions without claiming the goal is behind", () => {
    expect(computeGoalPace(goal, 0, new Date("2026-08-15T00:00:00.000Z"))).toMatchObject({
      status: "no_contributions",
      requiredMonthly: 300000,
      additionalMonthly: 300000,
    })
  })

  it("reports an expired goal with its remaining amount", () => {
    expect(computeGoalPace({ ...goal, deadline: "2026-07" }, 100000, new Date("2026-08-15T00:00:00.000Z"))).toMatchObject({
      status: "expired",
      remaining: 800000,
      requiredMonthly: 800000,
    })
  })

  it("prioritizes completion over deadline status", () => {
    expect(computeGoalPace({ ...goal, deadline: "2026-07" }, 900000, new Date("2026-08-15T00:00:00.000Z"))).toMatchObject({
      status: "complete",
      remaining: 0,
    })
  })

  it("uses the final month of a year-only deadline", () => {
    expect(parseGoalDeadline("2026")).toEqual({ year: 2026, monthIndex: 11, day: 31 })
  })

  it("uses the Jakarta calendar date at the month boundary", () => {
    expect(computeGoalPace({ ...goal, deadline: "2026-08" }, 0, new Date("2026-07-31T17:00:00.000Z"))).toMatchObject({
      status: "no_contributions",
      remainingMonths: 1,
      requiredMonthly: 900000,
    })
  })
})
