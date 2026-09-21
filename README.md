# Hot Dog / Not Hot Dog

A private Sites app that converts a pasted, dropped, or selected photo into ASCII in the browser using [asciify-engine](https://github.com/ayangabryl/asciify-engine) (MIT), then sends that text to [Jev's System One API](https://docs.typesafe.ai/api) for a yes/no probability. A probability of 0.5 or above displays “Hot dog”.

## Run locally

Use Node 22.13+ (Node 24 recommended):

```sh
npm install
# Put JEV_API_KEY=your-key in .dev.vars (ignored by Git).
npm run dev
```

The API key is server-only. Hosted deployments use the `JEV_API_KEY` Sites secret. The original file, filename, and image bytes are never sent to Jev; only the ASCII text is sent when the user presses the check button. No images or results are persisted.

## Validation

```sh
npm test
npm run typecheck
npx oxlint app lib tests
npm run build
```

The starter's full `npm run lint` reports pre-existing errors in its generated UI components and hook; authored app, server, and test code pass targeted lint. Conversion was also exercised against native Canvas with square, landscape, and portrait inputs; the text grid remains bounded and preserves character aspect ratio.

The live Jev request succeeds with the supplied key. Jev returned 22% hot-dog probability for the user's supplied ASCII example, misclassifying that example. This is an ASCII-recognition experiment, not a validated vision classifier. The UI exposes Jev's actual probability, flags close calls, and never converts API failures into negative classifications.

The server restricts input size and characters, rejects cross-origin browser requests, bounds upstream duration, and validates Jev's response. Deployment remains owner-private; review access and add durable rate limiting before sharing broadly.

Third-party license: [asciify-engine MIT notice](public/asciify-engine-LICENSE.txt).

## Labeled context examples

Each request now includes three server-owned positive references in `state.reference_examples`: the user's first ASCII hot dog, the user's second ASCII hot dog with topping, and a horizontal mirror of the first. The new image is isolated in `state.target_ascii`, and the question explicitly evaluates only that target. No user-supplied label controls the verdict.

After this change, live smoke checks returned 90% and 88% for the two reference images and 5% for a solid-square control. These positives are in-context references, not held-out accuracy measurements; recognition of unseen photos is still unvalidated.
