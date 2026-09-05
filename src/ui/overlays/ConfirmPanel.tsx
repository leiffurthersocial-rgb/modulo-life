import { useUiStore } from '@/stores/useUiStore';
import { Panel } from '../common/widgets';
import { audio } from '@/game/audio/AudioManager';

export default function ConfirmPanel() {
  const confirm = useUiStore((s) => s.confirm);
  const close = useUiStore((s) => s.closePanel);
  if (!confirm) return null;

  return (
    <div className="overlay">
      <Panel
        title={confirm.title}
        width="narrow"
        footer={
          <>
            <button
              className="btn ghost"
              onClick={() => {
                audio.play('cancel');
                close();
              }}
            >
              {confirm.cancelLabel ?? 'Not now'}
            </button>
            <button
              className={`btn ${confirm.tone === 'bad' ? 'danger' : 'primary'}`}
              onClick={() => {
                audio.play('confirm');
                close();
                confirm.onConfirm();
              }}
            >
              {confirm.confirmLabel}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.6 }}>{confirm.body}</p>
      </Panel>
    </div>
  );
}
