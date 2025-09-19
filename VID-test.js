import { ClientExperiencePlayer } from 'https://a200286d2stmain.blob.core.windows.net/frontends/vedo-poc/v3/dist/vedo-experience-player.js';
let timeStrart = Date.now();
const style = document.createElement('style');
style.textContent = `
  #player-container *:not(progress) {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover;
      transition: none !important;
  }
  
  #player-container *:is(progress) {
      display: none !important;
  }

  button#view-change-button {
  position: fixed;
  bottom: 32px;
  left: 32px;
  z-index: 10000001;
  padding: 12px 24px;
  font-size: 18px;
  background: #282828;
  color: #fff;
  border: solid 2px #282828;
  border-radius: 8px;
  cursor: pointer;
  font-family: CadillacGothic-Regular, CadillacGothic-NarrowRegular, Arial, NanumSquare, sans-serif;
  transition: background-color 0.3s ease-in-out,
              color 0.3s ease-in-out,
              opacity 0.5s ease-in-out;
}
      
  button#view-change-button:hover {
      background-color: #fff;
      color: #222;
  }
  `
  ;
document.head.appendChild(style);

// === Global Declarations ===
let target = null;
let follower = null;
let resizeObserver = null;
let player = null;
let currentImgNode = null;
let lastURL = '';
let VedoExperience = null;
const configurationEngine = null;
let viewChangebutton = null


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

// client.on('initialized', function () {
//     console.log('SDK successfully initialized!');

//     VedoExperience = client.variation('vedo_d2c_experience', false);

// });

const rpoChangeFormat = (rpo) => {
  if (!rpo) return null;
  // return rpo.map((r) => {
  //     if (r === '0') return '0';
  //     if (r === '1') return '1';
  //     if (r === '2') return '2';

  return {
    optionCode: rpo,
    action: 'SELECT',
  };
  // });
};

const seriesTranslate = (series) => {
  const seriesMap = {
    '6MD26__1SM': '6MD26_1SM',
  };
  return seriesMap[series] || series;
};

// function for creating loading overlay
const createLoadingOverlay = () => {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',    
    height: '100%',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    display: 'flex',  
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '24px',
    zIndex: '10000000',
  });

  document.body.appendChild(overlay);
//  setInertAllExcept(overlay);
  overlay.textContent = 'Loading 3D Experience...';
  return overlay;

}

const loadingStyle = document.createElement("style");
loadingStyle.textContent = `
  .loader {
      width: 48px;
      height: 48px;
      border: 5px solid #FFF;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
      }

      @keyframes rotation {
      0% {
          transform: rotate(0deg);
      }
      100% {
          transform: rotate(360deg);
      }
    } 
`;
document.head.appendChild(loadingStyle);

// const 3Dbutton =
  
// let prevActive = null;
// let prevOverflow = '';
// let inerted = [];
// let visible = false;

// function setInertAllExcept(node) {
//   // Inert all top-level children of body except the overlay
//   inerted = [];
//   [...document.body.children].forEach(el => {
//     if (el !== node) {
//       if (!('inert' in el)) return; // older browsers: inert polyfill recommended
//       if (!el.inert) {
//         el.inert = true;
//         inerted.push(el);
//       }
//     }
//   });
// }

// function clearInert() {
//   inerted.forEach(el => (el.inert = false));
//   inerted = [];
// }

