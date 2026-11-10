# Vela vertical promo: storyboard

Two cuts from one timeline: **VelaEN** (`out/vela-en.mp4`) and **VelaAR** (`out/vela-ar.mp4`).
1080x1920, 30 fps, H.264. EN 59.7 s, AR 58.3 s. Cuts land on words of the voice (see `src/timelines/*.json`, built from the ElevenLabs character timings by `scripts/build-timeline.mjs`).

## Product brief

- **What:** Vela, an AI receptionist for clinics and service businesses in Qatar and the Gulf. It answers real calls in Arabic or English, knows the services, prices and hours, books into the calendar, and shows every call and booking in one place.
- **Who:** clinic owners and managers scrolling TikTok / Reels in Qatar. Gulf Arabic and English.
- **One message:** every missed call is a missed patient; Vela answers every one.
- **Call to action:** velaos.co, "Book a free setup".

## Decisions (requirement to execution)

| Requirement | Decision |
|---|---|
| Hook in 2 s | Frame 0 already shows the clock and the ringing phone; the ring hits before the first word. |
| Nothing templated | Every animated scene is built in code from Vela's own tokens; no stock, no AI images, no template scenes. Real app UI comes only from real captures. |
| Brand | Orange `#E4572E` family (the app's own `#ed5426` to `#9e3819` gradient), white and cream, Inter (EN) and IBM Plex Sans Arabic (AR), bundled locally via @fontsource. |
| Mood | Lines 1 to 3 dark warm night (`#120D0B`). Line 4 flips to bright cream with the logo. Lines 5 to 8 stay bright. |
| Voice | The voice the promo account's phone agent uses: ElevenLabs "Mateo" (`HKFOb9iktHA85uKXydRT`), eleven_v3, speed 0.9. Arabic voice text says "ڤيلا"; captions always show "Vela". |
| Captions | Burned in, 2 to 5 words, Inter 800 / Plex Arabic 700, 64 px, white on a dark pill, current word in orange. Arabic RTL, never mixed with English captions. Lines 4 and 8 are shown as part of the brand cards instead of the caption strip (no double text). |
| Safe zone | All text and key UI inside x 0 to 940, y 220 to 1500 of 1080x1920. Captions sit at y 1330 to 1490. The phone frame spans y 240 to 1300. |
| Privacy | Every capture masks phone numbers as "+974 •••• ••••" and emails; captures refuse to save if anything unmasked remains. Calls, the transcript and appointments are a fictional demo scenario served in the browser only (the real test calls name other businesses and real people). First names only. |
| Read only | The capture browser aborts every non-GET request to the app and every database write. 0 were attempted. |
| Sound | No music (added in TikTok/Instagram). Subtle SFX synthesized locally with ffmpeg: phone ring, notification ping, soft whoosh on scene cuts, soft thump on the logo and the booking landing. Voice on top, final mix normalized to -14 LUFS, -1 dBTP. |

## Motion tokens

Brand sits between "professional trust" and "friendly": entrances 18 to 21 frames with `bezier(0.16, 1, 0.3, 1)` (fast out, no bounce); landings that should feel physical (the booking card, the logo) get a small overshoot (1.04). No camera shake, no glint sweeps; one highlight per scene, clipped to its element. Holds: logo and end card at least 1 s settled, end card at least 2.5 s.

## Shots

Frame numbers are EN / AR (30 fps). Each scene starts on the word in brackets.

| # | Frames | Scene | Picture | Key motion | SFX |
|---|---|---|---|---|---|
| 1 | 0 / 0 | Night, clinic closed ("It's" / "الساعة") | Dark warm room tone. Giant "9:47 PM" clock (Inter 800, 260 px) with a slow minute tick; a phone card ringing "Al Noor Dental" with pulse rings; a small "Closed" sign. | Clock digits settle, phone shakes on each ring burst (element only), rings pulse. | Ring x2 (from frame 0) |
| 2 | 209 / 218 | Nobody answers ("A" / "مريض") | The phone goes unanswered; "Missed call" notifications stack in (3, each faster); a second card on the right, "Clinic down the street", turns green "Connected". | Cards drop in with accelerating rhythm; the competitor card slides in last and holds. | Ping x3 (stepped down), soft whoosh |
| 3 | 409 / 397 | The cost ("Every" / "كل") | Missed-call count rolls 1 to 12 next to "missed patients" in orange, the cards fade to grey, an empty waiting chair icon fades out. | Digit roll with acceleration, 0.5 s rest. | none (voice carries it) |
| 4 | 593 / 612 | Brand reveal ("Meet" / "هذا") | Cream circle wipes out from the center over the dark; the Vela logo lands; tagline "The AI receptionist that never sleeps" under it. | Wipe 18 f, logo 1.04 landing, hold more than 1 s. | Whoosh, soft thump |
| 5a | 769 / 769 | Answers every call ("Vela" / "يرد") | Real Phone Number page in a phone frame: the Live pill, the business number (masked), recent calls with EN / AR tags. | Phone frame rises in; zoom to the Live pill and the language tags. | Whoosh |
| 5b | 896 / 886 | Knows your business ("It" / "يعرف") | Real Conversations thread of the 9:47 PM call; bubbles appear one by one; the price line ("60 QAR") gets a highlight. | Bubbles reveal in reading order; slow push in. | Soft tick per bubble |
| 6a | 1027 / 989 | Books it ("When" / "ولما") | Real Day view for tomorrow; the 10:00 Sara booking card drops into its slot (real row cut out of the same page). | Card falls 140 px, 1.04 landing, slot highlight. | Thump on landing |
| 6b | 1177 / 1141 | No double bookings ("No" / "بدون") | Real Week view (tablet layout) slides in; the booked slots stay, no overlaps. | Slide in, slow push. | Whoosh |
| 6c | 1230 / 1198 | Never on a closed day ("Never" / "وما") | Same Week view; the hatched closed Saturday and Sunday columns get an orange outline. | Outline draws on. | none |
| 7a to 7c | 1301 / 1295 | All in one place ("You" / "تشوف") | Three quick cuts in the phone frame: AI Agent Overview (calls), Conversations inbox, Dashboard. | Cut on "transcript" and "booking"; each screen scrolls slightly. | Soft whoosh on each cut |
| 7d | 1445 / 1434 | ("All" / "كله") | The three screens fan out side by side. | Fan out, hold. | none |
| 8a, 8b | 1515 / 1495 | We set it up ("We" / "واحنا") | Phone page number card, "You keep your number" with the number highlighted. | Slow push to the number. | none |
| 8c | 1654 / 1634 | End card ("Vela." / "ڤيلا.") | Cream background, Vela logo, "velaos.co", "Book a free setup" pill. Held to the end (at least 2.5 s). | Logo lands, URL and pill rise in, then stillness. | Soft thump |

## QA plan

- `ffprobe`: duration 45 to 60 s, 1080x1920, 30 fps, H.264 + AAC.
- Loudness after mix: -14 LUFS integrated (ffmpeg ebur128).
- One frame per scene (contact sheet), plus cover frames; checked for masking (no unmasked digits), Arabic shaping and RTL, safe zones, caption sync.

## Rebuild from scratch

Renders, audio, captures and copied logos are not in git. From `promo-video/` (needs Node, ffmpeg, Microsoft Edge, and `PROMO_EMAIL`, `PROMO_PASSWORD`, `ELEVEN_LABS_API_KEY` in `../.env.local`):

1. `npm install` (approve esbuild's install script if npm asks: `npm install-scripts approve esbuild`).
2. `node scripts/capture.mjs all`: read-only, masked captures of velaos.co into `public/captures/`.
3. `VOICE_ID=HKFOb9iktHA85uKXydRT node scripts/tts.mjs en 1` and `... ar 1` (counts characters against a 5,000 budget in `public/audio/ledger.json`), then copy the chosen takes to `public/audio/vo-en.mp3` and `vo-ar.mp3`.
4. `node scripts/build-timeline.mjs en <take>` and `... ar <take>` (cuts and captions from the voice timing).
5. `node scripts/make-sfx.mjs`, and copy `../public/assets/logo-full.png` to `public/brand/`.
6. `node scripts/render.mjs en` and `... ar`, then `node scripts/qa.mjs en` and `... ar`.
