import './style.css'

const STORAGE_KEY = 'survey_constants_xy'
const PHOTO_KEY = 'survey_constant_photos'

let constants = readArray(STORAGE_KEY)
let photos = readArray(PHOTO_KEY)

window.addEventListener('survey-cloud-updated', () => {
  constants = readArray(STORAGE_KEY)
  photos = readArray(PHOTO_KEY)
  render()
})
let editingIndex = -1

const app = document.querySelector('#app')

app.innerHTML = `
  <div class="page">

    <header class="page-header">

      <button id="backBtn" class="back-btn">
        رجوع
      </button>

      <div>
        <div class="page-brand">SURVEY CONSTANTS</div>
        <h1>ثوابت X / Y</h1>
      </div>

      <button id="addBtn" class="add-btn">
        + إضافة
      </button>

    </header>

    <main class="page-content">

      <section class="search-box">

        <span>⌕</span>

        <input
          id="searchInput"
          type="search"
          autocomplete="off"
          placeholder="ابحث برقم الثابت أو الوصف أو رقم الفيلا..."
        >

      </section>

      <section class="xy-summary">

        <div>
          <strong id="count">0</strong>
          <small>عدد الثوابت</small>
        </div>

        <div>
          <strong id="photoSummary">0</strong>
          <small>صور الثوابت</small>
        </div>

      </section>

      <section id="constantsList" class="constants-list"></section>

    </main>

  </div>

  <div id="toast" class="toast hidden"></div>

  <div id="modal" class="modal hidden">

    <div class="modal-card">

      <div class="modal-header">

        <h2 id="modalTitle">
          إضافة ثابت X / Y
        </h2>

        <button id="closeModal">
          ×
        </button>

      </div>

      <label>رقم الثابت</label>

      <input
        id="pointNumber"
        autocomplete="off"
        placeholder="مثال: XY-001"
      >

      <label>رقم الفيلا</label>

      <input
        id="villaNumber"
        autocomplete="off"
        placeholder="مثال: V-125"
      >

      <label>X</label>

      <input
        id="xValue"
        type="number"
        step="any"
        inputmode="decimal"
        placeholder="قيمة X"
      >

      <label>Y</label>

      <input
        id="yValue"
        type="number"
        step="any"
        inputmode="decimal"
        placeholder="قيمة Y"
      >

      <label>الوصف</label>

      <textarea
        id="description"
        placeholder="وصف الثابت..."
      ></textarea>

      <label>صورة الثابت</label>

      <input
        id="photoInput"
        type="file"
        accept="image/*"
      >

      <div id="currentPhoto" class="current-photo hidden"></div>

      <button id="saveBtn" class="save-btn">
        حفظ الثابت
      </button>

    </div>

  </div>
`

const list = document.getElementById('constantsList')
const count = document.getElementById('count')
const photoSummary = document.getElementById('photoSummary')
const modal = document.getElementById('modal')
const searchInput = document.getElementById('searchInput')
const toast = document.getElementById('toast')

function readArray(key) {

  try {

    const data =
      JSON.parse(localStorage.getItem(key) || '[]')

    return Array.isArray(data) ? data : []

  } catch {

    return []

  }

}

