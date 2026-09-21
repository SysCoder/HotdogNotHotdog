# 🌭 Hot Dog / Not Hot Dog

Inspired by the **“Not Hotdog” app from HBO’s Silicon Valley**. One very important question, answered in an unnecessarily roundabout way.

Paste a photo, turn it into ASCII art, and let [Jev](https://docs.typesafe.ai/) decide: **hot dog or not hot dog?**

**I know this isn’t what Jev is meant to do. I built it just for fun.** This is a playful experiment, not a serious image classifier or a benchmark of Jev’s capabilities. In my casual attempts, recognition didn’t seem to work successfully. I haven’t tested it rigorously, so I can’t draw conclusions about its accuracy.

## How it works

The browser converts your photo into text using [asciify-engine](https://github.com/ayangabryl/asciify-engine) (MIT). Jev receives that ASCII art alongside a few labeled examples and returns a hot-dog probability. The original photo stays in your browser, and your API key stays on the server.

## Run it locally

You’ll need **Node.js 24+** and a **Jev API key**.

```sh
git clone https://github.com/SysCoder/HotdogNotHotdog.git
cd HotdogNotHotdog
npm ci
cp .dev.vars.example .dev.vars
```

Set `JEV_API_KEY` in `.dev.vars`, then run:

```sh
npm run dev
```

Open the local URL printed in the terminal. `.dev.vars` is ignored by Git—keep your key there.

## Development

Built with React, TypeScript, Vinext, and Cloudflare Workers.

```sh
npm run check
npm run build
```

The app needs a server runtime; GitHub Pages alone won’t run the Jev API route. The existing Sites configuration is in `.openai/hosting.json`; use your own project configuration if deploying a separate copy.

## License

[MIT](LICENSE). Third-party dependencies retain their respective licenses.
