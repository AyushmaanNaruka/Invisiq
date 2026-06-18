// InvisiQ brand logo — inlined from assets/invisiq-mark.svg + assets/invisiq-wordmark.svg
// Inlined as React SVG so the renderer has no asset-path/bundling dependency.

interface MarkProps {
  size?: number;
  className?: string;
}

/** The standalone InvisiQ mark — rounded dark square with the teal mascot. */
export function InvisiQMark({ size = 64, className = '' }: MarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="InvisiQ"
      className={className}
    >
      <rect width="64" height="64" rx="15" fill="#0c0c12" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" stroke="#ffffff" strokeOpacity="0.1" />
      <g transform="translate(8 7) scale(2)">
        <path d="M4 11a8 8 0 0 1 16 0v9l-2.5-1.5L15 20l-3-1.5L9 20l-2.5-1.5L4 20z" fill="#2ee5c5" />
        <circle cx="9.5" cy="11" r="1.5" fill="#0c0c12" />
        <circle cx="14.5" cy="11" r="1.5" fill="#0c0c12" />
      </g>
    </svg>
  );
}

/**
 * The bare InvisiQ ghost mascot — no rounded-square background, transparent canvas.
 * Use on surfaces that already have their own background (e.g. the empty-state hero)
 * so the mark doesn't read as a pasted-on card.
 */
export function InvisiQGhost({ size = 64, className = '' }: MarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="3 2 18 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="InvisiQ"
      className={className}
    >
      <path d="M4 11a8 8 0 0 1 16 0v9l-2.5-1.5L15 20l-3-1.5L9 20l-2.5-1.5L4 20z" fill="#2ee5c5" />
      <circle cx="9.5" cy="11" r="1.5" fill="#0c0c12" />
      <circle cx="14.5" cy="11" r="1.5" fill="#0c0c12" />
    </svg>
  );
}

interface WordmarkProps {
  height?: number;
  className?: string;
}

/** The full InvisiQ wordmark — mark + "InvisiQ" text. */
export function InvisiQWordmark({ height = 32, className = '' }: WordmarkProps): JSX.Element {
  const width = (height * 240) / 64;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="InvisiQ"
      className={className}
    >
      <rect width="64" height="64" rx="15" fill="#0c0c12" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" stroke="#ffffff" strokeOpacity="0.1" />
      <g transform="translate(8 7) scale(2)">
        <path d="M4 11a8 8 0 0 1 16 0v9l-2.5-1.5L15 20l-3-1.5L9 20l-2.5-1.5L4 20z" fill="#2ee5c5" />
        <circle cx="9.5" cy="11" r="1.5" fill="#0c0c12" />
        <circle cx="14.5" cy="11" r="1.5" fill="#0c0c12" />
      </g>
      <text
        x="82"
        y="41"
        fontFamily="'Inter Tight', 'Inter', system-ui, sans-serif"
        fontSize="30"
        fontWeight="600"
        letterSpacing="-0.5"
        fill="#f4f4f6"
      >
        InvisiQ
      </text>
    </svg>
  );
}
