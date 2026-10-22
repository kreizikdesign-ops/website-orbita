(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Появление первого экрана ---------- */

  function reveal() { root.classList.add('is-loaded'); }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]).then(reveal);
  } else {
    reveal();
  }

  /* ---------- Время в Москве ---------- */

  var clock = document.getElementById('clock');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- Шапка, меню, кнопка «наверх» ---------- */

  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    toTop.classList.toggle('is-visible', y > window.innerHeight * 1.2);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', function () { setMenu(!header.classList.contains('menu-open')); });
  document.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  // подсветка текущего раздела в меню
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) spy.observe(target);
    });
  }

  /* ---------- Счётчики в блоке «О нас» ---------- */

  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    counters.forEach(function (el) { el.textContent = '0'; });
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObs.unobserve(entry.target);
        var el = entry.target, end = +el.dataset.count, start = performance.now(), dur = 1400;
        (function step(now) {
          var p = Math.min((now - start) / dur, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: .6 });
    counters.forEach(function (el) { countObs.observe(el); });
  }

  /* ---------- Отзывы ---------- */

  var slides = document.querySelectorAll('.quote__slide');
  var quoteIndex = document.getElementById('quoteIndex');
  var current = 0;
  document.querySelectorAll('.quote__nav [data-dir]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      slides[current].classList.remove('is-active');
      current = (current + +btn.dataset.dir + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      quoteIndex.textContent = current + 1;
    });
  });

  /* ---------- Формы ---------- */

  var auditForm = document.getElementById('auditForm');
  var auditMsg = document.getElementById('auditMsg');
  auditForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = auditForm.elements.email;
    if (!input.value.trim() || !input.checkValidity()) {
      auditMsg.textContent = 'Проверьте адрес: в нём должны быть «@» и домен, например you@company.ru';
      auditMsg.classList.add('is-error');
      input.focus();
      return;
    }
    // TODO: отправка на сервер
    auditMsg.classList.remove('is-error');
    auditMsg.textContent = 'Заявка на аудит отправлена. Результат придёт на ' + input.value.trim() + ' в течение 48 часов.';
    auditForm.classList.add('is-done');
  });

  // кнопки тарифов отмечают нужную тему в форме заявки
  var planTopic = { 'Аудит': 'Аудит' };
  document.querySelectorAll('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      var value = planTopic[a.dataset.plan];
      if (!value) return;
      var box = document.querySelector('.chip input[value="' + value + '"]');
      if (box) box.checked = true;
    });
  });

  var form = document.getElementById('contactForm');
  var done = document.getElementById('formDone');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstInvalid = null;
    ['name', 'contact'].forEach(function (name) {
      var input = form.elements[name];
      var field = input.closest('.field');
      var ok = input.value.trim().length > 1;
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }
    // TODO: отправка на сервер
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });
  form.addEventListener('input', function (e) {
    var field = e.target.closest('.field');
    if (field && field.classList.contains('is-invalid') && e.target.value.trim().length > 1) {
      field.classList.remove('is-invalid');
      e.target.removeAttribute('aria-invalid');
    }
  });

  /* ---------- 3D-сфера ---------- */

  initOrb();

  function initOrb() {
    var canvas = document.getElementById('orb');
    var hero = document.querySelector('.hero');
    if (!canvas || !window.THREE) { root.classList.add('no-webgl'); return; }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      root.classList.add('no-webgl');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var FOV = 35, CAM_Z = 8;
    var camera = new THREE.PerspectiveCamera(FOV, 1, .1, 100);
    camera.position.z = CAM_Z;

    var noise = [
      'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
      'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
      'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
      'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
      'float snoise(vec3 v){',
      '  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);',
      '  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
      '  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g;',
      '  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
      '  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
      '  i=mod289(i);',
      '  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
      '  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
      '  vec4 j=p-49.*floor(p*ns.z*ns.z);',
      '  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);',
      '  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;',
      '  vec4 h=1.-abs(x)-abs(y);',
      '  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
      '  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.;',
      '  vec4 sh=-step(h,vec4(0.));',
      '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
      '  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
      '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
      '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
      '  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);',
      '  m=m*m;',
      '  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
      '}'
    ].join('\n');

    var vertexShader = [
      'uniform float uTime; uniform float uAmp;',
      'varying vec3 vN; varying vec3 vV; varying float vRaw;',
      noise,
      'float field(vec3 n){ return snoise(n*.95+vec3(0.,uTime*.2,0.)) + .2*snoise(n*2.2-vec3(uTime*.25)); }',
      'vec3 orth(vec3 v){ return normalize(abs(v.x)>abs(v.z)?vec3(-v.y,v.x,0.):vec3(0.,-v.z,v.y)); }',
      'void main(){',
      '  vec3 n=normalize(position);',
      '  float f=field(n);',
      '  vec3 pos=n*(1.+f*uAmp);',
      '  vec3 t=orth(n); vec3 b=normalize(cross(n,t));',
      '  vec3 n1=normalize(n+t*.012); vec3 n2=normalize(n+b*.012);',
      '  vec3 p1=n1*(1.+field(n1)*uAmp); vec3 p2=n2*(1.+field(n2)*uAmp);',
      '  vec3 dn=normalize(cross(p1-pos,p2-pos)); if(dot(dn,n)<0.) dn=-dn;',
      '  vRaw=f;',
      '  vN=normalize(normalMatrix*dn);',
      '  vec4 mv=modelViewMatrix*vec4(pos,1.);',
      '  vV=-mv.xyz;',
      '  gl_Position=projectionMatrix*mv;',
      '}'
    ].join('\n');

    var fragmentShader = [
      'uniform float uTime;',
      'varying vec3 vN; varying vec3 vV; varying float vRaw;',
      'void main(){',
      '  vec3 N=normalize(vN); vec3 V=normalize(vV);',
      '  vec3 orange=vec3(1.,.42,.1);',
      '  float ndv=max(dot(N,V),0.);',
      '  float fres=pow(1.-ndv,2.6);',
      '  vec3 L=normalize(vec3(-.55,.75,.6));',
      '  vec3 H=normalize(L+V);',
      '  float diff=max(dot(N,L),0.);',
      '  float spec=pow(max(dot(N,H),0.),70.);',
      '  vec3 R=reflect(-V,N);',
      '  float sky=smoothstep(.55,.95,R.y)*smoothstep(-.2,.4,-R.x*.3+.2);',
      '  vec3 col=vec3(.018,.015,.014)+vec3(.05,.045,.04)*diff;',
      '  col+=vec3(.9,.86,.8)*sky*.22;',
      '  col+=vec3(1.,.92,.85)*spec*.9;',
      '  vec3 L2=normalize(vec3(.6,-.5,-.2));',
      '  col+=orange*pow(max(dot(N,L2),0.),2.)*.55;',
      '  col+=orange*fres*1.5;',
      '  float crack=smoothstep(-.42,-.8,vRaw);',
      '  float core=smoothstep(-.68,-.95,vRaw);',
      '  col+=orange*crack*(.55+.25*sin(uTime*1.3));',
      '  col+=vec3(1.,.8,.6)*core*.8;',
      '  gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');

    var uniforms = { uTime: { value: 0 }, uAmp: { value: .1 } };
    var orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 60),
      new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vertexShader, fragmentShader: fragmentShader })
    );

    var group = new THREE.Group();
    var tilt = new THREE.Group();
    group.add(tilt);
    tilt.add(orb);
    scene.add(group);

    // орбиты и спутник
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, .0045, 8, 220),
      new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: .7 })
    );
    ring.rotation.set(1.22, .28, 0);
    tilt.add(ring);

    var ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, .003, 8, 240),
      new THREE.MeshBasicMaterial({ color: 0xede7df, transparent: true, opacity: .16 })
    );
    ring2.rotation.set(1.36, -.42, 0);
    tilt.add(ring2);

    var satellite = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffb37a }));
    ring.add(satellite);

    // частицы вокруг
    var COUNT = 900;
    var positions = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      var r = 1.7 + Math.pow(Math.random(), 1.6) * 2.4;
      var a = Math.random() * Math.PI * 2;
      var y = (Math.random() - .5) * .5 * (r - 1.2);
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    var dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xff8a45, size: .016, transparent: true, opacity: .75,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    dust.rotation.x = .32;
    tilt.add(dust);

    // размер и положение сферы зависят от раскладки экрана
    var viewH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    var baseY = 0;

    function layout() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      var mobile = window.innerWidth <= 900;
      var headerH = mobile ? 68 : 76;
      // на телефоне сфера ниже слова ORBITA и перекрывает только его нижнюю часть
      var centerPx = mobile ? headerH + 50 + window.innerWidth * .36 : h * .44;
      var radiusPx = mobile ? window.innerWidth * .25 : Math.min(h * .235, w * .18);

      var unit = viewH / h;
      baseY = (h / 2 - centerPx) * unit;
      group.scale.setScalar(radiusPx * unit);
    }
    layout();
    window.addEventListener('resize', layout);

    // реакция на курсор
    var mouse = { x: 0, y: 0 }, eased = { x: 0, y: 0 }, energy = 0, last = { x: 0, y: 0 };
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX / window.innerWidth * 2 - 1;
      mouse.y = e.clientY / window.innerHeight * 2 - 1;
      var d = Math.hypot(e.clientX - last.x, e.clientY - last.y);
      energy = Math.min(energy + d * .002, 1);
      last.x = e.clientX; last.y = e.clientY;
    }, { passive: true });

    // не рисуем, когда первый экран вне видимости
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(hero);
    }

    var speed = reduceMotion ? .25 : 1;
    var clockT = new THREE.Clock();
    var t = 0;

    function frame() {
      requestAnimationFrame(frame);
      if (!visible) { clockT.getDelta(); return; }
      var dt = Math.min(clockT.getDelta(), .05);
      t += dt * speed;

      eased.x += (mouse.x - eased.x) * .04;
      eased.y += (mouse.y - eased.y) * .04;
      energy *= .96;

      uniforms.uTime.value = t;
      uniforms.uAmp.value = .1 + energy * .06;

      orb.rotation.y = t * .12;
      tilt.rotation.y = eased.x * .35;
      tilt.rotation.x = eased.y * .2;
      dust.rotation.y = t * .03;

      var sa = t * .5;
      satellite.position.set(Math.cos(sa) * 1.6, Math.sin(sa) * 1.6, 0);

      var scrollShift = Math.min(window.scrollY / window.innerHeight, 1);
      group.position.y = baseY + scrollShift * .9;

      renderer.render(scene, camera);
    }
    frame();
  }
})();
