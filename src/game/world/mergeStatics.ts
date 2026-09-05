import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collapses the static world into one mesh per material.
 *
 * The neighbourhood is authored as thousands of small primitives, which is
 * pleasant to write but would be thousands of draw calls. Merging by material
 * brings that down to a few dozen and is the single biggest win for frame rate
 * on laptops and tablets. Anything that animates, glows on a timer or needs to
 * be hidden individually opts out with `userData.noMerge`.
 */
export function mergeStatics(root: THREE.Object3D): { meshes: THREE.Mesh[]; removed: number } {
  root.updateMatrixWorld(true);

  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const doomed: THREE.Mesh[] = [];

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (o.userData.noMerge) return;
    if (Array.isArray(o.material)) return;
    let anc: THREE.Object3D | null = o.parent;
    while (anc) {
      if (anc.userData.noMerge) return;
      anc = anc.parent;
    }
    const src = o.geometry;
    if (!src.attributes.position) return;

    let geo = src.index ? src.toNonIndexed() : src.clone();
    // Keep exactly the attributes every primitive shares, or the merge fails.
    const trimmed = new THREE.BufferGeometry();
    trimmed.setAttribute('position', geo.attributes.position.clone());
    if (geo.attributes.normal) trimmed.setAttribute('normal', geo.attributes.normal.clone());
    else {
      geo.computeVertexNormals();
      trimmed.setAttribute('normal', geo.attributes.normal.clone());
    }
    if (geo.attributes.uv) trimmed.setAttribute('uv', geo.attributes.uv.clone());
    else {
      const count = geo.attributes.position.count;
      trimmed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    trimmed.applyMatrix4(o.matrixWorld);
    geo = trimmed;

    const mat = o.material as THREE.Material;
    const list = buckets.get(mat);
    if (list) list.push(geo);
    else buckets.set(mat, [geo]);
    doomed.push(o);
  });

  for (const m of doomed) m.removeFromParent();

  const meshes: THREE.Mesh[] = [];
  for (const [mat, geos] of buckets) {
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    for (const g of geos) if (g !== merged) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    meshes.push(mesh);
  }

  return { meshes, removed: doomed.length };
}
