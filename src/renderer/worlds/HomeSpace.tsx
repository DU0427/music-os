import MusicCore from '../core/MusicCore';
import { useAudioStore } from '../audio/store';
import { useRuntimeStore } from '../store/runtime';
import SpatialPortal from './SpatialPortal';

export default function HomeSpace() {
  const requestSpace = useRuntimeStore((state) => state.requestSpace);
  const canEnterMidnight = useAudioStore((state) => Boolean(state.canPlay && state.track));
  const enterMidnight = () => {
    if (canEnterMidnight) {
      requestSpace('midnight');
    }
  };

  return (
    <group>
      <MusicCore onEnterWorld={enterMidnight} isActive />

      <SpatialPortal
        position={[-3, 1, -1]}
        color="#ffd27a"
        accent="#f5d89f"
        onActivate={enterMidnight}
        mode="enter"
        size={1}
      />

      <SpatialPortal
        position={[0, -1.4, -0.7]}
        color="#6ea8ff"
        accent="#dcecff"
        onActivate={enterMidnight}
        mode="enter"
        size={0.72}
      />
    </group>
  );
}
