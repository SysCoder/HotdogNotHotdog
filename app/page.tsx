'use client';
/* Local blob URLs must remain in the browser, without an image optimization server. */
/* oxlint-disable next/no-img-element */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ClipboardPaste, ImagePlus, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Verdict = { isHotDog: boolean; probability: number; model: string; elapsedMs: number };
type Photo = { url: string; name: string };

export default function Home() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [ascii, setAscii] = useState('');
  const [example, setExample] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState<'converting' | 'checking' | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const photoUrl = useRef<string | null>(null);
  useEffect(() => {
    fetch('/example.txt').then(r => r.ok ? r.text() : '').then(setExample).catch(() => {});
    // These refs intentionally track the latest request and blob for unmount cleanup.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    return () => { generation.current++; controller.current?.abort(); if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); };
  }, []);

  const load = useCallback(async (file: File) => {
    const id = ++generation.current;
    controller.current?.abort(); setVerdict(null); setError(''); setAscii('');
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null; setPhoto(null);
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setBusy(null); setError('Choose a PNG, JPG, WebP, or GIF image.'); return;
    }
    if (file.size > 15 * 1024 * 1024) { setBusy(null); setError('Choose an image smaller than 15 MB.'); return; }
    const url = URL.createObjectURL(file); photoUrl.current = url;
    setPhoto({ url, name: file.name || 'Pasted image' }); setBusy('converting');
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (id !== generation.current) return;
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Choose an image under 40 megapixels.');
      const { imageToAsciiTextFrame, DEFAULT_OPTIONS } = await import('asciify-engine');
      if (id !== generation.current) return;
      const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser could not read this image.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const frame = imageToAsciiTextFrame(canvas, { ...DEFAULT_OPTIONS, fontSize: Math.max(canvas.width / 110, canvas.height / 160, 1), charSpacing: 1, charset: ' .:-=+*#%@', invert: true, contrast: 0.12, charAspect: 0.5 }, canvas.width, canvas.height);
      const text = frame.rows.join('\n');
      if (text.length > 20_000) throw new Error('This image is too tall. Try cropping it first.');
      setAscii(text);
    } catch (e) {
      if (id === generation.current) { setError(e instanceof Error ? e.message : 'Could not read this image.'); setPhoto(null); }
    } finally { if (id === generation.current) setBusy(null); }
  }, []);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      const file = item?.getAsFile(); if (file) { event.preventDefault(); void load(file); }
    };
    window.addEventListener('paste', paste); return () => window.removeEventListener('paste', paste);
  }, [load]);

  async function check() {
    if (!ascii || busy) return;
    const id = generation.current; const abort = new AbortController(); controller.current = abort;
    setBusy('checking'); setVerdict(null); setError('');
    try {
      const response = await fetch('/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ascii }), signal: abort.signal });
      const data = await response.json() as Verdict & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Something went wrong. Try again.');
      if (id === generation.current) setVerdict(data);
    } catch (e) { if (id === generation.current && !abort.signal.aborted) setError(e instanceof Error ? e.message : 'Could not check this image.'); }
    finally { if (id === generation.current) setBusy(null); }
  }

  function reset() {
    generation.current++; controller.current?.abort();
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); photoUrl.current = null;
    setPhoto(null); setAscii(''); setVerdict(null); setError(''); setBusy(null);
  }

  return <main>
    <header className="topbar"><Link href="/" className="wordmark">HD<span>/</span>NHD<span className="brand-dot">.</span></Link><span className="experiment"><span /> THE ASCII EXPERIMENT</span></header>
    <section className="intro"><div><p className="eyebrow">ONE VERY IMPORTANT QUESTION</p><h1>Hot dog<span className="slash"> / </span><br className="mobile-break" />not hot dog<span className="brand-dot">?</span></h1></div><p className="intro-note">A photo becomes characters.<br />Jev makes the call.</p></section>
    <section className="workspace" aria-label="Hot dog classifier">
      <div className="image-panel"><div className="panel-title"><span><b>01</b> THE PHOTO</span>{photo && <Button variant="ghost" onClick={reset} aria-label="Clear image"><X /></Button>}</div>
        <div className={`dropzone ${dragging ? 'dragging' : ''} ${photo ? 'has-photo' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) void load(file); }}>
          {photo ? <><img className="photo" src={photo.url} alt="Your selection for classification" /><Button className="replace" variant="secondary" onClick={() => input.current?.click()}><RotateCcw /> Change image</Button></> : <div className="upload-content"><div className="paste-icon"><ClipboardPaste size={34} strokeWidth={1.5} /></div><h2>Paste your picture here.</h2><p>Press <kbd>⌘</kbd> + <kbd>V</kbd> on Mac, or <kbd>Ctrl</kbd> + <kbd>V</kbd><br />or drop an image anywhere in this box.</p><Button className="choose-button" variant="outline" onClick={() => input.current?.click()}><ImagePlus /> Choose an image</Button><span className="file-hint">JPG, PNG, WEBP, GIF · UP TO 15 MB</span></div>}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Choose an image" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void load(file); e.target.value = ''; }} />
        </div><div className="panel-foot">{photo ? photo.name : 'Your photo stays in your browser.'}</div>
      </div>
      <div className="ascii-panel"><div className="panel-title"><span><b>02</b> WHAT JEV SEES</span><span className="text-tag">PLAIN TEXT</span></div><div className="ascii-stage"><pre aria-hidden="true" style={{ fontSize: `min(${90 / (Math.max(...(ascii || example || " ").split("\n").map(row => row.length)) * 0.6)}cqw, ${86 / ((ascii || example || " ").split("\n").length * 1.2)}cqh)` }} className={!ascii ? 'example-art' : ''}>{ascii || example}</pre>{!ascii && <span className="example-label">{busy === 'converting' ? 'CONVERTING YOUR IMAGE…' : 'SAMPLE ASCII · YOUR IMAGE GOES HERE'}</span>}</div><div className="panel-foot"><span>{ascii ? `${ascii.split('\n')[0].length} columns · ${ascii.split('\n').length} rows` : 'Pixels → characters → a decision'}</span><span className="ascii-mark">. : + # @</span></div></div>
    </section>
    <section className={`decision-row ${verdict ? verdict.isHotDog ? 'positive' : 'negative' : ''}`} aria-live="polite" aria-atomic="true">
      <div className="decision-copy">{verdict ? <><p className="eyebrow">JEV’S VERDICT</p><h2>{verdict.isHotDog ? <Check /> : <X />}{verdict.isHotDog ? 'Hot dog.' : 'Not hot dog.'}</h2><p>{(verdict.probability * 100).toFixed(1)}% hot-dog probability{verdict.probability > 0.3 && verdict.probability < 0.7 ? ' · A close call.' : ''}</p></> : <><p className="eyebrow">THE MOMENT OF TRUTH</p><h2>{busy === 'converting' ? 'Turning pixels into text…' : busy === 'checking' ? 'Jev is taking a look…' : ascii ? 'Ready for the verdict.' : 'First, give us something to judge.'}</h2><p>Only the ASCII art is sent to Jev when you check.</p></>}</div>
      <Button className="check-button" disabled={!ascii || !!busy} onClick={check}>{busy ? <LoaderCircle className="spin" /> : null}{busy === 'checking' ? 'Asking Jev' : verdict ? 'Check again' : 'Hot dog or not?'}{!busy && <ArrowRight />}</Button>
    </section>
    {error && <div role="alert" className="error"><X size={18} />{error}</div>}
    <footer><p>An experiment in recognizing pictures through text. Results can be wrong.</p><p><a href="https://github.com/ayangabryl/asciify-engine" target="_blank" rel="noreferrer">asciify-engine · MIT</a><span> / </span><a href="https://docs.typesafe.ai" target="_blank" rel="noreferrer">Powered by Jev ↗</a></p></footer>
  </main>;
}
