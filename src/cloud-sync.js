(function () {
  'use strict';

  const API_URL =
    'https://script.google.com/macros/s/AKfycbwtXRr5GaMurhsnz9pqvpqdcytmsceuDrhYbkxcl7_I8x6uQ07yIpSCdA_HdbCOjMxD/exec';

  const XY_KEY = 'survey_constants_xy';
  const Z_KEY = 'survey_constants_z';

  let pulling = false;
  let pushing = false;
  let pushTimer = null;

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getXY() {
    return read(XY_KEY, []);
  }

  function getZ() {
    return read(Z_KEY, []);
  }

  function normalizePoint(p) {
    return {
      num: p.num ?? p.number ?? '',
      villa: p.villa ?? '',
      x: p.x ?? p.E ?? '',
      y: p.y ?? p.N ?? '',
      description: p.description ?? p.desc ?? ''
    };
  }

  function normalizeBench(b) {
    return {
      id: b.id ?? '',
      desc: b.desc ?? '',
      Z: b.Z ?? ''
    };
  }

  async function pull() {
    if (pulling || !API_URL) return;

    pulling = true;

    try {
      const response = await fetch(API_URL + '?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();

      if (Array.isArray(data.points)) {
        localStorage.setItem(
          XY_KEY,
          JSON.stringify(data.points.map(normalizePoint))
        );
      }

      if (Array.isArray(data.benches)) {
        localStorage.setItem(
          Z_KEY,
          JSON.stringify(data.benches.map(normalizeBench))
        );
      }

      window.dispatchEvent(
        new CustomEvent('survey-cloud-updated')
      );

      console.log('☁️ Survey Constants: تم السحب من Google Sheets');

    } catch (error) {
      console.warn(
        '☁️ Survey Constants GET:',
        error.message || error
      );
    } finally {
      pulling = false;
    }
  }

  async function push() {
    if (pushing || !API_URL) return;

    pushing = true;

    try {
      const payload = {
        points: getXY().map(normalizePoint),
        benches: getZ().map(normalizeBench)
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();

      if (data.ok === false) {
        throw new Error(data.error || 'فشل الحفظ');
      }

      console.log('☁️ Survey Constants: تم الرفع إلى Google Sheets');

      window.dispatchEvent(
        new CustomEvent('survey-cloud-synced')
      );

    } catch (error) {
      console.warn(
        '☁️ Survey Constants POST:',
        error.message || error
      );
    } finally {
      pushing = false;
    }
  }

  function schedulePush() {
    clearTimeout(pushTimer);

    pushTimer = setTimeout(function () {
      push();
    }, 700);
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);

    if (
      !pulling &&
      (key === XY_KEY || key === Z_KEY)
    ) {
      schedulePush();
    }
  };

  localStorage.removeItem = function (key) {
    originalRemoveItem(key);

    if (
      !pulling &&
      (key === XY_KEY || key === Z_KEY)
    ) {
      schedulePush();
    }
  };

  window.SurveyCloud = {
    url: API_URL,
    pull: pull,
    push: push,
    sync: pull
  };

  setTimeout(function () {
    pull();
  }, 500);

})();
