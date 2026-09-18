/* <lm-msb-viewer> — Longmotive main-switchboard inspector.
   Loads the real BIM export uploads/3d/main-switchboard-msb.glb (8-section LV board,
   6.8 × 2.2 × 1.0 m, origin front-left-bottom, lineup along +X, front toward −Z).
   Raycast hits group by the MSB_Sxx_ mesh-name prefix, so a click selects the whole
   section. Single-row viewer: the camera is clamped to the front of the board. */
(function(){
const ESM='https://cdn.jsdelivr.net/npm/three@0.160.0';
const GLB='uploads/3d/main-switchboard-msb.glb';
const POSTER='uploads/3d/msb-render-hero.png';
const SEC={
  S01:{name:'FEEDER 1AA1',type:'MCCB feeder section',devices:'10 MCCB ways · 5 × 2 grid'},
  S02:{name:'FEEDER 1AA2',type:'MCCB feeder section',devices:'10 MCCB ways · 5 × 2 grid'},
  S03:{name:'SUB FEED ACB',type:'ACB sub-feed section',devices:'2 air circuit breakers'},
  S04:{name:'INCOMER 1',type:'ACB incomer section',devices:'1 air circuit breaker'},
  S05:{name:'BUS COUPLER',type:'Bus-section coupler',devices:'1 air circuit breaker'},
  S06:{name:'OUTGOING ACB',type:'ACB outgoing section',devices:'3 air circuit breakers'},
  S07:{name:'FEEDER 1AA3',type:'MCCB feeder section',devices:'10 MCCB ways · 5 × 2 grid'},
  S08:{name:'AUX / METERING',type:'Auxiliary & metering',devices:'Meters, relays, aux supplies'}
};
const IDS=Object.keys(SEC);
const HUDCFG={views:[{id:'front',label:'Front',key:'f'},{id:'overview',label:'Overview',key:'i'}],
  walls:false,colour:true,explode:false,poster:POSTER,loadingLabel:'Loading switchboard',
  hint:'Drag to slide &#183; Scroll zoom<br>R reset &#183; C colour &#183; Esc deselect'};
const ARIA='Interactive 3D model of an eight-section low-voltage main switchboard. Drag or use arrow keys to slide along the board, scroll to zoom. Click a section to inspect it. Press R to reset, F for the device face, I for the overview, Escape to deselect.';

class LMMsbViewer extends HTMLElement{
  connectedCallback(){
    if(this._built)return;this._built=true;
    const sh=this.attachShadow({mode:'open'});
    sh.innerHTML=LMHUD.markup(HUDCFG);
    this._reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._view='front';this._hover=null;this._sel=null;this._sections={};
    this.setAttribute('tabindex','0');this.setAttribute('role','application');
    this.setAttribute('aria-label',ARIA);
    this.addEventListener('keydown',this._onKey);
    this.addEventListener('pointerenter',()=>this.focus({preventScroll:true}));
    this._hud=LMHUD.attach(this,sh,HUDCFG,{
      sections:this._sections,order:IDS,SEC,
      onView:(v)=>this._setView(v),
      onReset:()=>{if(this._select)this._select(null);this._setView('front');},
      onSelect:(id)=>{if(this._select)this._select(id);},
      onHover:(id)=>{if(this._applyHover)this._applyHover(id);},
      onVisibility:(fn)=>{if(this._applyVis)this._applyVis(fn);},
      onWalls:()=>{},
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
    console.error('MSB viewer:',e);
    if(this._hud)this._hud.fail();
  }
  _onKey=(e)=>{
    const k=e.key;
    if(k==='1'){this._setView('front');}
    else if(k==='2'){this._setView('overview');}
    else if(k==='Escape'||k==='0'){if(this._select)this._select(null);}
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
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene();
    scene.background=null;renderer.setClearColor(0x000000,0); // CSS navy gradient shows through
    scene.fog=new THREE.Fog(0x0a1c31,18,40);
    const pm=new THREE.PMREMGenerator(renderer);
    scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;pm.dispose();
    const camera=new THREE.PerspectiveCamera(42,1,.05,80);
    const sun=new THREE.DirectionalLight(0xffffff,1.4);
    sun.position.set(-3,7,6);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;
    sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-3;
    sun.target.position.set(3.4,1.1,.5);scene.add(sun,sun.target);
    scene.add(new THREE.AmbientLight(0xdfe6ec,.25));
    const floor=new THREE.Mesh(new THREE.CircleGeometry(14,48),new THREE.ShadowMaterial({opacity:.32}));
    floor.rotation.x=-Math.PI/2;floor.position.y=0;floor.receiveShadow=true;scene.add(floor);
    const deck=new THREE.Mesh(new THREE.CircleGeometry(14,48),new THREE.MeshStandardMaterial({color:0x1b2b3e,roughness:.95}));
    deck.rotation.x=-Math.PI/2;deck.position.y=-.005;deck.receiveShadow=true;scene.add(deck);

    /* ---------------- model ---------------- */
    const sections=this._sections;
    const catMat={};
    const pick=[];
    let dirty=true;
    new GLTFLoader().load(GLB,(gltf)=>{
      const root=gltf.scene;
      root.traverse(o=>{
        if(!o.isMesh)return;
        o.castShadow=true;o.receiveShadow=true;
        let m=null;for(let n=o;n&&!m;n=n.parent)m=/^MSB_(S\d\d)/.exec(n.name||'');
        if(m&&SEC[m[1]]){
          const id=m[1];
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
      });
      scene.add(root);
      // frame the WHOLE board from its real bounds — never trust hardcoded dims
      const bb=new THREE.Box3().setFromObject(root);
      const c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3());
      C.x=c.x;C.y=c.y;C.z=c.z;
      const fit=(sz.x/2)/Math.tan(camera.fov*Math.PI/360)/Math.max(1,camera.aspect)+sz.z;
      VIEWS.overview.t.set(c.x,c.y,c.z);VIEWS.overview.r=Math.max(fit*1.12,sz.x*.8);
      VIEWS.front.t.set(c.x,c.y,c.z);
      // SIGNATURE VIEW = THE PHOTOGRAPH'S STANDPOINT: from one end of the lineup,
      // looking down it, rather than square on to a single cubicle. The rig still
      // only slides along the row, so the heading is fixed here and nowhere else.
      VIEWS.front.r=Math.max(sz.x*MSB_R,1.8);VIEWS.front.th=MSB_TH;VIEWS.front.ph=MSB_PH;
      RF_MAX=VIEWS.front.r; // zoom-out still stops at the signature framing
      panX0=bb.min.x+.7;panX1=bb.max.x-.7;
      sun.target.position.copy(c);
      sun.shadow.camera.left=-sz.x*.7;sun.shadow.camera.right=sz.x*.7;
      sun.shadow.camera.top=sz.y*2;sun.shadow.camera.bottom=-sz.y;
      sun.shadow.camera.updateProjectionMatrix();
      this._applyVis=(fn)=>{
        IDS.forEach(id=>{const sc=sections[id];if(sc)sc.meshes.forEach(o=>{o.visible=fn(id);});});
        if(this._sel&&!fn(this._sel))this._select(null);
        dirty=true;
      };
      this._applyColour=(on)=>{
        IDS.forEach(id=>{const sc=sections[id];if(!sc)return;
          if(!catMat[id])catMat[id]=new THREE.MeshStandardMaterial({color:this._hud.colourOf(id),roughness:.55,metalness:.08});
          sc.meshes.forEach(o=>{if(!o.userData.m0)o.userData.m0=o.material;o.material=on?catMat[id]:o.userData.m0;});
        });dirty=true;
      };
      this._applyExplode=(t)=>{ // slide the sections apart along the lineup
        const cx=C.x;
        IDS.forEach(id=>{const sc=sections[id];if(!sc)return;
          const dx=(sc.centre.x-cx)*t*.55;
          sc.meshes.forEach(o=>{if(!o.userData.p0)o.userData.p0=o.position.clone();o.position.copy(o.userData.p0);o.position.x+=dx;});
        });dirty=true;
      };
      this._loaded=true;dirty=true;
      this._goView(this._view);
      this._sync();
      this._hud.ready();
    },(e)=>{
      if(e.total&&this._hud)this._hud.progress(e.loaded/e.total*100);
    },(err)=>this._fallback(err));

    /* ---------------- camera rig: clamped to the FRONT of the single row ---------------- */
    // Tuned against the card photograph: distance as a fraction of the row's
    // width, then its heading and tilt.
    const MSB_R=1.05,MSB_TH=1.15,MSB_PH=1.42;
    const C={x:3.4,y:1.1,z:.5};
    const VIEWS={
      overview:{t:new THREE.Vector3(C.x,C.y,C.z),r:7.4,th:0,ph:1.35},
      front:{t:new THREE.Vector3(C.x,C.y,C.z),r:3.2,th:0,ph:1.52}
    };
    let V=VIEWS.front;
    let target=V.t.clone(),radius=V.r,theta=V.th,phi=V.ph;
    let tGoal=target.clone(),rGoal=radius,thGoal=theta,phGoal=phi,glide=false;
    const R_MIN=1.4;let RF_MAX=3.2;                 // default = max zoom-out; user can only zoom in from here
    let panX0=.7,panX1=6.1;                          // pan limits along the lineup (set from bounds)
    this._goView=(v)=>{
      const W=VIEWS[v]||VIEWS.overview;
      tGoal=W.t.clone();rGoal=W.r;thGoal=W.th;phGoal=W.ph;glide=true;
      if(this._reduce){target.copy(tGoal);radius=rGoal;theta=thGoal;phi=phGoal;glide=false;dirty=true;}
    };
    this._goSection=(id)=>{
      const s=sections[id];if(!s)return;
      this._view='front';this._sync();
      tGoal=new THREE.Vector3(Math.min(panX1,Math.max(panX0,s.centre.x)),C.y,C.z);
      rGoal=2.4;thGoal=0;phGoal=1.52;glide=true;
      if(this._reduce){target.copy(tGoal);radius=rGoal;theta=thGoal;phi=phGoal;glide=false;dirty=true;}
    };
    this._lookKey=(k)=>{
      if(this._view!=='front')return false;
      const st=.35;
      if(k==='ArrowLeft'){target.x=Math.max(panX0,target.x-st);glide=false;dirty=true;return true;}
      if(k==='ArrowRight'){target.x=Math.min(panX1,target.x+st);glide=false;dirty=true;return true;}
      if(k==='+'||k==='='){radius=Math.max(R_MIN,radius*.9);glide=false;dirty=true;return true;}
      if(k==='-'||k==='_'){radius=Math.min(RF_MAX,radius*1.1);glide=false;dirty=true;return true;}
      return false;
    };
    let dragging=false,px=0,py=0;
    cv.addEventListener('pointerdown',e=>{if(this._view!=='front')return;dragging=true;glide=false;px=e.clientX;py=e.clientY;cv.classList.add('drag');cv.setPointerCapture(e.pointerId);this._downAt=Date.now();});
    cv.addEventListener('pointerup',()=>{dragging=false;cv.classList.remove('drag');});
    cv.addEventListener('pointerleave',()=>{this._hoverDirty=false;this._applyHover(null);});
    cv.addEventListener('pointermove',e=>{
      if(dragging){
        // slide along the lineup only — no rotation
        target.x=Math.min(panX1,Math.max(panX0,target.x-(e.clientX-px)*.0016*radius));
        px=e.clientX;py=e.clientY;dirty=true;
      }else{
        const r=cv.getBoundingClientRect();
        this._mx=((e.clientX-r.left)/r.width)*2-1;this._my=-((e.clientY-r.top)/r.height)*2+1;this._hoverDirty=true;
      }
    });
    cv.addEventListener('wheel',e=>{if(this._view!=='front')return;e.preventDefault();glide=false;radius=Math.min(RF_MAX,Math.max(R_MIN,radius*(1+e.deltaY*.0012)));dirty=true;},{passive:false});

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
        const rr=radius+(1-e)*2.4;
        camera.position.set(
          target.x+rr*Math.sin(phi)*Math.sin(theta),
          target.y+rr*Math.cos(phi)+.4*(1-e),
          target.z+rr*Math.sin(phi)*Math.cos(theta));
        camera.lookAt(target);
        renderer.render(scene,camera);
      }
    };
    this._tick=tick;
    this._goView('front');
    tick();
  }
}
if(!customElements.get('lm-msb-viewer'))customElements.define('lm-msb-viewer',LMMsbViewer);
})();
