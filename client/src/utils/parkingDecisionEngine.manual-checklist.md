# Parking vs Uber Manual Validation Checklist

Use this checklist to verify MVP decision logic behavior in the UI.

## Setup

1. Run the client app (`npm run dev` in `client/`).
2. Open the map page and the `Should I Park Here?` sidebar.

## Functional Checks

- Select a location, day, and hour; confirm Risk score and existing stats still render.
- Enter an origin address; confirm an Uber estimate appears and source is `mock`.
- Change only parking cost and confirm Parking EV and recommendation update immediately.
- Change only duration and confirm estimated ticket probability updates.
- Change location/day/hour and confirm both ticket probability and Uber estimate refresh.

## Math Checks

- Set parking cost to `0`; verify Parking EV equals `ticketProbability * 50`.
- Use a high parking cost (e.g., `40`) and verify recommendation can switch to Uber.
- Use a very low parking cost (`0`) and low-risk slot; verify recommendation can switch to Park.
- Confirm break-even probability is displayed in `[0%, 100%]`.

## Edge Case Checks

- Leave origin empty; confirm UI prompts for origin and does not crash.
- Try negative parking cost; confirm displayed EV does not become negative.
- Pick sparse data slots (very low citation count) and confirm confidence displays as `Low`.
- Confirm assumptions text appears: `$50 ticket cap`, `ticket-only`, `mock Uber pricing`.

