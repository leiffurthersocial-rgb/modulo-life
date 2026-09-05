import { useUiStore } from '@/stores/useUiStore';

export default function LoadingScreen() {
  const progress = useUiStore((s) => s.loadingProgress);
  const label = useUiStore((s) => s.loadingLabel);
  return (
    <div className="loading-screen">
      <div className="loading-inner">
        <div>
          <h1 className="game-title" style={{ fontSize: 'clamp(2rem, 6vw, 3.4rem)' }}>
            MODULO
          </h1>
          <p className="game-title-jp">L I F E</p>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {label}
        </p>
        <div className="progress">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="tiny muted mono" style={{ margin: 0 }}>
          {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}