// function lockScroll() {
//   prevOverflow = document.documentElement.style.overflow;
//   document.documentElement.style.overflow = 'hidden';
// }
function setInertAllExcept(node) {
  // Inert all top-level children of body except the given node
  [...document.body.children].forEach(el => {
    if (el !== node && 'inert' in el) {
      el.inert = true;
    }
  });

  // Lock scroll
  document.documentElement.style.overflow = 'hidden';

  // Prevent clicks on other elements except the node
  function blockEvent(e) {
    if (!node.contains(e.target)) {
      e.stopPropagation();
      e.preventDefault();
    }
  }
  document.addEventListener('click', blockEvent, true);
  document.addEventListener('mousedown', blockEvent, true);
  document.addEventListener('touchstart', blockEvent, true);

  // Store cleanup function on node for later use
  node._restoreInert = () => {
    [...document.body.children].forEach(el => {
      if ('inert' in el) el.inert = false;
    });
    document.documentElement.style.overflow = '';
    document.removeEventListener('click', blockEvent, true);
    document.removeEventListener('mousedown', blockEvent, true);
    document.removeEventListener('touchstart', blockEvent, true);
    delete node._restoreInert;
    Object.assign(node.style, { display: 'none' });
    node.remove(); // or node.parentNode.removeChild(node);
  };



  // setTimeout( () => {
  //   console.log('auto removing overlay');
  //   node._restoreInert();
  //   Object.assign(node.style, { display: 'none' });
  //   // node.remove(); // or node.parentNode.removeChild(node);
  // }, 15000); // auto-remove after 10 seconds
}

