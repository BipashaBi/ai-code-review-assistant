const STYLES = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  error: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export default function SeverityBadge({ severity }) {
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-xs ${STYLES[severity] || STYLES.info}`}>
      {severity}
    </span>
  );
}
