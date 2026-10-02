(function () {
  'use strict';

  const XY_KEY = 'survey_constants_xy';
  const Z_KEY = 'survey_constants_z';
  const SETTINGS_KEY = 'survey_constants_settings';

  let pulling = false;
  let pushing = false;
  let pushTimer = null;

  function getApiUrl() {

    try {

      const settings =
        JSON.parse(
          localStorage.getItem(SETTINGS_KEY) || '{}'
        );

      return (
        settings.apiUrl || 'https://script.google.com/macros/s/AKfycbwtXRr5GaMurhsnz9pqvpqdcytmsceuDrhYbkxcl7_I8x6uQ07yIpSCdA_HdbCOjMxD/exec'
      ).trim();

    } catch {

      return '';

    }

  }

  function read(key, fallback) {

    try {

      const value =
        localStorage.getItem(key);

      return value
        ? JSON.parse(value)
        : fallback;

    } catch {

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

      num:
        p.num != null
          ? p.num
          : (p.number != null
              ? p.number
              : ''),

      villa:
        p.villa != null
          ? p.villa
          : '',

      x:
        p.x != null
          ? p.x
          : (p.E != null ? p.E : ''),

      y:
        p.y != null
          ? p.y
          : (p.N != null ? p.N : ''),

      description:
        p.description != null
          ? p.description
          : (p.desc != null
              ? p.desc
              : '')

    };

  }

  function normalizeBench(b) {

    return {

      id:
        b.id != null
          ? b.id
          : '',

      desc:
        b.desc != null
          ? b.desc
          : '',

      Z:
        b.Z != null
          ? b.Z
          : ''

    };

  }

  async function pull() {

    const API_URL =
      getApiUrl();

    if (
      pulling ||
      !API_URL
    ) return false;

    pulling = true;

    try {

      const response =
        await fetch(
          API_URL + '?t=' + Date.now(),
          {
            method: 'GET',
            cache: 'no-store'
          }
        );

      if (!response.ok) {
        throw new Error(
          'HTTP ' + response.status
        );
      }

      const data =
        await response.json();

      if (data.error) {
        throw new Error(
          data.error
        );
      }

      if (
        Array.isArray(data.points)
      ) {

        localStorage.setItem(
          XY_KEY,
          JSON.stringify(
            data.points.map(
              normalizePoint
            )
          )
        );

      }

      if (
        Array.isArray(data.benches)
      ) {

        localStorage.setItem(
          Z_KEY,
          JSON.stringify(
            data.benches.map(
              normalizeBench
            )
          )
        );

      }

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-updated'
        )
      );

      console.log(
        '☁️ Survey Constants: تم السحب من Google Sheets'
      );

      return true;

    } catch (error) {

      console.warn(
        '☁️ Survey Constants GET:',
        error.message || error
      );

      return false;

    } finally {

      pulling = false;

    }

  }

  async function push() {

    const API_URL =
      getApiUrl();

    if (
      pushing ||
      !API_URL
    ) return false;

    pushing = true;

    try {

      const payload = {

        points:
          getXY().map(
            normalizePoint
          ),

        benches:
          getZ().map(
            normalizeBench
          )

      };

      const response =
        await fetch(
          API_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'text/plain;charset=utf-8'
            },
            body:
              JSON.stringify(payload)
          }
        );

      if (!response.ok) {
        throw new Error(
          'HTTP ' + response.status
        );
      }

      const data =
        await response.json();

      if (
        data.ok === false
      ) {

        throw new Error(
          data.error ||
          'فشل الحفظ'
        );

      }

      console.log(
        '☁️ Survey Constants: تم الرفع إلى Google Sheets'
      );

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-synced'
        )
      );

      return true;

    } catch (error) {

      console.warn(
        '☁️ Survey Constants POST:',
        error.message || error
      );

      return false;

    } finally {

      pushing = false;

    }

  }

  function schedulePush() {

    clearTimeout(
      pushTimer
    );

    pushTimer =
      setTimeout(
        function () {
          push();
        },
        700
      );

  }

  const originalSetItem =
    localStorage.setItem.bind(
      localStorage
    );

  const originalRemoveItem =
    localStorage.removeItem.bind(
      localStorage
    );

  localStorage.setItem =
    function (key, value) {

      originalSetItem(
        key,
        value
      );

      if (
        !pulling &&
        (
          key === XY_KEY ||
          key === Z_KEY
        )
      ) {

        schedulePush();

      }

    };

  localStorage.removeItem =
    function (key) {

      originalRemoveItem(
        key
      );

      if (
        !pulling &&
        (
          key === XY_KEY ||
          key === Z_KEY
        )
      ) {

        schedulePush();

      }

    };

  window.SurveyCloud = {

    get url() {
      return getApiUrl();
    },

    pull: pull,

    push: push,

    sync: pull,

    reloadConfig: function () {
      console.log(
        '☁️ API URL:',
        getApiUrl()
      );
    }

  };

  setTimeout(
    function () {

      if (getApiUrl()) {
        pull();
      }

    },
    500
  );

})();
