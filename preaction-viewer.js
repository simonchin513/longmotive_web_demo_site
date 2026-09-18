/* <lm-preaction-viewer> — Longmotive pre-action sprinkler valve room inspector.
   Loads uploads/3d/preaction-valve-room.glb (Blender-built: five pre-action valve
   stations on a DN150 supply header, supervisory air compressor skid, releasing
   panel + cable tray, drain trench, extinguisher). Raycast hits group by PA_*
   mesh-name families, so a click selects the whole item. Free-orbit room viewer. */
(function(){
const ESM='https://cdn.jsdelivr.net/npm/three@0.160.0';
const GLB='uploads/3d/preaction-valve-room.glb';
const POSTER='uploads/3d/preaction-valve-room-hero.png';
const SEC={
  PV1:{name:'SUPPLY RISER 1',type:'Pipework',devices:'DN200 riser · grooved collars'},
  PV2:{name:'PRE-ACTION VALVE 1',type:'Fire protection',devices:'Clamp valve · butterfly · trim · gauges · flex hose · pressure switch'},
  PV3:{name:'PRE-ACTION VALVE 2',type:'Fire protection',devices:'Clamp valve · butterfly · trim · gauges · drip funnel · pressure switch'},
  PV4:{name:'PRE-ACTION VALVE 3',type:'Fire protection',devices:'Clamp valve · butterfly · trim · gauges · flex hose · pressure switch'},
  PV5:{name:'SUPPLY RISER 5',type:'Pipework',devices:'DN200 riser · grooved collars'},
  HD:{name:'MANIFOLDS & EXITS',type:'Pipework',devices:'Staggered manifolds · DN200 exits · grooved collars · support channel'},
  CP:{name:'AIR COMPRESSOR',type:'Supervisory air',devices:'SWAN-style duplex · flywheels · V-twin heads · mesh guard · casters'},
  PN:{name:'CONTROL PANELS',type:'Electrical & controls',devices:'Releasing panel · pushbutton station · conduit · supply cables'},
  TR:{name:'WALL CONDUITS',type:'Electrical & controls',devices:'Red conduit runs · junction boxes · break-glass point'}
};
const IDS=Object.keys(SEC);
const MAP=[
  [/^PA_Valve1_/,'PV1'],
  [/^PA_Valve2_/,'PV2'],
  [/^PA_Valve3_/,'PV3'],
  [/^PA_Valve4_/,'PV4'],
  [/^PA_Valve5_/,'PV5'],
  [/^PA_Header/,'HD'],
  [/^PA_Comp_/,'CP'],
  [/^PA_Panel_/,'PN'],
  [/^PA_Cond_/,'TR']
];
const HUDCFG={views:[], // locked to the signature open-corner view — Reset re-frames it, no other views offered
  walls:true,colour:true,explode:false,poster:POSTER,loadingLabel:'Loading valve room',
  hint:'Drag orbit &#183; Scroll zoom<br>R reset &#183; W walls &#183; C colour &#183; Esc deselect'};
const ARIA='Interactive 3D model of the pre-action valve room. Drag or use arrow keys to look around, scroll to zoom in. Click equipment to inspect it. Press R to reset the view, Escape to deselect.';
const secOf=(n)=>{for(const[m,id]of MAP)if(m.test(n))return id;return null;};
const secOfNode=(o)=>{for(let n=o;n;n=n.parent){const id=secOf(n.name||'');if(id)return id;}return null;};
const isWallNode=(o)=>{for(let n=o;n;n=n.parent){if(/Wall|Skirt/.test(n.name||''))return true;}return false;};

class LMPreactionViewer extends HTMLElement{
  connectedCallback(){
    if(this._built)return;this._built=true;
    const sh=this.attachShadow({mode:'open'});
    sh.innerHTML=LMHUD.markup(HUDCFG);
    this._reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._view='overview';this._hover=null;this._sel=null;this._sections={};
    this.setAttribute('tabindex','0');this.setAttribute('role','application');
    this.setAttribute('aria-label',ARIA);
    this.addEventListener('keydown',this._onKey);
    this.addEventListener('pointerenter',()=>this.focus({preventScroll:true}));
    this._hud=LMHUD.attach(this,sh,HUDCFG,{
      sections:this._sections,order:IDS,SEC,
      onView:(v)=>this._setView(v),
      onReset:()=>{if(this._select)this._select(null);this._setView('overview');},
      onSelect:(id)=>{if(this._select)this._select(id);},
      onHover:(id)=>{if(this._applyHover)this._applyHover(id);},
      onVisibility:(fn)=>{if(this._applyVis)this._applyVis(fn);},
      onWalls:(off)=>{if(this._applyWalls)this._applyWalls(off);},
      onColour:(on)=>{if(this._applyColour)this._applyColour(on);},
      onExplode:(t)=>{if(this._applyExplode)this._applyExplode(t);}
    });
    const start=()=>{
      if(this._started)return;this._started=true;
      Promise.all([import(ESM+'/+esm'),import(ESM+'/examples/jsm/loaders/GLTFLoader.js/+esm'),import(ESM+'/examples/jsm/environments/RoomEnvironment.js/+esm')])
        .then(([T,GL,RE])=>{try{this._init(T,GL.GLTFLoader,RE.RoomEnvironment);}catch(e){this._fallback(e);}})
        .catch(e=>this._fallback(e));
    };
    setTimeout(start,60);
    this._visOb=new IntersectionObserver(es=>es.forEach(e=>{this._onScreen=e.isIntersecting;if(e.isIntersecting){start();this._resume();}}),{rootMargin:'240px'});
    this._visOb.observe(this);
  }
  _resume(){if(this._tick&&!this._raf)this._tick();}
  disconnectedCallback(){
    if(this._visOb){this._visOb.disconnect();this._visOb=null;}
    if(this._raf){cancelAnimationFrame(this._raf);this._raf=null;}
    if(this._dispose)this._dispose();
    this._built=false;this._started=false;
  }
  _fallback(e){
    console.error('Pre-action viewer:',e);
    if(this._hud)this._hud.fail();
  }
  _onKey=(e)=>{
    const k=e.key;
    if(k==='Escape'||k==='0'){if(this._select)this._select(null);}
    else if(this._lookKey&&this._lookKey(k)){}
    else if(this._hud&&this._hud.key(k)){}
    else return;
    e.preventDefault();
  };
  _sync(){ if(!this._hud)return; const h=this._hud; h.sel=this._sel; h.hover=this._hover; h.view=this._view; h.sync(); }
  _setView(v){this._view=v;this._sync();if(this._goView)this._goView(v);}
  _panel(id){ if(!this._hud)return; this._hud.setProps(id); this._hud.setTip(id?SEC[id].name:''); }
  _init(THREE,GLTFLoader,RoomEnvironment){
    const cv=this.shadowRoot.querySelector('canvas');
    const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.9; // graded to the photo's soft neutral light
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene();
    scene.background=null;renderer.setClearColor(0x000000,0); // CSS navy gradient shows through
    scene.fog=new THREE.Fog(0x0a1c31,30,70);
    const pm=new THREE.PMREMGenerator(renderer);
    scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;pm.dispose();
    const camera=new THREE.PerspectiveCamera(46,1,.05,120);
    const sun=new THREE.DirectionalLight(0xfff4e6,.5); // soft key with shadows — the room lights do the rest
    sun.position.set(-6,12,8);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;
    scene.add(sun,sun.target);
    scene.add(new THREE.HemisphereLight(0xe8eef5,0x8d9094,.4)); // sky/floor bounce gradient instead of flat ambient
    scene.add(new THREE.AmbientLight(0xdfe6ec,.08));

    /* ---------------- model ---------------- */
    const sections=this._sections;
    const walls=[],catMat={};
    const pick=[];
    let dirty=true;
    new GLTFLoader().load(GLB,(gltf)=>{
      const root=gltf.scene;
      const strips=[];
      root.traverse(o=>{
        if(!o.isMesh)return;
        o.castShadow=true;o.receiveShadow=true;
        if(o.name==='PA_Ceil'){o.visible=false;return;} // roof slab off — light strips stay
        if(/^PA_LightStrip/.test(o.name))strips.push(o);
        if(isWallNode(o))walls.push(o);
        if(o.material&&o.material.envMapIntensity!==undefined){o.material.envMapIntensity=o.name==='PA_Floor'?.7:.35;}
        const id=secOfNode(o);
        if(id&&SEC[id]){
          (sections[id]=sections[id]||{meshes:[]}).meshes.push(o);
          o.userData.sec=id;pick.push(o);
        }
      });
      // clone materials per section so the hover tint never leaks through shared materials
      const seen=new Map();
      Object.keys(sections).forEach(id=>{
        sections[id].meshes.forEach(o=>{
          const key=id+'|'+o.material.uuid;
          if(!seen.has(key))seen.set(key,o.material.clone());
          o.material=seen.get(key);
        });
        const bb=new THREE.Box3();
        sections[id].meshes.forEach(o=>bb.expandByObject(o));
        sections[id].box=bb;sections[id].centre=bb.getCenter(new THREE.Vector3());
        sections[id].size=bb.getSize(new THREE.Vector3()).length();
      });
      scene.add(root);
      // lit light strips: glow + real light pools beneath them
      strips.forEach(o=>{
        if(o.material&&o.material.emissive){o.material.emissive.setHex(0xffffff);o.material.emissiveIntensity=2.2;o.material.toneMapped=false;}
        const lb=new THREE.Box3().setFromObject(o),lc=lb.getCenter(new THREE.Vector3());
        const p=new THREE.PointLight(0xfff6e8,14,0,2);
        p.position.copy(lc);p.position.y-=.5; // pools land on the equipment, not the ceiling void
        scene.add(p);
      });
      // frame the WHOLE room from its real bounds — never trust hardcoded dims
      const bb=new THREE.Box3().setFromObject(root);
      const c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3());
      C.copy(c);
      const span=Math.max(sz.x,sz.z);
      // ceiling cap: the room has no roof mesh and the locked view can catch a sliver of gradient
      // above the wall junction — castShadow stays off so the graded lighting is untouched
      {
        const cx=new THREE.Mesh(new THREE.PlaneGeometry(sz.x+16,sz.z+16),new THREE.MeshStandardMaterial({color:0xd9d7d2,roughness:.95,metalness:0}));
        cx.name='PA_FillCeil';cx.rotation.x=Math.PI/2;cx.position.set(c.x,bb.max.y+.02,c.z);scene.add(cx);
      }
      R_MIN=span*.18;R_MAX=span*1.9;
      // signature view = the reference-photo standpoint: compressor foreground,
      // valve cluster behind-right, panels left
      // SIGNATURE VIEW = THE VALVE CLUSTER, at the photograph's distance.
      // It used to frame the whole room from the reference standpoint, which
      // put the valve tree small and behind-right; the photograph everyone
      // sees on the card is a close-up of that tree. Framed off PV1..PV5
      // below once their boxes are known, with this as the fallback.
      VIEWS.overview.t.set(c.x-span*.25,1.05,c.z+span*.08);VIEWS.overview.r=span*.66;
      VIEWS.plan.t.copy(c);VIEWS.plan.r=span*1.3;
      // valve row view: frame the union of the five stations, slightly frontal
      const rb=new THREE.Box3();
      ['PV1','PV2','PV3','PV4','PV5'].forEach(id=>{if(sections[id])rb.union(sections[id].box);});
      // the signature framing aims at the middle stations, not the union of all
      // five: the outer two carry long runs of distribution pipe, so the union's
      // centre sits out in the pipework with the valves off to one side
      const vb=new THREE.Box3();
      ['PV2','PV3','PV4'].forEach(id=>{if(sections[id])vb.union(sections[id].box);});
      if(!rb.isEmpty()){
        VIEWS.row.t.copy(rb.getCenter(new THREE.Vector3()));
        VIEWS.row.r=Math.max(rb.getSize(new THREE.Vector3()).length()*.72,span*.6);
      }
      if(!vb.isEmpty()){
        const rc=vb.getCenter(new THREE.Vector3()),rs=vb.getSize(new THREE.Vector3());
        VIEWS.overview.t.set(rc.x,rc.y,rc.z);
        VIEWS.overview.r=rs.length()*VALVE_R;
        VIEWS.overview.th=VALVE_TH;VIEWS.overview.ph=VALVE_PH;
      }
      R_MAX=VIEWS.overview.r; // zoom-out stops at the signature framing — users can only go closer
      sun.target.position.copy(c);
      sun.shadow.camera.left=-span*.8;sun.shadow.camera.right=span*.8;
      sun.shadow.camera.top=span*.8;sun.shadow.camera.bottom=-span*.5;
      sun.shadow.camera.updateProjectionMatrix();
      this._applyVis=(fn)=>{
        IDS.forEach(id=>{const sc=sections[id];if(sc)sc.meshes.forEach(o=>{o.visible=fn(id);});});
        if(this._sel&&!fn(this._sel))this._select(null);
        dirty=true;
      };
      this._applyWalls=(off)=>{walls.forEach(o=>{o.visible=!off;});dirty=true;};
      this._applyColour=(on)=>{
        IDS.forEach(id=>{const sc=sections[id];if(!sc)return;
          if(!catMat[id])catMat[id]=new THREE.MeshStandardMaterial({color:this._hud.colourOf(id),roughness:.55,metalness:.08});
          sc.meshes.forEach(o=>{if(!o.userData.m0)o.userData.m0=o.material;o.material=on?catMat[id]:o.userData.m0;});
        });dirty=true;
      };
      this._applyExplode=(t)=>{
        IDS.forEach(id=>{const sc=sections[id];if(!sc)return;
          const d=sc.centre.clone().sub(C);d.y=0;
          if(d.lengthSq()<1e-6)d.set(0,0,1);
          d.normalize().multiplyScalar(t*span*.4);
          sc.meshes.forEach(o=>{if(!o.userData.p0)o.userData.p0=o.position.clone();o.position.copy(o.userData.p0).add(d);});
        });dirty=true;
      };
      this._loaded=true;dirty=true;
      this._goView(this._view);
      this._sync();
      this._hud.ready();
    },(e)=>{
      if(e.total&&this._hud)this._hud.progress(e.loaded/e.total*100);
    },(err)=>this._fallback(err));

    /* ---------------- camera rig: free orbit around the room ---------------- */
    const C=new THREE.Vector3(0,1.5,0);
    // Tuned against the card photograph: distance as a multiple of the valve
    // cluster's diagonal, then its heading and tilt.
    const VALVE_R=0.68,VALVE_TH=2.20,VALVE_PH=1.50;
    const VIEWS={
      overview:{t:C.clone(),r:16,th:2.24,ph:1.48},
      row:{t:C.clone(),r:10,th:2.9,ph:1.18},
      plan:{t:C.clone(),r:19,th:2.36,ph:.28}
    };
    let V=VIEWS.overview;
    let target=V.t.clone(),radius=V.r,theta=V.th,phi=V.ph;
    let tGoal=target.clone(),rGoal=radius,thGoal=theta,phGoal=phi,glide=false;
    let R_MIN=3,R_MAX=34;
    const PH_MIN=.88,PH_MAX=1.5; // no tilting above the room — the roof/upper wall stays out of view (Plan button still works)
    const TH_MIN=2.05,TH_MAX=3.25; // orbit window: open-corner view ↔ frontal view — never behind the walls
    this._goView=(v)=>{
      const W=VIEWS[v]||VIEWS.overview;
      tGoal=W.t.clone();rGoal=W.r;thGoal=W.th;phGoal=W.ph;glide=true;
      if(this._reduce){target.copy(tGoal);radius=rGoal;theta=thGoal;phi=phGoal;glide=false;dirty=true;}
    };
    this._goSection=(id)=>{
      const s=sections[id];if(!s)return;
      tGoal=s.centre.clone();
      rGoal=Math.min(R_MAX,Math.max(R_MIN,s.size*1.6));
      thGoal=theta;phGoal=Math.min(1.32,Math.max(.7,phi));glide=true;
      if(this._reduce){target.copy(tGoal);radius=rGoal;phi=phGoal;glide=false;dirty=true;}
    };
    this._lookKey=(k)=>{
      const st=.12;
      if(k==='ArrowLeft'){theta=Math.min(TH_MAX,theta+st);glide=false;dirty=true;return true;}
      if(k==='ArrowRight'){theta=Math.max(TH_MIN,theta-st);glide=false;dirty=true;return true;}
      if(k==='ArrowUp'){phi=Math.max(PH_MIN,phi-st);glide=false;dirty=true;return true;}
      if(k==='ArrowDown'){phi=Math.min(PH_MAX,phi+st);glide=false;dirty=true;return true;}
      if(k==='+'||k==='='){radius=Math.max(R_MIN,radius*.9);glide=false;dirty=true;return true;}
      if(k==='-'||k==='_'){radius=Math.min(R_MAX,radius*1.1);glide=false;dirty=true;return true;}
      return false;
    };
    let dragging=false,px=0,py=0;
    cv.addEventListener('pointerdown',e=>{dragging=true;glide=false;px=e.clientX;py=e.clientY;cv.classList.add('drag');cv.setPointerCapture(e.pointerId);this._downAt=Date.now();});
    cv.addEventListener('pointerup',()=>{dragging=false;cv.classList.remove('drag');});
    cv.addEventListener('pointerleave',()=>{this._hoverDirty=false;this._applyHover(null);});
    cv.addEventListener('pointermove',e=>{
      if(dragging){
        theta=Math.min(TH_MAX,Math.max(TH_MIN,theta-(e.clientX-px)*.0052));
        phi=Math.min(PH_MAX,Math.max(PH_MIN,phi-(e.clientY-py)*.0042));
        px=e.clientX;py=e.clientY;dirty=true;
      }else{
        const r=cv.getBoundingClientRect();
        this._mx=((e.clientX-r.left)/r.width)*2-1;this._my=-((e.clientY-r.top)/r.height)*2+1;this._hoverDirty=true;
      }
    });
    cv.addEventListener('wheel',e=>{e.preventDefault();glide=false;radius=Math.min(R_MAX,Math.max(R_MIN,radius*(1+e.deltaY*.0012)));dirty=true;},{passive:false});

    /* ---------------- hover + select ---------------- */
    const ray=new THREE.Raycaster();const mv=new THREE.Vector2();
    const tint=(id,i)=>{ if(!sections[id])return;
      const done=new Set();
      sections[id].meshes.forEach(o=>{ const m=o.material; if(!m.emissive||done.has(m.uuid))return; done.add(m.uuid);
        if(m.userData.e0===undefined){m.userData.e0=m.emissive.getHex();m.userData.ei0=m.emissiveIntensity;}
        if(i>0){m.emissive.setHex(0x00b0f0);m.emissiveIntensity=i;}
        else{m.emissive.setHex(m.userData.e0);m.emissiveIntensity=m.userData.ei0;}
      });dirty=true;};
    this._applyHover=(id)=>{
      if(this._hover===id)return;
      if(this._hover&&this._hover!==this._sel)tint(this._hover,0);
      this._hover=id;
      if(id&&id!==this._sel)tint(id,.18);
      cv.style.cursor=id?'pointer':(dragging?'grabbing':'grab');
      if(!this._sel)this._panel(id);
      this._sync();
    };
    this._select=(id)=>{
      if(this._sel)tint(this._sel,0);
      this._sel=id;
      if(id){tint(id,.3);this._panel(id);this._goSection(id);}
      else{this._panel(this._hover);this._setView(this._view);}
      this._sync();
    };
    cv.addEventListener('click',()=>{
      if(Date.now()-(this._downAt||0)>260)return;
      this._select(this._hover&&this._sel!==this._hover?this._hover:null);
    });

    const resize=()=>{const w=this.clientWidth||900,h=this.clientHeight||560;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;};
    new ResizeObserver(resize).observe(this);resize();
    this.debugScene={scene,camera,renderer,root:scene,render:()=>renderer.render(scene,camera)};
    this._dispose=()=>{
      scene.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        const mm=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
        mm.forEach(m=>{Object.values(m).forEach(v=>{if(v&&v.isTexture)v.dispose();});m.dispose();});
      });
      renderer.dispose();
    };

    const t0=performance.now();
    const tick=()=>{
      this._raf=requestAnimationFrame(tick);
      if(this._onScreen===false||document.hidden){this._raf&&cancelAnimationFrame(this._raf);this._raf=null;return;}
      const k=this._reduce?1:Math.min(1,(performance.now()-t0)/1800),e=1-Math.pow(1-k,3);
      if(k<1)dirty=true;
      if(glide){
        target.lerp(tGoal,.07);radius+=(rGoal-radius)*.07;theta+=(thGoal-theta)*.07;phi+=(phGoal-phi)*.07;dirty=true;
        if(target.distanceTo(tGoal)<.008&&Math.abs(rGoal-radius)<.01&&Math.abs(thGoal-theta)<.005&&Math.abs(phGoal-phi)<.005)glide=false;
      }
      if(this._hoverDirty&&!dragging){
        this._hoverDirty=false;mv.set(this._mx,this._my);ray.setFromCamera(mv,camera);
        const hit=ray.intersectObjects(pick,false)[0];
        this._applyHover(hit?hit.object.userData.sec:null);
      }
      if(dirty){
        dirty=false;
        const rr=radius+(1-e)*4;
        camera.position.set(
          target.x+rr*Math.sin(phi)*Math.sin(theta),
          target.y+rr*Math.cos(phi)+.6*(1-e),
          target.z+rr*Math.sin(phi)*Math.cos(theta));
        camera.lookAt(target);
        renderer.render(scene,camera);
      }
    };
    this._tick=tick;
    this._goView('overview');
    tick();
  }
}
if(!customElements.get('lm-preaction-viewer'))customElements.define('lm-preaction-viewer',LMPreactionViewer);
})();
