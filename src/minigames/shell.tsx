import type { ReactNode } from 'react';
import { Panel } from '@/ui/common/widgets';
import { formatMoney } from '@/game/systems/economy';
import { useGameStore } from '@/stores/useGameStore';

export function MinigameShell({
  title,
  icon,
  help,
  children,
  footer,
  onClose,
}: {
  title: string;
  icon: string;
  help?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const money = useGameStore((s) => s.state?.money ?? 0);
  return (
    <div className="overlay">
      <div className="minigame">
        <Panel
          title={title}
          icon={icon}
          onClose={onClose}
          footer={
            <>
              <span className="grow money-line">
                <span aria-hidden>💴</span>
                <span className="mono">{formatMoney(money)}</span>
              </span>
              {footer}
            </>
          }
        >
          {help && (
            <div className="callout" style={{ marginBottom: '0.9rem' }}>
              {help}
            </div>
          )}
          {children}
        </Panel>
      </div>
    </div>
  );
}

const STAKES = [100, 500, 1000, 5000];

export function StakePicker({
  stake,
  setStake,
  money,
  disabled,
}: {
  stake: number;
  setStake: (n: number) => void;
  money: number;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label>
        <span>Stake</span>
        <span className="muted mono">{formatMoney(stake)}</span>
      </label>
      <div className="seg" role="group" aria-label="Stake">
        {STAKES.map((s) => (
          <button
            key={s}
            className={s === stake ? 'on' : ''}
            disabled={disabled || money < s}
            onClick={() => setStake(s)}
          >
            {formatMoney(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