function saveArray(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function escapeHtml(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

}

function normalize(value) {
  return String(value ?? '').toLowerCase().trim()
}

function showToast(message) {

  toast.textContent = message

  toast.classList.remove('hidden')

  clearTimeout(window.xyToastTimer)

  window.xyToastTimer = setTimeout(() => {

    toast.classList.add('hidden')

  }, 1600)

}

async function copyText(value, message) {

  const text = String(value ?? '')

  try {

    if (navigator.clipboard?.writeText) {

      await navigator.clipboard.writeText(text)

    } else {

      throw new Error('Clipboard API unavailable')

    }

    showToast(message)

  } catch {

    try {

      const textarea =
        document.createElement('textarea')

      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'

      document.body.appendChild(textarea)

      textarea.focus()
      textarea.select()

      document.execCommand('copy')

      textarea.remove()

      showToast(message)

    } catch {

      alert('تعذر نسخ البيانات')

    }

  }

}

function getPhotosForPoint(number) {

  return photos.filter(photo =>
    String(photo.pointNumber) === String(number)
  )

}

function updateSummary() {

  count.textContent = constants.length

  photoSummary.textContent = photos.length

}

function render(items = constants) {

  updateSummary()

  if (!items.length) {

    list.innerHTML = `
      <div class="empty">

        <div>📐</div>

        <strong>لا توجد ثوابت X / Y</strong>

        <small>
          اضغط «+ إضافة» لإضافة أول ثابت
        </small>

      </div>
    `

    return

  }

  list.innerHTML = items.map(item => {

    const index = constants.indexOf(item)

    const pointPhotos =
      getPhotosForPoint(item.number)

    const photoCount =
      pointPhotos.length

    return `
      <article class="constant-card">

        <div class="point-top">

          <strong>
            ${escapeHtml(item.number)}
          </strong>

          <span>
            ${escapeHtml(item.villa || 'بدون فيلا')}
          </span>

        </div>

        <div class="coordinates">

          <button
            class="coordinate-copy"
            data-value="${escapeHtml(item.x)}"
            data-axis="X"
          >

            <small>X</small>

            <strong>
              ${escapeHtml(item.x)}
            </strong>

            <span>📋</span>

          </button>

          <button
            class="coordinate-copy"
            data-value="${escapeHtml(item.y)}"
            data-axis="Y"
          >

            <small>Y</small>

            <strong>
              ${escapeHtml(item.y)}
            </strong>

            <span>📋</span>

          </button>

        </div>

        <button
          class="copy-both-btn"
          data-index="${index}"
        >
          📋 نسخ X + Y
        </button>

        <p>
          ${escapeHtml(item.description || 'بدون وصف')}
        </p>

        <div class="photo-indicator">

          <span>🖼️</span>

          <span>
            ${photoCount}
            ${photoCount === 1 ? 'صورة' : 'صور'}
          </span>

        </div>

        <div class="card-actions">

          <button
            class="edit-btn"
            data-index="${index}"
          >
            ✏️ تعديل
          </button>

          <button
            class="delete-btn"
            data-index="${index}"
          >
            🗑️ حذف
          </button>

        </div>

      </article>
    `

  }).join('')

  document
    .querySelectorAll('.coordinate-copy')
    .forEach(button => {

      button.onclick = () => {

        copyText(
          button.dataset.value,
          `تم نسخ ${button.dataset.axis}`
        )

      }

    })

  document
    .querySelectorAll('.copy-both-btn')
    .forEach(button => {

      button.onclick = () => {

        const item =
          constants[Number(button.dataset.index)]

        if (!item) return

        copyText(
          `${item.x}, ${item.y}`,
          'تم نسخ X + Y'
        )

      }

    })

  document
    .querySelectorAll('.edit-btn')
    .forEach(button => {

      button.onclick = () => {

        openEdit(
          Number(button.dataset.index)
        )

      }

    })

  document
    .querySelectorAll('.delete-btn')
    .forEach(button => {

      button.onclick = () => {

        deleteConstant(
          Number(button.dataset.index)
        )

      }

    })

}

function clearForm() {

  document.getElementById('pointNumber').value = ''
  document.getElementById('villaNumber').value = ''
  document.getElementById('xValue').value = ''
  document.getElementById('yValue').value = ''
  document.getElementById('description').value = ''
  document.getElementById('photoInput').value = ''

  document
    .getElementById('currentPhoto')
    .classList.add('hidden')

}

function openAdd() {

  editingIndex = -1

  clearForm()

  document.getElementById('modalTitle').textContent =
    'إضافة ثابت X / Y'

  document.getElementById('saveBtn').textContent =
    'حفظ الثابت'

  modal.classList.remove('hidden')

}

function openEdit(index) {

  const item = constants[index]

  if (!item) return

  editingIndex = index

  document.getElementById('pointNumber').value =
    item.number || ''

  document.getElementById('villaNumber').value =
    item.villa || ''

  document.getElementById('xValue').value =
    item.x ?? ''

  document.getElementById('yValue').value =
    item.y ?? ''

  document.getElementById('description').value =
    item.description || ''

  document.getElementById('photoInput').value = ''

  const currentPhoto =
    document.getElementById('currentPhoto')

  const pointPhotos =
    getPhotosForPoint(item.number)

  if (pointPhotos.length) {

    currentPhoto.innerHTML = `
      <div class="current-photo-title">
        الصور الحالية: ${pointPhotos.length}
      </div>

      <div class="photo-preview-grid">

        ${pointPhotos.map(photo => `
          <img
            src="${photo.data}"
            alt="صورة ${escapeHtml(item.number)}"
          >
        `).join('')}

      </div>
    `

    currentPhoto.classList.remove('hidden')

  } else {

    currentPhoto.classList.add('hidden')

  }

  document.getElementById('modalTitle').textContent =
    'تعديل ثابت X / Y'

  document.getElementById('saveBtn').textContent =
    'حفظ التعديل'

  modal.classList.remove('hidden')

}

async function deleteConstant(index) {

  const item =
    constants[index]

  if (!item) return

  const confirmed =
    confirm(
      `هل تريد حذف الثابت ${item.number}؟`
    )

  if (!confirmed) return

  const number =
    item.number

  let synced = false

  try {

    if (
      window.SurveyCloud &&
      typeof window.SurveyCloud.deletePoint ===
        'function'
    ) {

      synced =
        await window.SurveyCloud.deletePoint(
          number
        )

      constants =
        readArray(STORAGE_KEY)

    } else {

      constants =
        constants.filter(
          (_, i) => i !== index
        )

      saveArray(
        STORAGE_KEY,
        constants
      )

    }

  } catch (error) {

    console.warn(
      'Cloud delete:',
      error
    )

  }

  /*
   * الصور تظل محلية ويتم حذف صور الثابت المحذوف.
   */
  photos =
    photos.filter(
      photo =>
        String(photo.pointNumber) !==
        String(number)
    )

  saveArray(
    PHOTO_KEY,
    photos
  )

  performSearch()

  if (synced) {

    showToast(
      'تم حذف الثابت ومزامنته بنجاح'
    )

  } else {

    showToast(
      'تم حذف الثابت من الجهاز — تعذرت المزامنة السحابية'
    )

  }

}

function performSearch() {

  const value =
    normalize(searchInput.value)

  if (!value) {

    render(constants)

    return

  }

  const filtered =
    constants.filter(item => {

      const text = [
        item.number,
        item.villa,
        item.x,
        item.y,
        item.description
      ].join(' ')

      return normalize(text).includes(value)

    })

  render(filtered)

}

function fileToDataUrl(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader()

    reader.onload = () =>
      resolve(reader.result)

    reader.onerror = reject

    reader.readAsDataURL(file)

  })

}

