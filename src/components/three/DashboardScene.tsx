"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

function DashboardPanel() {
  const group = useRef<THREE.Group>(null!);
  const { mouse } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 0.4) * 0.06;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.x * 0.2, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.y * 0.1 - 0.1, 0.04);
  });

  return (
    <group ref={group}>
      {/* Main dashboard body */}
      <RoundedBox args={[6, 3.8, 0.08]} radius={0.12} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1A0A00" roughness={0.2} metalness={0.1} />
      </RoundedBox>

      {/* Sidebar strip */}
      <RoundedBox args={[1.1, 3.8, 0.09]} radius={0.08} smoothness={4} position={[-2.45, 0, 0.005]}>
        <meshStandardMaterial color="#130700" roughness={0.3} />
      </RoundedBox>

      {/* Top header bar */}
      <mesh position={[0.55, 1.65, 0.05]}>
        <planeGeometry args={[4.7, 0.35]} />
        <meshBasicMaterial color="#221000" />
      </mesh>

      {/* KPI card 1 */}
      <RoundedBox args={[1.05, 0.72, 0.04]} radius={0.05} smoothness={4} position={[-0.9, 0.7, 0.06]}>
        <meshStandardMaterial color="#2a1200" roughness={0.4} />
      </RoundedBox>
      <Text position={[-0.9, 0.9, 0.09]} fontSize={0.09} color="#FF6B35" anchorX="center" anchorY="middle">12</Text>
      <Text position={[-0.9, 0.76, 0.09]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">New Leads</Text>

      {/* KPI card 2 */}
      <RoundedBox args={[1.05, 0.72, 0.04]} radius={0.05} smoothness={4} position={[0.25, 0.7, 0.06]}>
        <meshStandardMaterial color="#2a1200" roughness={0.4} />
      </RoundedBox>
      <Text position={[0.25, 0.9, 0.09]} fontSize={0.09} color="#FF3366" anchorX="center" anchorY="middle">8</Text>
      <Text position={[0.25, 0.76, 0.09]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">Booked</Text>

      {/* KPI card 3 */}
      <RoundedBox args={[1.05, 0.72, 0.04]} radius={0.05} smoothness={4} position={[1.4, 0.7, 0.06]}>
        <meshStandardMaterial color="#2a1200" roughness={0.4} />
      </RoundedBox>
      <Text position={[1.4, 0.9, 0.09]} fontSize={0.09} color="#FF6B35" anchorX="center" anchorY="middle">48s</Text>
      <Text position={[1.4, 0.76, 0.09]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">Avg Reply</Text>

      {/* Conversations list */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-0.9 + i * 0.05, -0.1 - i * 0.38, 0.06]}>
          <mesh>
            <planeGeometry args={[3.3, 0.28]} />
            <meshBasicMaterial color="#221000" transparent opacity={0.8} />
          </mesh>
          <Text position={[-1.45, 0.05, 0.02]} fontSize={0.07} color="#FF6B35" anchorX="left" anchorY="middle">
            {["📩 Instagram", "💬 WhatsApp", "🌐 Website"][i]}
          </Text>
          <Text position={[-0.1, -0.04, 0.02]} fontSize={0.055} color="#888888" anchorX="left" anchorY="middle">
            {["Ahmed Al-Rashid · 2m ago", "Sara K. · 8m ago", "New visitor · 12m ago"][i]}
          </Text>
        </group>
      ))}

      {/* Chart bars at bottom */}
      {[0.3, 0.5, 0.7, 0.4, 0.8, 0.6, 0.9].map((h, i) => (
        <mesh key={i} position={[0.4 + i * 0.36, -1.35 + h * 0.25, 0.06]}>
          <planeGeometry args={[0.22, h * 0.5]} />
          <meshBasicMaterial
            color={i === 6 ? "#FF6B35" : "#FF6B35"}
            transparent
            opacity={0.3 + h * 0.4}
          />
        </mesh>
      ))}

      {/* Sidebar nav items */}
      {["Dash", "Chat", "CRM", "Book", "Site"].map((label, i) => (
        <group key={label} position={[-2.45, 1.1 - i * 0.52, 0.06]}>
          <mesh>
            <planeGeometry args={[0.9, 0.3]} />
            <meshBasicMaterial
              color={i === 0 ? "#FF6B35" : "#221000"}
              transparent
              opacity={i === 0 ? 0.25 : 0.5}
            />
          </mesh>
          <Text fontSize={0.07} color={i === 0 ? "#FF6B35" : "#888888"} anchorX="center" anchorY="middle">
            {label}
          </Text>
        </group>
      ))}

      {/* Glow */}
      <pointLight position={[0, 0, 2]} color="#FF6B35" intensity={0.6} distance={6} />
      <pointLight position={[3, 2, 2]} color="#FF3366" intensity={0.3} distance={5} />

      {/* Drop shadow plane */}
      <mesh position={[0, -2.4, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 3]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

export default function DashboardScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <DashboardPanel />
    </Canvas>
  );
}
