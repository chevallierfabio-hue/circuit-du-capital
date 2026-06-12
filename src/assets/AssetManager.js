// src/assets/AssetManager.js
//
// Préchargement déclaratif piloté par un manifest. Couvre :
//   - HDRI équirectangulaire .hdr  (RGBELoader → texture brute ; PMREM compilé
//     plus tard quand le renderer existe).
//   - GLB compressé DRACO          (GLTFLoader + DRACOLoader '/draco/').
//   - KTX2 GPU textures            (KTX2Loader, support détecté quand le
//     renderer est connu — pas utilisé en M0 mais câblé pour M1+).
//
// Émet des événements de progression écoutables (on()) pour piloter une
// barre de chargement. Continue malgré une erreur isolée et la signale ;
// pas de plantage du boot si un asset accessoire manque.
//
// playClip(gltf, name) : helper M7-ready basé sur AnimationMixer.

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader }  from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class AssetManager {
  constructor(){
    this._renderer = null;
    this._listeners = [];
    this.assets = { hdri:{}, models:{}, textures:{} };
    this.errors = [];
  }

  setRenderer(r){
    this._renderer = r;
    if (this._ktx2Loader) this._ktx2Loader.detectSupport(r);
  }

  on(fn){ this._listeners.push(fn); return this; }
  _emit(ev){ for (const fn of this._listeners) { try { fn(ev); } catch {} } }

  _draco(){
    if (this._dracoLoader) return this._dracoLoader;
    const d = new DRACOLoader();
    d.setDecoderPath('/draco/');
    this._dracoLoader = d;
    return d;
  }

  _ktx2(){
    if (this._ktx2Loader) return this._ktx2Loader;
    const k = new KTX2Loader().setTranscoderPath('/basis/');
    if (this._renderer) k.detectSupport(this._renderer);
    this._ktx2Loader = k;
    return k;
  }

  _gltf(){
    if (this._gltfLoader) return this._gltfLoader;
    const g = new GLTFLoader();
    g.setDRACOLoader(this._draco());
    g.setKTX2Loader(this._ktx2());
    this._gltfLoader = g;
    return g;
  }

  /**
   * Charge tout ce qui est listé dans le manifest, en série pour pouvoir
   * tenir une barre de progression nette. Renvoie un dictionnaire indexé
   * par clé.
   *
   * manifest: { hdri:{key:url}, models:{key:url}, textures:{key:url} }
   */
  async preload(manifest){
    const items = [];
    for (const [k,url] of Object.entries(manifest.hdri    || {})) items.push({k, url, kind:'hdri'});
    for (const [k,url] of Object.entries(manifest.models  || {})) items.push({k, url, kind:'glb'});
    for (const [k,url] of Object.entries(manifest.textures|| {})) items.push({k, url, kind:'ktx2'});
    const total = items.length;
    let done = 0;

    this._emit({phase:'start', done, total, message:`Préchargement (${total})…`});

    for (const it of items) {
      this._emit({phase:'loading', done, total, message:`${it.kind}: ${shortName(it.url)}`});
      try {
        let v = null;
        if (it.kind==='hdri')  v = await this._loadHDR(it.url);
        if (it.kind==='glb')   v = await this._loadGLB(it.url);
        if (it.kind==='ktx2')  v = await this._loadKTX2(it.url);
        this.assets[it.kind==='hdri'?'hdri':it.kind==='glb'?'models':'textures'][it.k] = v;
      } catch (err) {
        this.errors.push({asset:it, error:err});
        this._emit({phase:'error', done, total, asset:it,
          message:`Échec ${shortName(it.url)} : ${err.message||err}`, error:err});
        this.assets[it.kind==='hdri'?'hdri':it.kind==='glb'?'models':'textures'][it.k] = null;
      }
      done++;
      this._emit({phase:'progress', done, total, message:`${done}/${total}`});
    }

    this._emit({phase:'done', done, total, message:'Assets prêts.'});
    return this.assets;
  }

  _loadHDR(url){
    return new Promise((resolve, reject) => {
      new RGBELoader().load(url, resolve, undefined, reject);
    });
  }

  _loadGLB(url){
    return new Promise((resolve, reject) => {
      this._gltf().load(url, resolve, undefined, reject);
    });
  }

  _loadKTX2(url){
    return new Promise((resolve, reject) => {
      const k = this._ktx2();
      if (!this._renderer) {
        return reject(new Error('KTX2Loader requiert un renderer (appelez setRenderer())'));
      }
      k.load(url, resolve, undefined, reject);
    });
  }

  dispose(){
    if (this._dracoLoader) this._dracoLoader.dispose();
    if (this._ktx2Loader)  this._ktx2Loader.dispose();
  }
}

function shortName(url){
  const s = String(url||'');
  const i = s.lastIndexOf('/');
  return i>=0 ? s.slice(i+1) : s;
}

/**
 * Renvoie un AnimationMixer prêt à jouer le clip `name` (ou le premier si
 * non précisé) du gltf chargé. Utilisé en M7 pour les animations.
 */
export function playClip(gltf, name){
  if (!gltf || !gltf.scene || !Array.isArray(gltf.animations) || gltf.animations.length===0) {
    return null;
  }
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const clip = name
    ? gltf.animations.find(c => c.name===name)
    : gltf.animations[0];
  if (!clip) return mixer;
  mixer.clipAction(clip).play();
  return mixer;
}

// Manifest par défaut M0 : HDRI + GLB de test (preuve du pipeline DRACO).
export const DEFAULT_MANIFEST = {
  hdri: {
    sunset: '/assets/hdri/industrial_sunset_puresky_2k.hdr',
  },
  models: {
    test: '/assets/models/test/cube-draco.glb',
  },
  textures: {
    // (M1+ : KTX2 quand on aura un atlas)
  },
};
