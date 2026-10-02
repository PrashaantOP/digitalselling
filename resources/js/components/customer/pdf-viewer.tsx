import { Loader2, Minus, Plus } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

/*
 * PDF ko page ke andar hi dikhata hai (pdf.js se canvas pe) — browser ka apna viewer nahi, isliye koi
 * download/print button nahi aata aur phone pe bhi chalta hai (wahan iframe wala PDF seedha download ho jaata hai).
 * Library tabhi load hoti hai jab koi notes lesson khulta hai.
 */

const ZOOMS = [1, 1.5, 2, 3];

async function loadPdf(url: string): Promise<PDFDocumentProxy> {
    const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

    return pdfjs.getDocument({ url, withCredentials: true }).promise;
}

export function PdfViewer({ url, title }: { url: string; title: string }) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [failed, setFailed] = useState(false);
    const [zoom, setZoom] = useState(0);
    // pehle page ka anupaat — baaki pages ki jagah usi se pehle se bani rehti hai (scroll uchhle nahi)
    const [ratio, setRatio] = useState(1.414);

    useEffect(() => {
        let alive = true;
        let loaded: PDFDocumentProxy | null = null;
        setPdf(null);
        setFailed(false);

        loadPdf(url)
            .then(async (doc) => {
                loaded = doc;
                if (!alive) return void doc.loadingTask.destroy();

                const first = (await doc.getPage(1)).getViewport({ scale: 1 });
                if (!alive) return;
                setRatio(first.height / first.width);
                setPdf(doc);
            })
            .catch(() => alive && setFailed(true));

        return () => {
            alive = false;
            void loaded?.loadingTask.destroy();
        };
    }, [url]);

    if (failed) {
        return <p className="rounded-xl bg-[#FFEDE8] p-4 text-sm font-medium text-[#C2410C]">Could not open this file. Refresh the page and try again.</p>;
    }

    if (!pdf) {
        return (
            <p className="flex items-center justify-center gap-2 rounded-xl bg-[#F6F5F2] py-16 text-sm text-[#8A8A96]">
                <Loader2 className="size-4 animate-spin" /> Opening {title}…
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#ECEBE6]">
            <div className="flex items-center justify-between gap-3 border-b border-[#E4E2DA] bg-white px-3 py-2">
                <p className="min-w-0 truncate text-xs font-semibold text-[#4B4B57]">
                    {title} · {pdf.numPages} {pdf.numPages === 1 ? 'page' : 'pages'}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} aria-label="Zoom out" className="flex size-8 items-center justify-center rounded-lg text-[#4B4B57] hover:bg-[#F6F5F2] disabled:opacity-40">
                        <Minus className="size-4" />
                    </button>
                    <span className="w-11 text-center text-xs font-semibold text-[#4B4B57] tabular-nums">{ZOOMS[zoom] * 100}%</span>
                    <button type="button" onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in" className="flex size-8 items-center justify-center rounded-lg text-[#4B4B57] hover:bg-[#F6F5F2] disabled:opacity-40">
                        <Plus className="size-4" />
                    </button>
                </div>
            </div>

            {/* zoom pe andar hi dono taraf scroll — poora page chauda nahi hota */}
            <div className="max-h-[78vh] overflow-auto p-2 sm:p-3" onContextMenu={(e) => e.preventDefault()}>
                <div className="mx-auto flex flex-col gap-2 sm:gap-3" style={{ width: `${ZOOMS[zoom] * 100}%` }}>
                    {Array.from({ length: pdf.numPages }, (_, i) => (
                        <PdfPage key={`${i}:${zoom}`} pdf={pdf} number={i + 1} ratio={ratio} />
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Ek page — tabhi banta hai jab scroll karte hue paas aaye (100 page ka PDF ek saath nahi banta). */
function PdfPage({ pdf, number, ratio }: { pdf: PDFDocumentProxy; number: number; ratio: number }) {
    const box = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const [near, setNear] = useState(false);
    const [drawn, setDrawn] = useState(false);
    const [pageRatio, setPageRatio] = useState(ratio);

    useEffect(() => {
        const el = box.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') return setNear(true);

        const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && (setNear(true), observer.disconnect()), { rootMargin: '600px 0px' });
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!near) return;
        let alive = true;
        let task: { cancel: () => void } | null = null;

        void (async () => {
            try {
                const page = await pdf.getPage(number);
                const target = canvas.current;
                const width = box.current?.clientWidth ?? 0;
                if (!alive || !target || width === 0) return;

                const base = page.getViewport({ scale: 1 });
                // tez screen pe saaf dikhe, par bahut bada canvas phone ki memory kha jaata hai
                const scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
                const viewport = page.getViewport({ scale });
                const context = target.getContext('2d');
                if (!context) return;

                target.width = Math.floor(viewport.width);
                target.height = Math.floor(viewport.height);
                setPageRatio(base.height / base.width);

                const render = page.render({ canvasContext: context, canvas: target, viewport });
                task = render;
                await render.promise;
                if (alive) setDrawn(true);
            } catch {
                // cancel (page hata) ya kharab page — khaali jagah rehne do
            }
        })();

        return () => {
            alive = false;
            task?.cancel();
        };
    }, [near, pdf, number]);

    return (
        <div ref={box} className="relative w-full overflow-hidden rounded bg-white shadow-sm" style={{ aspectRatio: `1 / ${pageRatio}` }}>
            <canvas ref={canvas} role="img" aria-label={`Page ${number}`} className="block size-full" />
            {!drawn && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-[#8A8A96]">
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Page {number}
                </span>
            )}
        </div>
    );
}

/** .txt notes — seedha text. */
export function TextFileViewer({ url }: { url: string }) {
    const [text, setText] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let alive = true;
        setText(null);
        setFailed(false);

        fetch(url, { credentials: 'same-origin' })
            .then((res) => (res.ok ? res.text() : Promise.reject(new Error('failed'))))
            .then((body) => alive && setText(body))
            .catch(() => alive && setFailed(true));

        return () => {
            alive = false;
        };
    }, [url]);

    if (failed) return <p className="rounded-xl bg-[#FFEDE8] p-4 text-sm font-medium text-[#C2410C]">Could not open this file. Refresh the page and try again.</p>;
    if (text === null) return <p className="rounded-xl bg-[#F6F5F2] py-10 text-center text-sm text-[#8A8A96]">Opening…</p>;

    return <pre className="max-h-[78vh] overflow-auto rounded-xl border border-[#E4E2DA] bg-[#FAFAF8] p-4 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap text-[#14141B]">{text}</pre>;
}
