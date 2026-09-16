'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import Globe from 'three-globe';
import { MeshPhongMaterial } from 'three';
import { feature } from 'topojson-client';
import countries110m from 'world-atlas/land-110m.json';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { useLibraryStore } from '../store/library';
import { buildFootprint, REGION_POINTS, type RegionPoint } from './globe-regions';
import type { ProviderRegionDensity } from '../../shared/music/providers';

interface DensityPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  playlistTotal: number;
  weight: number;
  color: string;
}

interface RingPoint {
  lat: number;
  lng: number;
  color: string;
  count: number;
  maxRadius: number;
  repeatPeriod: number;
}

interface JourneyArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  colors: [string, string];
}

/** 数据点 → 类型安全的取值器（three-globe 的 accessor 以 object 传入）。 */
const asDensity = (value: object) => value as DensityPoint;
const asRing = (value: object) => value as RingPoint;

/**
 * 音乐地球（R3F + three-globe）：
 * 深空黑球体 + 陆地六边形 + 各地区内容密度光点 + 你的聆听足迹（环脉冲 + 旅程弧线）。
 */
export default function GlobeWorld() {
  const tracks = useLibraryStore((s) => s.tracks);
  const history = useLibraryStore((s) => s.history);
  const [density, setDensity] = useState<ProviderRegionDensity[]>([]);
  const globeRef = useRef<Globe | null>(null);

  /* 地球在场景远端（z≈±300），而 Canvas 的雾（near 9 / far 22）会把整颗星球吞掉：
     进入地球空间时暂时移除雾，离开时恢复。 */
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const previousFog = scene.fog;
    scene.fog = null;
    return () => {
      scene.fog = previousFog;
    };
  }, [scene]);

  /* 拖拽旋转（带惯性；松手后自转恢复） */
  const gl = useThree((state) => state.gl);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, velocity: 0 });
  const rotationRef = useRef({ x: 0.04, y: 0 });
  useEffect(() => {
    const element = gl.domElement;
    const previousCursor = element.style.cursor;
    element.style.cursor = 'grab';

    const onDown = (event: PointerEvent) => {
      dragRef.current.active = true;
      dragRef.current.lastX = event.clientX;
      dragRef.current.lastY = event.clientY;
      dragRef.current.velocity = 0;
      element.style.cursor = 'grabbing';
    };
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current.active) {
        return;
      }
      const dx = event.clientX - dragRef.current.lastX;
      const dy = event.clientY - dragRef.current.lastY;
      dragRef.current.lastX = event.clientX;
      dragRef.current.lastY = event.clientY;
      rotationRef.current.y += dx * 0.006;
      rotationRef.current.x = Math.max(-0.7, Math.min(0.7, rotationRef.current.x + dy * 0.004));
      dragRef.current.velocity = dx * 0.006;
    };
    const onUp = () => {
      dragRef.current.active = false;
      element.style.cursor = 'grab';
    };

    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      element.style.cursor = previousCursor;
      element.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl]);

  useEffect(() => {
    if (typeof window.musicOS?.getNeteaseRegionDensity !== 'function') {
      return undefined;
    }
    let cancelled = false;
    window.musicOS
      .getNeteaseRegionDensity()
      .then((list) => {
        if (!cancelled) {
          setDensity(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDensity([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const globe = useMemo(
    () =>
      new Globe()
        .globeMaterial(
          new MeshPhongMaterial({
            color: '#0a0a0c',
            emissive: '#050507',
            shininess: 0.14,
            specular: '#16161c',
          }),
        )
        .showGraticules(true)
        .showAtmosphere(true)
        .atmosphereColor('#8dbbff')
        .atmosphereAltitude(0.15),
    [],
  );

  useEffect(() => {
    globeRef.current = globe;
    return () => {
      globeRef.current = null;
    };
  }, [globe]);

  /* 陆地：真实陆地轮廓（land-110m，无国界内部线，几何量约为 countries 的一半） */
  useEffect(() => {
    const topology = countries110m as unknown as Topology;
    const collection = feature(topology, topology.objects.land as GeometryCollection);
    globe
      .polygonsData(collection.features)
      .polygonCapColor(() => 'rgba(255,255,255,0.05)')
      .polygonSideColor(() => 'rgba(255,255,255,0.02)')
      .polygonStrokeColor(() => 'rgba(255,255,255,0.30)')
      .polygonAltitude(0.004)
      .polygonCapCurvatureResolution(7);
  }, [globe]);

  /* 内容密度光点（真实歌单总量） */
  useEffect(() => {
    const max = Math.max(1, ...density.map((item) => item.playlistTotal));
    const points: DensityPoint[] = density.map((item) => ({
      id: item.id,
      label: item.label,
      lat: item.lat,
      lng: item.lng,
      playlistTotal: item.playlistTotal,
      weight: item.playlistTotal / max,
      color: REGION_POINTS.find((region) => region.id === item.id)?.color ?? '#f5f5f7',
    }));
    globe
      .pointsData(points)
      .pointLat((value: object) => asDensity(value).lat)
      .pointLng((value: object) => asDensity(value).lng)
      .pointColor((value: object) => asDensity(value).color)
      // 贴面光碟（altitude 极低，避免变成「柱子」），大小随内容密度
      .pointAltitude(() => 0.006)
      .pointRadius((value: object) => 0.05 + asDensity(value).weight * 0.085)
      .pointResolution(14);
  }, [globe, density]);

  /* 你的足迹：在你听过的地区脉冲光环 + 聆听旅程弧线 */
  const footprint = useMemo(() => buildFootprint(tracks, history), [tracks, history]);
  useEffect(() => {
    const maxCount = Math.max(1, ...footprint.counts.map((entry) => entry.count));
    const rings: RingPoint[] = footprint.counts.map((entry) => ({
      lat: entry.region.lat,
      lng: entry.region.lng,
      color: entry.region.color,
      count: entry.count,
      maxRadius: 2.5 + (entry.count / maxCount) * 4.5,
      repeatPeriod: 900 + (1 - entry.count / maxCount) * 1400,
    }));
    globe
      .ringsData(rings)
      .ringLat((value: object) => asRing(value).lat)
      .ringLng((value: object) => asRing(value).lng)
      .ringMaxRadius((value: object) => asRing(value).maxRadius)
      .ringPropagationSpeed(1.4)
      .ringRepeatPeriod((value: object) => asRing(value).repeatPeriod)
      .ringColor((value: object) => (t: number) => {
        const alpha = Math.max(0, 1 - t);
        const ring = asRing(value);
        return `rgba(255,255,255,${(alpha * 0.55).toFixed(3)})`;
      });

    const arcs: JourneyArc[] = footprint.journeys.map((journey) => ({
      startLat: journey.from.lat,
      startLng: journey.from.lng,
      endLat: journey.to.lat,
      endLng: journey.to.lng,
      colors: [journey.from.color, journey.to.color] as [string, string],
    }));
    globe
      .arcsData(arcs)
      .arcStartLat((value: object) => (value as JourneyArc).startLat)
      .arcStartLng((value: object) => (value as JourneyArc).startLng)
      .arcEndLat((value: object) => (value as JourneyArc).endLat)
      .arcEndLng((value: object) => (value as JourneyArc).endLng)
      .arcColor((value: object) => (value as JourneyArc).colors)
      .arcDashLength(0.38)
      .arcDashGap(0.22)
      .arcDashAnimateTime(3400)
      .arcStroke(null);
  }, [globe, footprint]);

  /* 缓慢自转 + 拖拽旋转 + 惯性 */
  useFrame((_, delta) => {
    const instance = globeRef.current;
    if (!instance) {
      return;
    }
    const drag = dragRef.current;
    if (!drag.active) {
      rotationRef.current.y += delta * 0.045 + drag.velocity;
      drag.velocity *= 0.94;
      if (Math.abs(drag.velocity) < 0.0004) {
        drag.velocity = 0;
      }
    }
    instance.rotation.y = rotationRef.current.y;
    instance.rotation.x = rotationRef.current.x;
  });

  return <primitive object={globe} />;
}

export type { RegionPoint };
