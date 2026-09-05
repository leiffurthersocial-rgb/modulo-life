import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';

const ICON = { good: '🎉', bad: '💢', info: 'ℹ️' } as const;

export default function ResultPanel() {
  const result = useUiStore((s) => s.result);
  const close = useUiStore((s) => s.closePanel);
  if (!result) return null;

  return (
    <div className="overlay">
      <Panel
        title={result.title}
        icon={ICON[result.tone]}
        width="narrow"
        footer={
          <button className="btn primary" onClick={close} autoFocus>
            Continue
          </button>
        }
      >
        <div className="col">
          {result.lines.map((line, i) => (
            <p key={i} style={{ margin: 0, lineHeight: 1.6 }}>
              {line}
            </p>
          ))}
        </div>
      </Panel>
    </div>
  );
}
