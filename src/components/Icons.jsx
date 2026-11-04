import { h } from 'preact';

export function CrackedIcon({ size = 24, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      className={className}
      style={{ verticalAlign: 'middle', display: 'inline-block' }}
    >
      <rect x="8" y="8" width="240" height="240" rx="56" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="12" />
      <path d="M128 38c-44 0-74 52-74 104 0 44 32 76 74 76s74-32 74-76c0-52-30-104-74-104z" fill="#FFC81E" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
      <path d="M60 128l26-12 14 18 20-22 16 20 18-16 22 14 20-8" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="102" cy="160" r="8" fill="currentColor" />
      <circle cx="156" cy="156" r="8" fill="currentColor" />
      <path d="M104 190c10 4 38 4 50-2" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M100 186l-6-8M100 186l-8 4M156 186l6-8M156 186l8 4" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function BaseSvg({ size = 20, children, className = '', style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ verticalAlign: 'middle', display: 'inline-block', ...style }}
    >
      {children}
    </svg>
  );
}

export function NotebookIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-11a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1m3 0v18" />
      <path d="M13 8l2 0" />
      <path d="M13 12l2 0" />
    </BaseSvg>
  );
}

export function ScriptIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M17 20h-11a3 3 0 0 1 0 -6h11a3 3 0 0 0 0 6h1a3 3 0 0 0 3 -3v-11a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v8" />
    </BaseSvg>
  );
}

export function ChartIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M4 19l16 0" />
      <path d="M4 15l4 -6l4 2l4 -5l4 4" />
    </BaseSvg>
  );
}

export function HomeIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
      <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
    </BaseSvg>
  );
}

export function EyeIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
    </BaseSvg>
  );
}

export function EyeOffIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
      <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" />
      <path d="M3 3l18 18" />
    </BaseSvg>
  );
}

export function SunIcon(props) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
    </BaseSvg>
  );
}

export function MoonIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
    </BaseSvg>
  );
}

export function VolumeIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M15 8a5 5 0 0 1 0 8" />
      <path d="M17.7 5a9 9 0 0 1 0 14" />
      <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
    </BaseSvg>
  );
}

export function VolumeOffIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
      <path d="M16 10l4 4m0 -4l-4 4" />
    </BaseSvg>
  );
}

export function LinkIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M9 15l6 -6" />
      <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
      <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
    </BaseSvg>
  );
}

export function ClockIcon(props) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </BaseSvg>
  );
}

export function PlusIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </BaseSvg>
  );
}

export function PencilIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
      <path d="M13.5 6.5l4 4" />
    </BaseSvg>
  );
}

export function TrashIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M4 7l16 0" />
      <path d="M10 11l0 6" />
      <path d="M14 11l0 6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
      <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
    </BaseSvg>
  );
}

export function XIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </BaseSvg>
  );
}

export function CheckIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M5 12l5 5l10 -10" />
    </BaseSvg>
  );
}

export function CircleCheckIcon(props) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2l4 -4" />
    </BaseSvg>
  );
}

export function CircleIcon(props) {
  return (
    <BaseSvg {...props}>
      <circle cx="12" cy="12" r="9" />
    </BaseSvg>
  );
}

export function CopyIcon(props) {
  return (
    <BaseSvg {...props}>
      <rect x="7" y="7" width="14" height="14" rx="2.667" />
      <path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1" />
    </BaseSvg>
  );
}

export function ClipboardIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </BaseSvg>
  );
}

export function DownloadIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
      <path d="M7 11l5 5l5 -5" />
      <path d="M12 4l0 12" />
    </BaseSvg>
  );
}

export function UploadIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
      <path d="M7 9l5 -5l5 5" />
      <path d="M12 4l0 12" />
    </BaseSvg>
  );
}

export function SparklesIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
    </BaseSvg>
  );
}

export function MicIcon(props) {
  return (
    <BaseSvg {...props}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M8 21l8 0" />
      <path d="M12 17l0 4" />
    </BaseSvg>
  );
}

export function StopIcon(props) {
  return (
    <BaseSvg {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </BaseSvg>
  );
}

export function UndoIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M9 14l-4 -4l4 -4" />
      <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
    </BaseSvg>
  );
}

export function RefreshIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </BaseSvg>
  );
}

export function SitemapIcon(props) {
  return (
    <BaseSvg {...props}>
      <rect x="3" y="15" width="6" height="6" rx="2" />
      <rect x="15" y="15" width="6" height="6" rx="2" />
      <rect x="9" y="3" width="6" height="6" rx="2" />
      <path d="M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1" />
      <path d="M12 9l0 3" />
    </BaseSvg>
  );
}

export function BookmarkIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" />
    </BaseSvg>
  );
}

export function StarIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
    </BaseSvg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <BaseSvg {...props}>
      <path d="M5 12l14 0" />
      <path d="M13 18l6 -6" />
      <path d="M13 6l6 6" />
    </BaseSvg>
  );
}
