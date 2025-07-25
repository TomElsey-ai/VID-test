import { ClientExperiencePlayer } from 'https://a200286d2stmain.blob.core.windows.net/frontends/vedo-poc/dist/vedo-experience-player.js';


const style = document.createElement('style');
style.textContent = `
    #player-container *:not(progress) {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover;
        transition: none !important;
}`;
document.head.appendChild(style);

// === Global Declarations ===
let target = null;
let follower = null;
let resizeObserver = null;
let player = null;
let currentImgNode = null;
let lastURL = '';

const LDClient = window.LDClient;
console.log('LDClient', LDClient);
const clientSideId = '6780145a1ccd92099bb0fbb8';
const locale = window.location.pathname.split('/')[1];
const model = window.location.pathname.split('/')[3];

const context = {
  kind: 'user',
  key: 'user-id-123abc',
  name: 'Sandy',
  email: 'sandy@testcorp.com',
  locale: locale,
  model: model,
};

console.log('context', context);

const client = LDClient.initialize(clientSideId, context);
client.on('initialized', function () {
  console.log('SDK successfully initialized!');

  const VedoExperience = client.variation('vedo_d2c_experience', false);
  console.log("Our first feature flag is: " + VedoExperience);
});

  const lyriqProjectId = "893b9ec8-fa3d-42a6-8cbd-7e6c6632c513";
  // const lyriqProjectId = "c670cc78-584e-4e71-b9b9-3bcf0fae12cf";
  // const lyriqProjectId = "c96976fd-9136-4381-aae5-2fe69b212b06";
  const targetSelector = '.transitionGroupSlides';
  const targetSelectorFull = '.swiper';
  const paramsSelector = '.transitionGroupSlides img';

  // === Setup the floating VEDO container ===
  function setUpVEDOContainer() {
      const container = document.createElement('div');
      container.id = 'player-container';
      Object.assign(container.style, {
          position: 'fixed',
          zIndex: '9999999',
          transition: 'none',
          // border: 'red 3px solid',
      });
      document.body.appendChild(container);
      follower = container;
  }

  // === Sync follower VEDO container to target position and size ===
  function syncPosition() {
      if (!target || !follower) return;
      const rect = target.getBoundingClientRect();
      Object.assign(follower.style, {
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`
      });
  }

  // === Target detection and re-observation ===
  function findTarget() {
      const newTarget = document.querySelector(targetSelectorFull) || document.querySelector(targetSelector);
      if (newTarget && newTarget !== target) {
          if (resizeObserver) resizeObserver.disconnect();
          target = newTarget;
          resizeObserver = new ResizeObserver(() => syncPosition());
          resizeObserver.observe(target);
          syncPosition();
      }
  }

  // === Frame-synced animation loop for real-time updates ===
  function animationLoop() {
      if (!target || !document.body.contains(target)) {
          target = null;
          findTarget();
      }
      syncPosition();
      requestAnimationFrame(animationLoop);
  }

  function fadePlayer( type = 'in') {
    if (!player) return;
    let element = document.getElementById('player-container');
    // let duration = 500
    // player.style.transition = `opacity ${duration}ms ease`;
    // player.style.opacity = type === 'in' ? 0 : 1;
    // player.style.display = 'block';

    // Force reflow to apply initial opacity before transitioning
    // void element.offsetWidth;

    if (type === 'in') {
      element.style.visibility = 'visible';
    } else {
      element.style.visibility = 'hidden';
    }
  }

  // === Check for replaced image node and rebind ===
  const imageNodeMonitor = new MutationObserver(() => {
      const newImgNode = document.querySelector(paramsSelector);

      if (!newImgNode || newImgNode === currentImgNode) return;

      const newSrc = newImgNode.getAttribute('src');
      const oldSrc = currentImgNode?.getAttribute('src') || '';

      if (newSrc && oldSrc && newSrc !== oldSrc) {
          const newURL = new URL(newSrc);
          console.log('newURL', newURL);
          if (newURL.href.includes('interior')) {console.log('interior image'); fadePlayer('out');}
          else if (newURL.href.includes('exterior')) {console.log('exterior image'); fadePlayer('in');}
          const oldURL = new URL(oldSrc);
          const params = findParamDiffs(newURL, oldURL);

          console.log('params', { params });

          const diff = params._diff?.i?.diff?.rpos;
          console.log('diff', diff);
          if (diff && player) {
              player.handleVehicleConfigurationChange('', diff);
          }
      }

      currentImgNode = newImgNode;
      observeImageNode(currentImgNode);
  });

  // === Observe mutation on current image node ===
  let imageMutationObserver = null;
  function observeImageNode(node) {
      if (!node) return;
      if (imageMutationObserver) imageMutationObserver.disconnect();

      imageMutationObserver = new MutationObserver(mutationList => {
          for (const mutation of mutationList) {
              if (mutation.attributeName === "src") {

                  console.log('mutation', mutation);
                  const newSrc = node.getAttribute('highresolutionurl');
                  // console.log('newSrc', newSrc);
                  // if (newSrc.contains('interior')) {console.log('interior image')};
                  const oldSrc = node.getAttribute('data-loaded-src');

                  if (!newSrc || !oldSrc || newSrc === lastURL) return;
                  lastURL = newSrc;

                  const newURL = new URL(newSrc);
                  const oldURL = new URL(oldSrc);
                  const params = findParamDiffs(newURL, oldURL);

                  console.log('params', { params });

                  const diff = params._diff?.i?.diff?.rpos;
                  console.log('diff', diff);
                  if (diff && player) {
                      console.log('player true', diff);
                      player.handleVehicleConfigurationChange('', diff);
                  }
              }
          }
      });

      imageMutationObserver.observe(node, { attributes: true });
  }

  // === Image Param Parsing and Diffing ===
  function parseImageParam(value) {
      const sections = value.split('.')[0].split('/');
      const series = sections[2];
      const last = sections[3].split('gmds');

      return {
          modelYear: sections[0],
          model: sections[1],
          series,
          trim: series.split('__')[1],
          rpos: last[0].split('_'),
          resolution: `gmds${last[1]}`
      };
  }

  function imageParamsDiffs(a, b) {
      const result = {};
      for (const [key, aValue] of Object.entries(a)) {
          const bValue = b[key];
          if (key === 'rpos') {
              const aSet = new Set(aValue);
              const bSet = new Set(bValue);
              result[key] = [...aSet].filter(x => !bSet.has(x));
          } else if (aValue !== bValue) {
              result[key] = aValue;
          }
      }
      return result;
  }

  function findParamDiffs(newURL, oldURL) {
      const params = {};
      const keys = new Set([...newURL.searchParams.keys(), ...oldURL.searchParams.keys()]);

      for (const key of keys) {
          const newValue = newURL.searchParams.get(key);
          const oldValue = oldURL.searchParams.get(key);
          params[key] = key === 'i' ? parseImageParam(newValue) : newValue;

          if (newValue !== oldValue) {
              if (key === 'i') {
                  const newImageParams = parseImageParam(newValue);
                  const oldImageParams = parseImageParam(oldValue);
                  params['_diff'] = {
                      [key]: {
                          newValue: newImageParams,
                          oldValue: oldImageParams,
                          diff: imageParamsDiffs(newImageParams, oldImageParams)
                      }
                  };
              } else {
                  params['_diff'] = {
                      [key]: {
                          newValue,
                          oldValue,
                      }
                  };
              }
          }
      }
      return params;
  }

  // === Initialization ===

    const initObserver = new MutationObserver(() => {
        const imgNode = document.querySelector(paramsSelector);
        if (!imgNode) return;

        initObserver.disconnect();
        console.log('****** Initial image found. Setting up VEDO...');

        currentImgNode = imgNode;
        observeImageNode(currentImgNode);

        setUpVEDOContainer();
        findTarget();
        animationLoop();

        const startPlayer = async () => {
            player = await ClientExperiencePlayer.create(lyriqProjectId, follower, {
                baseUrl: 'https://VEDO-public-dev.musea2.azure.ext.gm.com/delivery',
            });
            console.log('player created');
            await player.renderExperience('3D');
            console.log('experience rendered', player);
        };

        startPlayer();
        imageNodeMonitor.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

    initObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
