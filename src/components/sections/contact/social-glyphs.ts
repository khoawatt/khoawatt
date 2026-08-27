import type { SocialPlatform } from "@/content/contact";

interface StrokeShape {
  readonly tag: "path" | "rect" | "circle" | "line";
  readonly attrs: Readonly<Record<string, string>>;
}

type SocialGlyph =
  | { readonly kind: "stroke"; readonly shapes: ReadonlyArray<StrokeShape> }
  | { readonly kind: "fill"; readonly path: string };

export type { SocialGlyph };

/**
 * Lucide glyphs (ISC license) matching the mdrakibali.me reference, plus the
 * official X mark (Simple Icons, CC0) rendered filled.
 */
export const socialGlyphs: Readonly<Record<SocialPlatform, SocialGlyph>> = {  facebook: {
    kind: "stroke",
    shapes: [
      {
        attrs: {
          d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
        },
        tag: "path",
      },
    ],
  },
  github: {
    kind: "stroke",
    shapes: [
      {
        attrs: {
          d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
        },
        tag: "path",
      },
      { attrs: { d: "M9 18c-4.51 2-5-2-7-2" }, tag: "path" },
    ],
  },
  instagram: {
    kind: "stroke",
    shapes: [
      {
        attrs: { height: "20", rx: "5", ry: "5", width: "20", x: "2", y: "2" },
        tag: "rect",
      },
      {
        attrs: {
          d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",
        },
        tag: "path",
      },
      { attrs: { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5" }, tag: "line" },
    ],
  },
  linkedin: {
    kind: "stroke",
    shapes: [
      {
        attrs: {
          d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",
        },
        tag: "path",
      },
      { attrs: { height: "12", width: "4", x: "2", y: "9" }, tag: "rect" },
      { attrs: { cx: "4", cy: "4", r: "2" }, tag: "circle" },
    ],
  },
  thread: {
    kind: "fill",
    path:
      "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z",
  },
  x: {
    kind: "fill",
    path:
      "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  },
};

/**
 * Lucide glyphs (ISC license) for the contact-detail rows: mail, phone and
 * map-pin, keyed by `ContactDetailView.id`.
 */
export const detailGlyphs: Readonly<Record<string, SocialGlyph>> = {
  email: {
    kind: "stroke",
    shapes: [
      {
        attrs: {
          height: "16",
          rx: "2",
          width: "20",
          x: "2",
          y: "4",
        },
        tag: "rect",
      },
      {
        attrs: { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" },
        tag: "path",
      },
    ],
  },
  location: {
    kind: "stroke",
    shapes: [
      {
        attrs: { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" },
        tag: "path",
      },
      { attrs: { cx: "12", cy: "10", r: "3" }, tag: "circle" },
    ],
  },
  phone: {
    kind: "stroke",
    shapes: [
      {
        attrs: {
          d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
        },
        tag: "path",
      },
    ],
  },
};
