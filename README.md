# Hot Dog / Not Hot Dog

Paste, drop, or choose a photo, preview its ASCII representation, and ask **Jev** whether it depicts a hot dog. The page displays the actual hot-dog probability; values of 50% or above produce “Hot dog”.

Built with React, TypeScript, Vinext, Cloudflare Workers, and [asciify-engine](https://github.com/ayangabryl/asciify-engine) (MIT).

## Quick start

Requires **Node.js 24+**, npm, and a [TypeSafe/Jev API key](https://docs.typesafe.ai/).

```sh
git clone https://github.com/SysCoder/HotdogNotHotdog.git
cd HotdogNotHotdog
nvm use # optional, if you use nvm
npm ci
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and replace the placeholder with your key:

```dotenv
JEV_API_KEY=your-key-here
```

Then start the development server and open the local URL printed in the terminal:

```sh
npm run dev
```

Never commit `.dev.vars`. It is excluded from Git and the source archive. No real key is included in this repository, its history, or the built app.

## How it works

1. The browser converts the image to a bounded, monochrome ASCII grid using `asciify-engine`.
2. Pressing **Hot dog or not?** sends the grid to the server's `/api/classify` route.
3. The server calls Jev's [System One API](https://docs.typesafe.ai/api) with five labeled ASCII references and a separate `target_ascii` field.
4. Jev returns a yes/no probability. The server validates it and the page displays the result. Service errors are displayed as errors, never as “not hot dog”.

The original photo, filename, and image bytes stay in the browser. Only the ASCII grid and fixed references go to Jev. The app does not persist uploads or results. The API key stays on the server.

## Context examples and limitations

`lib/hotdog-examples.ts` contains four supplied hot dogs plus a mirrored variant of the first. Instructions in `lib/classify.ts` identify the text as an ASCII rendering and tell Jev to evaluate only the target, not the reference labels.

This is an experiment in ASCII recognition, not a validated vision classifier. The original prompt misclassified a recognizable hot dog. Adding examples improved recognition of those references, but they are not held-out test cases and do not establish accuracy on unseen photos. A solid-square control was classified as not a hot dog.

## Development checks

```sh
npm run check # type checking, authored-code lint, and API tests
npm run build
```

GitHub Actions runs both commands without needing a Jev key. API tests mock the provider and cover positive/negative results, invalid input, cross-origin requests, missing configuration, invalid provider responses, and network errors.

`npm run lint` also scans the generated UI catalog and currently reports pre-existing starter errors. `npm run lint:app` checks the authored app, server, and tests.

## Production

The app needs a server runtime; GitHub Pages alone cannot run its API route. `npm run build` produces a Cloudflare Worker and client assets. `npm start` previews that build locally.

This checkout retains its existing Sites project configuration in `.openai/hosting.json`. The ID is not a secret. Configure `JEV_API_KEY` as a server secret through Sites when deploying this project. If creating a separate Site, use its own generated project configuration rather than deploying to this project's ID.

The existing deployment is owner-private. Before widening access, add durable rate limiting and review who can trigger requests against your API key.

## Third-party licensing

The ASCII library is MIT-licensed; its notice is retained in [public/asciify-engine-LICENSE.txt](public/asciify-engine-LICENSE.txt). Other dependencies retain their respective licenses. This repository does not add a blanket license for the supplied images or their ASCII representations.