// Ensure LDClient is defined, waiting if necessary
async function getLDClient() {
  if (window.LDClient) return window.LDClient;
  // Wait for LDClient to be defined (e.g., loaded by a script)
  return new Promise((resolve) => {
    const check = () => {
      if (window.LDClient) {
        resolve(window.LDClient);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

let LDClient;
(async () => {
  LDClient = await getLDClient();

const client = LDClient?.initialize(clientSideId, context);
console.log('LDClient', LDClient);
client?.on('initialized', async function () {
  console.log('SDK successfully initialized!');
  // const loadingOVerlay = createLoadingOverlay();
  VedoExperience = await client.variation('vedo_d2c_experience', false);
  console.log('VedoExperience: ' + VedoExperience);

  if (VedoExperience) {
    console.log('VEDO Experience is enabled, initializing...');
    // ... (rest of your code here, unchanged)
    // const lyriqProjectId = "8147d2cd-ecd7-4195-bb0c-1a5bfa8cadfc";
    // const lyriqProjectId = "893b9ec8-fa3d-42a6-8cbd-7e6c6632c513";
    // const lyriqProjectId = "c670cc78-584e-4e71-b9b9-3bcf0fae12cf";
    const lyriqVProjectId = "882d52ae-e329-441a-a4fc-cc80dc47c54c";
    const urlProjectId = new URLSearchParams(window.location.search).get('projectid');
    console.log('urlProjectId', urlProjectId);
    const lyriqProjectId = urlProjectId || (model === 'lyriq-v' && lyriqVProjectId) ||'882d52ae-e329-441a-a4fc-cc80dc47c54c';
    console.log('lyriqProjectId', lyriqProjectId);
    // const targetSelector = '.transitionGroupSlides';
    const targetSelector = '#configurator-gallery';
    const targetSelectorFull = '.swiper';
    const paramsSelector = '.transitionGroupSlides img';

    // === Setup the floating VEDO container ===
    function setUpVEDOContainer() {
      const container = document.createElement('div');
      container.id = 'player-container';
      Object.assign(container.style, {
        position: 'fixed',
        zIndex: '9999999',
        transition: 'opacity 0.5s ease-in-out',
        // border: 'red 3px solid',
        backgroundColor: '#ffffff',
      });
      document.body.appendChild(container);
      follower = container;
      viewChangebutton = create3DViewButton();
    }

    function create3DViewButton() {
      const button = document.createElement('button');
      button.textContent = '3D View';
      button.id = 'view-change-button';
      // button.style.position = 'fixed';
      // button.style.bottom = '32px';
      // button.style.left = '32px';
      // button.style.zIndex = '10000001';
      // button.style.padding = '12px 24px';
      // button.style.fontSize = '18px';
      // button.style.background = '#282828';
      // button.style.color = '#fff';
      // button.style.border = 'solid 2px #282828';
      // button.style.borderRadius = '8px';
      // button.style.cursor = 'pointer';
      // button.style['font-family'] = 'CadillacGothic-Regular, CadillacGothic-NarrowRegular, Arial, NanumSquare, sans-serif';
      // button.style.transition = 'background-color 0.3s ease-in-out, color 0.3s ease-in-out, opacity 0.5s ease-in-out';
      button.addEventListener('click', async () => {
        console.log('3D View clicked');
        if (player) {
          button.textContent = 'Loading...';
          button.disabled = true;
          await player.renderExperience('3D');
          button.style.opacity = '0';
          setTimeout(() => {
            button.style.display = 'none';
          }, 500);
        }
      });
      document.body.appendChild(button);
      return button;
    }

    

    // === Sync follower VEDO container to target position and size ===
    function syncPosition() {
      if (!target || !follower) return;
      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);
      Object.assign(follower.style, {
        top: `calc(${rect.top}px + ${style.paddingTop})`,
        left: `calc(${rect.left}px + ${style.paddingLeft})`,
        width: `calc(${rect.width}px - ${style.paddingLeft} - ${style.paddingRight})`,
        height: `calc(${rect.height}px - ${style.paddingTop} - ${style.paddingBottom})`,
      });
      // console.log('syncPosition', { rect, style, follower });
      // if (viewChangebutton) {
      //   Object.assign(viewChangebutton.style, {
      //     bottom: `${rect.bottom}px`,
      //     left: `${rect.left}px`,
      //   });

      // }
    }

    window.addEventListener('scroll', syncPosition);

    // === Target detection and re-observation ===
    function findTarget() {
      const newTarget =
        document.querySelector(targetSelectorFull) || document.querySelector(targetSelector);
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

    function fadePlayer(type = 'in') {
      if (!player) return;
      const playerElement = document.getElementById('player-container');
      if (type === 'in') {
        playerElement.style.visibility = 'visible';
        playerElement.style.opacity = '1';
        viewChangebutton.style.visibility = 'visible';
        viewChangebutton.style.opacity = '1';
      } else {
        playerElement.style.opacity = '0';
        viewChangebutton.style.opacity = '0';
        setTimeout(() => {
          playerElement.style.visibility = 'hidden';
          viewChangebutton.style.visibility = 'hidden';
        }, 500);
      }
    }

    // === Check for replaced image node and rebind ===
    const imageNodeMonitor = new MutationObserver(() => {
      const newImgNode = document.querySelector(paramsSelector);

      if (!newImgNode || newImgNode === currentImgNode) return;

      const newSrc = newImgNode?.getAttribute('src');
      const oldSrc = currentImgNode?.getAttribute('src') || '';

      if (newSrc && oldSrc && newSrc !== oldSrc) {
        const newURL = new URL(newSrc);
        console.log('newURL', newURL);
        if (newURL.href.includes('interior')) {
          console.log('interior image');
          fadePlayer('out');
        } else if (newURL.href.includes('exterior')) {
          console.log('exterior image');
          fadePlayer('in');
        }
        const oldURL = new URL(oldSrc);
        const params = findParamDiffs(newURL, oldURL);

        console.log('params fire', { params });

        const diff = params._diff?.i?.diff?.rpos;
        if (params._diff?.i?.diff?.series) {
          diff?.unshift(params._diff?.i?.diff?.series);
        }
        console.log('diff', diff);
        if (diff && player && diff.length > 0) {
          // player.configurationEngine.changeOptionSelection('', diff);
          const changeArray = diff.map((r) => rpoChangeFormat(r));
          console.log('changeArray', changeArray);
          player.vehicleConfiguration.changeVehicleConfiguration({ changes: changeArray });
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

      imageMutationObserver = new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          if (mutation.attributeName === 'src') {
            console.log('mutation', mutation);
            const newSrc = node.getAttribute('highresolutionurl');
            const oldSrc = node.getAttribute('data-loaded-src');

            if (!newSrc || !oldSrc || newSrc === lastURL) return;
            lastURL = newSrc;

            const newURL = new URL(newSrc);
            const oldURL = new URL(oldSrc);
            const params = findParamDiffs(newURL, oldURL);

            console.log('params', params);

            const diff = params._diff?.i?.diff?.rpos;
            if (params._diff?.i?.diff?.series) {
              diff?.unshift(params._diff?.i?.diff?.series);
            }
            console.log('diff', diff);
            if (diff && player && diff.length > 0) {
              console.log('player true', diff);
              // player.configurationEngine.changeOptionSelection('', diff);
              const changeArray = diff.map((r) => rpoChangeFormat(r));
              console.log('changeArray', changeArray);
              player.vehicleConfiguration.changeVehicleConfiguration({ changes: changeArray });
            }
          }
        }
      });

      imageMutationObserver.observe(node, { attributes: true });
    }

    // === Image Param Parsing and Diffing ===
    function parseImageParam(value) {
      const sections = value.split('.')[0].split('/');
      console.log('sections', sections);
      const series = sections[2];
      console.log('series', series);
      const last = sections[3].split('gmds');

      return {
        modelYear: sections[0],
        model: sections[1],
        series,
        trim: series.split('__')[1],
        rpos: last[0].split('_'),
        resolution: `gmds${last[1]}`,
      };
    }

    function imageParamsDiffs(a, b) {
      const result = {};
      for (const [key, aValue] of Object.entries(a)) {
        const bValue = b[key];
        if (key === 'rpos') {
          const aSet = new Set(aValue);
          const bSet = new Set(bValue);
          result[key] = [...aSet].filter((x) => !bSet.has(x));
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
            params._diff = {
              [key]: {
                newValue: newImageParams,
                oldValue: oldImageParams,
                diff: imageParamsDiffs(newImageParams, oldImageParams),
              },
            };
          } else {
            params._diff = {
              [key]: {
                newValue,
                oldValue,
              },
            };
          }
        }
      }
      return params;
    }
    // function findSeriesDiff(newURL, oldURL)  {
    //     const params = {};
    //     const keys = new Set([...newURL.searchParams.keys(), ...oldURL.searchParams.keys()]);
    //     console.log('keys', keys);
    //     for (const key of keys) {
    //         const newValue = newURL.searchParams.get(key);
    //         console.log('newValue', newValue);
    //         const oldValue = oldURL.searchParams.get(key);
    //         console.log('oldValue', oldValue);
    //         params[key] = key === 'i' ? parseImageParam(newValue) : newValue;

    //         if (newValue !== oldValue) {
    //             if (key === 'i') {
    //                 const newImageParams = parseImageParam(newValue);
    //                 const oldImageParams = parseImageParam(oldValue);
    //                 params['_diff'] = {
    //                     [key]: {
    //                         newValue: newImageParams,
    //                         oldValue: oldImageParams,
    //                         diff: imageParamsDiffs(newImageParams, oldImageParams)
    //                     }
    //                 };
    //             } else {
    //                 params['_diff'] = {
    //                     [key]: {
    //                         newValue,
    //                         oldValue,
    //                     }
    //                 };
    //             }
    //         }
    //     }
    //     return params;
    // }

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
        console.log('clientexperienceplayer', ClientExperiencePlayer);
        player = await ClientExperiencePlayer.create(lyriqProjectId, follower, {
          baseUrl: 'https://vedo.apps.gmna.dev.krypton.atmosdt.gm.com/delivery',
        });
        console.log('player created');
        await player.renderExperience('2D');
        console.log('experience rendered', player);
        await player.vehicleConfiguration.changeVehicleConfiguration({
          changes: [
            {
              optionCode: '6MD26_1SM',
              action: 'SELECT',
            },
          ],
        }); // Initial call to set up the player
        // loadingOVerlay._restoreInert();
        console.log('Time to experience', (Date.now() - timeStrart)/1000, 'seconds ', lyriqProjectId);
        window.player = player;
      };

      startPlayer();
      imageNodeMonitor.observe(document.body, {
        childList: true,
        subtree: true,
      });
      window.addEventListener('scroll', syncPosition);
      window.addEventListener('resize', syncPosition);
    });

    initObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
});
})();