async function savePhoto(number, file) {

  if (!file) return

  if (!file.type.startsWith('image/')) {

    throw new Error('الملف ليس صورة')

  }

  if (file.size > 8 * 1024 * 1024) {

    throw new Error(
      'حجم الصورة أكبر من 8 ميجابايت'
    )

  }

  const data =
    await fileToDataUrl(file)

  photos.push({
    id:
      `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`,

    pointNumber: number,

    data,

    name: file.name,

    createdAt:
      new Date().toISOString()

  })

}

async function saveCurrentPoint() {

  const number =
    document.getElementById('pointNumber')
      .value.trim()

  const villa =
    document.getElementById('villaNumber')
      .value.trim()

  const x =
    document.getElementById('xValue')
      .value.trim()

  const y =
    document.getElementById('yValue')
      .value.trim()

  const description =
    document.getElementById('description')
      .value.trim()

  const photoInput =
    document.getElementById('photoInput')

  if (!number || !x || !y) {

    alert('اكتب رقم الثابت و X و Y')

    return

  }

  const duplicate =
    constants.some((item, index) =>
      index !== editingIndex &&
      normalize(item.number) === normalize(number)
    )

  if (duplicate) {

    alert('رقم الثابت موجود بالفعل')

    return

  }

  const item = {
    number,
    villa,
    x,
    y,
    description
  }

  const oldNumber =
    editingIndex >= 0
      ? constants[editingIndex]?.number
      : null

  /*
   * نحفظ الصور محليًا أولًا.
   * الصور لا تدخل Google Sheets.
   */
  try {

    if (photoInput.files.length) {

      for (const file of photoInput.files) {

        await savePhoto(number, file)

      }

    }

  } catch (error) {

    alert(
      error?.message ||
      'حدث خطأ أثناء حفظ الصورة'
    )

    return

  }

  /*
   * لو المزامنة السحابية موجودة:
   * نسحب أحدث نسخة من Google Sheets،
   * ثم نطبق هذا التغيير فقط.
   */
  let synced = false

  try {

    if (
      window.SurveyCloud &&
      typeof window.SurveyCloud.savePointChange ===
        'function'
    ) {

      synced =
        await window.SurveyCloud.savePointChange(
          item,
          oldNumber
        )

      /*
       * savePointChange كتب أحدث نسخة في localStorage.
       * لذلك نعيد قراءتها بدل الاعتماد على نسخة قديمة.
       */
      constants =
        readArray(STORAGE_KEY)

    } else {

      /*
       * وضع احتياطي إذا لم تكن المزامنة متاحة.
       */
      if (editingIndex === -1) {

        constants.push(item)

      } else {

        constants[editingIndex] = item

      }

      saveArray(
        STORAGE_KEY,
        constants
      )

    }

  } catch (error) {

    console.warn(
      'Cloud sync after save:',
      error
    )

  }

  /*
   * تحديث الصور محليًا إذا تم تغيير رقم الثابت.
   */
  if (
    editingIndex >= 0 &&
    oldNumber &&
    String(oldNumber) !== String(number)
  ) {

    photos =
      photos.map(photo => {

        if (
          String(photo.pointNumber) ===
          String(oldNumber)
        ) {

          return {
            ...photo,
            pointNumber: number
          }

        }

        return photo

      })

    saveArray(
      PHOTO_KEY,
      photos
    )

  } else {

    saveArray(
      PHOTO_KEY,
      photos
    )

  }

  modal.classList.add('hidden')

  clearForm()

  editingIndex = -1

  performSearch()

  if (synced) {

    showToast(
      'تم حفظ الثابت ومزامنته بنجاح'
    )

  } else {

    showToast(
      'تم حفظ الثابت على الجهاز — تعذرت المزامنة السحابية'
    )

  }

}

document.getElementById('addBtn').onclick =
  openAdd

document.getElementById('closeModal').onclick =
  () => {

    modal.classList.add('hidden')

    clearForm()

    editingIndex = -1

  }

modal.addEventListener('click', event => {

  if (event.target === modal) {

    modal.classList.add('hidden')

    clearForm()

    editingIndex = -1

  }

})

document.getElementById('saveBtn').onclick =
  saveCurrentPoint

searchInput.addEventListener(
  'input',
  performSearch
)

document.getElementById('backBtn').onclick =
  () => {

    window.location.href = './index.html'

  }

render()
