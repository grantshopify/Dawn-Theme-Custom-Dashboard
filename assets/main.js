// Custom JS Starts Here
console.log('Custom JS loaded');

(() => {
  const screen = document.querySelector('.loading-screen');
  if (!screen) return;

  const root = document.documentElement;
  const frame = screen.querySelector('.loading-screen__frame');
  const media = screen.querySelector('.loading-screen__media');
  const image = screen.querySelector('.loading-screen__image');
  const IMAGE_TIMEOUT = 3000; 
  const PAGE_TIMEOUT = 1500; 
  const REMOVE_TIMEOUT = 2000;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const once = (target, ...types) =>
    new Promise((resolve) => types.forEach((type) => target.addEventListener(type, resolve, { once: true })));

  const imageSettled = image.complete ? Promise.resolve() : Promise.race([once(image, 'load', 'error'), wait(IMAGE_TIMEOUT)]);
  const pageLoaded = document.readyState === 'complete' ? Promise.resolve() : once(window, 'load');

  const playIntro = () => {
    if (image.complete && image.naturalWidth > 0) screen.classList.add('is-ready');
    if (!screen.classList.contains('is-ready')) {
      image.onload = null; 
      return Promise.resolve();
    }
    if (!frame.getAnimations) return Promise.resolve();
    const animations = [...frame.getAnimations(), ...media.getAnimations()];
    return Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
  };

  const reveal = () => {
    const { width, height } = frame.getBoundingClientRect();
    if (width && height) {
      screen.style.setProperty('--loading-screen-scale', Math.max(window.innerWidth / width, window.innerHeight / height));
    }
    screen.classList.add('is-revealing');
    const expanded = new Promise((resolve) =>
      frame.addEventListener('animationend', (event) => event.target === frame && resolve())
    );
    Promise.race([expanded, wait(REMOVE_TIMEOUT)]).then(() => {
      screen.remove();
      root.classList.remove('loading-screen-lock');
    });
  };

  root.classList.add('loading-screen-lock');
  imageSettled
    .then(playIntro)
    .then(() => Promise.race([pageLoaded, wait(PAGE_TIMEOUT)]))
    .then(reveal);
})();
// Custom JS Ends Here 
