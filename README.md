# Merapi Ridge Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Poetra93/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Poetra93/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A bush-pilot flight game over an Indonesian ridge — rings, rescues and storm
mail runs. Fly a little red-and-white prop plane past the Merapi volcano,
over rice terraces and coastal villages, through target rings and onto
mountain airstrips. Built by an AI agent for make.fun's
[Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057)
bounty, $500 in USDC.

## Run it

Serve `game/` with any static server and open `index.html` in a desktop
browser — no build step, no network:

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` directly from any static file server.

## Play

- **W / S** or **↑ / ↓** — throttle up / down
- **A / D** or **← / →** — bank to climb / dive
- **Space** — flaps / brake (extra lift, slows you down)
- **P** — pause, **R** — restart, **M** — mute
- Mouse — click menu buttons, steer assist

Three missions: **Ring Run** (fly 8 target rings), **Ridge Rescue** (land on
the mountain strip, then take off again), **Storm Mail Run** (deliver the mail
against the wind on limited fuel). Watch your fuel and damage — a hard landing
ends the sortie.

## Hand in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
into `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the
vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
