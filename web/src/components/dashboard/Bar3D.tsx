import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

interface Bar3DChartProps {
  data: { label: string; value: number }[];
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const group = useRef<THREE.Group>(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <group ref={group}>
      {data.map((d, i) => {
        const height = (d.value / max) * 2;
        const x = (i - data.length / 2 + 0.5) * 0.8;
        return (
          <group key={i} position={[x, 0, 0]}>
            <RoundedBox
              args={[0.5, height, 0.5]}
              radius={0.05}
              position={[0, height / 2, 0]}
            >
              <meshStandardMaterial
                color="#8b5cf6"
                metalness={0.4}
                roughness={0.3}
                transparent
                opacity={0.85}
              />
            </RoundedBox>
            <Text
              position={[0, -0.25, 0]}
              fontSize={0.12}
              color="#a78bfa"
              anchorX="center"
              anchorY="top"
            >
              {d.label}
            </Text>
            <Text
              position={[0, height + 0.15, 0]}
              fontSize={0.12}
              color="white"
              anchorX="center"
            >
              {String(d.value)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export default function Bar3DChart({ data }: Bar3DChartProps) {
  return (
    <div className="h-64 w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <Bars data={data} />
      </Canvas>
    </div>
  );
}
