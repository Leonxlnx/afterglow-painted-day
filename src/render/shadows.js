// Two-cascade sun shadow maps rendered with each mesh's own shadow material (keeps wind/instancing consistent).
import * as THREE from 'three';
import { U } from './materials.js';

export class SunShadows {
  constructor(renderer, size = 4096) {
    this.r = renderer; this.size = size;
    this.cascades = [70, 520].map(radius => {
      const depth = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
      depth.compareFunction = THREE.LessEqualCompare;
      depth.minFilter = depth.magFilter = THREE.LinearFilter;
      const rt = new THREE.WebGLRenderTarget(size, size, { depthTexture: depth, depthBuffer: true, type: THREE.UnsignedByteType });
      const cam = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 1, 2400);
      return { radius, rt, cam, mat: new THREE.Matrix4() };
    });
    this._tmp = new THREE.Vector3();
  }

  update(scene, camera, sunDir, { focusDist = [40, 300] } = {}) {
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const sd = sunDir.clone().normalize();
    // if the sun is below the horizon, keep shadows from a grazing direction (they fade by lighting anyway)
    if (sd.y < 0.04) { sd.y = 0.04; sd.normalize(); }
    const saved = [];
    scene.traverse(o => {
      if (!o.isMesh && !o.isPoints && !o.isLine) return;
      saved.push([o, o.material, o.visible]);
      if (o.userData.shadowMat && o.visible) o.material = o.userData.shadowMat; else o.visible = false;
    });
    const prevAuto = scene.autoUpdate;
    this.cascades.forEach((c, i) => {
      const center = camera.position.clone().addScaledVector(fwd, Math.min(focusDist[i], c.radius * 0.75));
      // light-space basis and texel snapping
      const up = Math.abs(sd.y) > 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const lx = new THREE.Vector3().crossVectors(up, sd).normalize();
      const ly = new THREE.Vector3().crossVectors(sd, lx).normalize();
      const texel = (2 * c.radius) / this.size;
      const px = Math.round(center.dot(lx) / texel) * texel;
      const py = Math.round(center.dot(ly) / texel) * texel;
      const pz = center.dot(sd);
      const snapped = new THREE.Vector3().addScaledVector(lx, px).addScaledVector(ly, py).addScaledVector(sd, pz);
      c.cam.position.copy(snapped).addScaledVector(sd, 1200);
      c.cam.up.copy(ly);
      c.cam.lookAt(snapped);
      c.cam.updateMatrixWorld(); c.cam.updateProjectionMatrix();
      c.mat.multiplyMatrices(c.cam.projectionMatrix, c.cam.matrixWorldInverse);
      this.r.setRenderTarget(c.rt);
      this.r.setClearColor(0xffffff, 1);
      this.r.clear(true, true, false);
      this.r.render(scene, c.cam);
      this.r.getContext().flush();
    });
    saved.forEach(([o, m, v]) => { o.material = m; o.visible = v; });
    U.uShadowMap0.value = this.cascades[0].rt.depthTexture;
    U.uShadowMap1.value = this.cascades[1].rt.depthTexture;
    U.uShadowMat0.value.copy(this.cascades[0].mat);
    U.uShadowMat1.value.copy(this.cascades[1].mat);
    const t0 = 2 * this.cascades[0].radius / this.size, t1 = 2 * this.cascades[1].radius / this.size;
    U.uShadowTexel.value.set(1 / this.size, 1 / this.size, t0, t1);
  }
}
