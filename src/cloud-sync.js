(function () {
  'use strict';

  const XY_KEY = 'survey_constants_xy';
  const Z_KEY = 'survey_constants_z';
  const SETTINGS_KEY = 'survey_constants_settings';

  const DEFAULT_API_URL =
    'https://script.google.com/macros/s/AKfycbwtXRr5GaMurhsnz9pqvpqdcytmsceuDrhYbkxcl7_I8x6uQ07yIpSCdA_HdbCOjMxD/exec';

  let pulling = false;
  let pushing = false;
  let initialized = false;
  let suppressAutoPush = false;

  const originalSetItem =
    localStorage.setItem.bind(localStorage);

  const originalRemoveItem =
    localStorage.removeItem.bind(localStorage);

  function getApiUrl() {
    try {
      const settings = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) || '{}'
      );

      return String(
        settings.apiUrl || DEFAULT_API_URL
      ).trim();

    } catch {
      return DEFAULT_API_URL;
    }
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      return value
        ? JSON.parse(value)
        : fallback;

    } catch {
      return fallback;
    }
  }

  function normalizePoint(p) {
    return {
      number:
        p?.number != null
          ? p.number
          : (p?.num != null ? p.num : ''),

      villa:
        p?.villa != null
          ? p.villa
          : '',

      x:
        p?.x != null
          ? p.x
          : (p?.E != null ? p.E : ''),

      y:
        p?.y != null
          ? p.y
          : (p?.N != null ? p.N : ''),

      description:
        p?.description != null
          ? p.description
          : (p?.desc != null ? p.desc : '')
    };
  }

  function normalizeBench(b) {
    return {
      id:
        b?.id != null
          ? b.id
          : '',

      desc:
        b?.desc != null
          ? b.desc
          : '',

      Z:
        b?.Z != null
          ? b.Z
          : ''
    };
  }

  function samePoint(a, b) {
    const an = String(
      a?.number ?? ''
    ).trim();

    const bn = String(
      b?.number ?? ''
    ).trim();

    return an !== '' && an === bn;
  }

  function sameBench(a, b) {
    const ai = String(
      a?.id ?? ''
    ).trim();

    const bi = String(
      b?.id ?? ''
    ).trim();

    return ai !== '' && ai === bi;
  }

  async function fetchCloudData() {
    const API_URL = getApiUrl();

    if (!API_URL) {
      throw new Error(
        'رابط Google Sheets غير موجود'
      );
    }

    const response = await fetch(
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

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      points:
        Array.isArray(data.points)
          ? data.points.map(normalizePoint)
          : [],

      benches:
        Array.isArray(data.benches)
          ? data.benches.map(normalizeBench)
          : []
    };
  }

  function writeLocal(points, benches) {
    const previous =
      suppressAutoPush;

    suppressAutoPush = true;

    try {
      originalSetItem(
        XY_KEY,
        JSON.stringify(
          points.map(normalizePoint)
        )
      );

      originalSetItem(
        Z_KEY,
        JSON.stringify(
          benches.map(normalizeBench)
        )
      );

    } finally {
      suppressAutoPush = previous;
    }
  }

  async function pull() {
    if (pulling) {
      return false;
    }

    pulling = true;

    const previous =
      suppressAutoPush;

    suppressAutoPush = true;

    try {
      const cloud =
        await fetchCloudData();

      writeLocal(
        cloud.points,
        cloud.benches
      );

      initialized = true;

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-updated'
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-online'
        )
      );

      console.log(
        '☁️ تم سحب البيانات من Google Sheets'
      );

      return true;

    } catch (error) {

      console.warn(
        '☁️ GET:',
        error?.message || error
      );

      return false;

    } finally {
      suppressAutoPush =
        previous;

      pulling = false;
    }
  }

  async function pushData(
    points,
    benches
  ) {
    const API_URL =
      getApiUrl();

    if (
      pushing ||
      !API_URL
    ) {
      return false;
    }

    pushing = true;

    try {
      const payload = {
        points:
          points.map(normalizePoint),

        benches:
          benches.map(normalizeBench)
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

      if (data.ok === false) {
        throw new Error(
          data.error ||
          'فشل الحفظ'
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-synced'
        )
      );

      console.log(
        '☁️ تم رفع البيانات إلى Google Sheets'
      );

      return true;

    } catch (error) {

      console.warn(
        '☁️ POST:',
        error?.message || error
      );

      return false;

    } finally {
      pushing = false;
    }
  }

  /*
   * إضافة أو تعديل ثابت X/Y فقط.
   *
   * مهم:
   * لا نأخذ نسخة الجهاز القديمة ونرفعها.
   * نسحب أحدث نسخة من Google Sheets أولًا،
   * ثم نطبق التغيير المطلوب فقط.
   */
  async function savePointChange(
    item,
    oldNumber = null
  ) {
    if (
      pulling ||
      pushing
    ) {
      return false;
    }

    const previous =
      suppressAutoPush;

    suppressAutoPush = true;

    try {
      const cloud =
        await fetchCloudData();

      let points =
        cloud.points.map(normalizePoint);

      const newNumber =
        String(
          item?.number ?? ''
        ).trim();

      const oldKey =
        String(
          oldNumber ?? ''
        ).trim();

      if (!newNumber) {
        throw new Error(
          'رقم الثابت غير موجود'
        );
      }

      if (
        oldKey &&
        oldKey !== newNumber
      ) {
        points =
          points.filter(
            point =>
              String(
                point.number ?? ''
              ).trim() !== oldKey
          );
      }

      const index =
        points.findIndex(
          point =>
            String(
              point.number ?? ''
            ).trim() === newNumber
        );

      if (index >= 0) {
        points[index] =
          normalizePoint(item);
      } else {
        points.push(
          normalizePoint(item)
        );
      }

      writeLocal(
        points,
        cloud.benches
      );

      initialized = true;

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-updated'
        )
      );

      return await pushData(
        points,
        cloud.benches
      );

    } catch (error) {

      console.warn(
        '☁️ savePointChange:',
        error?.message || error
      );

      return false;

    } finally {
      suppressAutoPush =
        previous;
    }
  }

  /*
   * إضافة أو تعديل ثابت Z فقط.
   */
  async function saveBenchChange(
    item,
    oldNumber = null
  ) {
    if (
      pulling ||
      pushing
    ) {
      return false;
    }

    const previous =
      suppressAutoPush;

    suppressAutoPush = true;

    try {
      const cloud =
        await fetchCloudData();

      let benches =
        cloud.benches.map(normalizeBench);

      const newNumber =
        String(
          item?.id ?? ''
        ).trim();

      const oldKey =
        String(
          oldNumber ?? ''
        ).trim();

      if (!newNumber) {
        throw new Error(
          'رقم الثابت غير موجود'
        );
      }

      if (
        oldKey &&
        oldKey !== newNumber
      ) {
        benches =
          benches.filter(
            bench =>
              String(
                bench.id ?? ''
              ).trim() !== oldKey
          );
      }

      const index =
        benches.findIndex(
          bench =>
            String(
              bench.id ?? ''
            ).trim() === newNumber
        );

      if (index >= 0) {
        benches[index] =
          normalizeBench(item);
      } else {
        benches.push(
          normalizeBench(item)
        );
      }

      writeLocal(
        cloud.points,
        benches
      );

      initialized = true;

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-updated'
        )
      );

      return await pushData(
        cloud.points,
        benches
      );

    } catch (error) {

      console.warn(
        '☁️ saveBenchChange:',
        error?.message || error
      );

      return false;

    } finally {
      suppressAutoPush =
        previous;
    }
  }

  /*
   * حذف ثابت X/Y.
   */
  async function deletePoint(
    number
  ) {
    if (
      pulling ||
      pushing
    ) {
      return false;
    }

    const previous =
      suppressAutoPush;

    suppressAutoPush = true;

    try {
      const cloud =
        await fetchCloudData();

      const key =
        String(
          number ?? ''
        ).trim();

      const points =
        cloud.points
          .map(normalizePoint)
          .filter(
            point =>
              String(
                point.number ?? ''
              ).trim() !== key
          );

      writeLocal(
        points,
        cloud.benches
      );

      initialized = true;

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-updated'
        )
      );

      return await pushData(
        points,
        cloud.benches
      );

    } catch (error) {

      console.warn(
        '☁️ deletePoint:',
        error?.message || error
      );

      return false;

    } finally {
      suppressAutoPush =
        previous;
    }
  }

  /*
   * حذف ثابت Z.
   */
  async function deleteBench(
    number
  ) {
    if (
      pulling ||
      pushing
    ) {
      return false;
    }

    const previous =
      suppressAutoPush;

    suppressAutoPush = true;

    try {
      const cloud =
        await fetchCloudData();

      const key =
        String(
          number ?? ''
        ).trim();

      const benches =
        cloud.benches
          .map(normalizeBench)
          .filter(
            bench =>
              String(
                bench.id ?? ''
              ).trim() !== key
          );

      writeLocal(
        cloud.points,
        benches
      );

      initialized = true;

      window.dispatchEvent(
        new CustomEvent(
          'survey-cloud-updated'
        )
      );

      return await pushData(
        cloud.points,
        benches
      );

    } catch (error) {

      console.warn(
        '☁️ deleteBench:',
        error?.message || error
      );

      return false;

    } finally {
      suppressAutoPush =
        previous;
    }
  }

  /*
   * مزامنة يدوية:
   * سحب فقط من Google Sheets.
   */
  async function sync() {
    return await pull();
  }

  /*
   * منع أي رفع تلقائي قديم.
   * الحفظ الآن يتم من دوال التغيير الآمنة.
   */
  function suspendAutoPush(value) {
    suppressAutoPush =
      !!value;
  }

  window.SurveyCloud = {

    get url() {
      return getApiUrl();
    },

    pull,

    sync,

    push: async function () {
      /*
       * لا نستخدم push القديم المباشر،
       * لأن رفع نسخة محلية قديمة خطر.
       */
      return false;
    },

    savePointChange,

    saveBenchChange,

    deletePoint,

    deleteBench,

    suspendAutoPush,

    reloadConfig: function () {
      console.log(
        '☁️ API URL:',
        getApiUrl()
      );
    }
  };

  /*
   * مهم جدًا:
   * لم نعد نرفع localStorage تلقائيًا عند كل setItem.
   * بذلك الحفظ المحلي لا يستطيع إرسال نسخة قديمة
   * إلى Google Sheets بالخطأ.
   */
  localStorage.setItem =
    function (key, value) {
      originalSetItem(
        key,
        value
      );
    };

  localStorage.removeItem =
    function (key) {
      originalRemoveItem(
        key
      );
    };

  setTimeout(
    async function () {
      if (getApiUrl()) {
        await pull();
      }
    },
    500
  );

})();
