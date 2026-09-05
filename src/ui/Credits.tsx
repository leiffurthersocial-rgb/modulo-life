import { useUiStore } from '@/stores/useUiStore';
import { Panel } from './common/widgets';

export default function Credits() {
  const setScreen = useUiStore((s) => s.setScreen);
  return (
    <div className="title-screen">
      <Panel
        title="Credits"
        icon="🌸"
        onClose={() => setScreen('menu')}
        footer={
          <button className="btn" onClick={() => setScreen('menu')}>
            Back to menu
          </button>
        }
      >
        <h3 style={{ marginTop: 0 }}>Modulo: Life</h3>
        <p className="muted">
          An original browser life-simulation set in the fictional neighbourhood of Hoshizaki. Every character,
          location and piece of writing here is original to this project.
        </p>

        <div className="section-title">Built with</div>
        <ul className="muted" style={{ lineHeight: 1.8, margin: 0, paddingLeft: '1.2rem' }}>
          <li>React and TypeScript for the interface</li>
          <li>Three.js for rendering</li>
          <li>Zustand for state</li>
          <li>Vite for the build</li>
        </ul>

        <div className="section-title">Assets</div>
        <p className="muted">
          There are no third-party art, audio or font assets in this game. Every building, character, prop and
          texture is generated procedurally from code at runtime, all sound is synthesised with the Web Audio API,
          and typography uses the reader&apos;s own system fonts. Nothing here carries an unclear licence.
        </p>

        <div className="section-title">A note on the gambling</div>
        <p className="muted">
          The basement games use in-game yen only. There are no purchases, no real currency, and no links to real
          gambling services. Every game shows its odds before you commit, and the house edge is documented in the
          project README.
        </p>
      </Panel>
    </div>
  );
}
