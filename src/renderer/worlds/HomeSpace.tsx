// HomeSpace — R3F layer is now ambient-only.
// The primary home interaction lives in the DOM orbital overlay (HomeOrbital + CoreVisualDom)
// to match the Google AI Studio prototype. Keep R3F light to avoid double-core.
import CoverParticleField from './CoverParticleField';

export default function HomeSpace() {
  return (
    <group>
      <CoverParticleField />
    </group>
  );
}
