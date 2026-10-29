// Custom JS Starts Here
console.log('Custom JS loaded');

// Custom hero banner (sections/custom-hero-banner.liquid). With "Add animation" on, its CSS
// animations wait paused on their first frame; this starts them once the banner is in view
// and its image has loaded.
const CUSTOM_HERO_BANNER_IMAGE_TIMEOUT = 2500; // start anyway if the image is slower than this

class CustomHeroBanner extends HTMLElement {
  connectedCallback() {
    if (!this.classList.contains('custom-hero-banner--animate')) return;

    const image = this.querySelector('img.custom-hero-banner__image');
    const imageReady = new Promise((resolve) => {
      if (!image || image.complete) return resolve();
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, CUSTOM_HERO_BANNER_IMAGE_TIMEOUT);
    });

    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.observer.disconnect();
        imageReady.then(() => this.classList.add('is-playing'));
      },
      { threshold: 0.3 }
    );
    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }
}

if (!customElements.get('custom-hero-banner')) customElements.define('custom-hero-banner', CustomHeroBanner);
// Custom JS Ends Here
