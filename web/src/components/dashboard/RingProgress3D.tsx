import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

function Ring({ percent }: { percent: number }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.x = -0.3 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    group.current.rotation.z = state.clock.elapsedTime * 0.1;
  });

  const angle = (percent / 100) * Math.PI * 2;

  return (
    <group ref={group}>
      <mesh>
        <torusGeometry args={[1.2, 0.12, 16, 64]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.2, 0.14, 16, 64, angle]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#7c3aed"
          emissiveIntensity={0.4}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <Text position={[0, 0, 0]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">
        {`${percent}%`}
      </Text>
    </group>
  );
}

export default function RingProgress3D({ percent }: { percent: number }) {
  return (
    <div className="h-64 w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#a78bfa" />
        <Ring percent={percent} />
      </Canvas>
    </div>
  );
}
