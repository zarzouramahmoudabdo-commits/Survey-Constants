import './style.css'

const STORAGE_KEY = 'survey_constants_xy'

let constants = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
let editingIndex = -1

document.querySelector('#app').innerHTML = `
  <div class="page">

    <header class="page-header">
      <button id="backBtn" class="back-btn">رجوع</button>

      <div>
        <div class="page-brand">SURVEY CONSTANTS</div>
        <h1>ثوابت X / Y</h1>
      </div>

      <button id="addBtn" class="add-btn">+ إضافة</button>
    </header>

    <main class="page-content">

      <section class="search-box">
        <span>⌕</span>
        <input
          id="searchInput"
          type="search"
          placeholder="ابحث برقم الثابت أو الوصف أو رقم الفيلا..."
        />
      </section>

      <section class="xy-summary">
        <div>
          <strong id="count">0</strong>
          <small>عدد الثوابت</small>
        </div>

        <div>
          <strong>X / Y</strong>
          <small>إحداثيات أفقية</small>
        </div>
      </section>

      <section id="constantsList" class="constants-list"></section>

    </main>

  </div>

  <div id="modal" class="modal hidden">
    <div class="modal-card">

      <div class="modal-header">
        <h2 id="modalTitle">إضافة ثابت X / Y</h2>
        <button id="closeModal">×</button>
      </div>

      <label>رقم الثابت</label>
      <input id="pointNumber" placeholder="مثال: XY-001">

      <label>رقم الفيلا</label>
      <input id="villaNumber" placeholder="مثال: V-125">

      <label>X</label>
      <input id="xValue" type="number" step="any" placeholder="قيمة X">

      <label>Y</label>
      <input id="yValue" type="number" step="any" placeholder="قيمة Y">

      <label>الوصف</label>
      <textarea id="description" placeholder="وصف الثابت..."></textarea>

      <button id="saveBtn" class="save-btn">حفظ الثابت</button>

    </div>
  </div>
`

const list = document.getElementById('constantsList')
const count = document.getElementById('count')
const modal = document.getElementById('modal')
const searchInput = document.getElementById('searchInput')

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(constants))
}

function render(items = constants) {
  count.textContent = items.length

  if (!items.length) {
    list.innerHTML = `
      <div class="empty">
        <div>📐</div>
        <strong>لا توجد ثوابت X / Y</strong>
        <small>اضغط «+ إضافة» لإضافة أول ثابت</small>
      </div>
    `
    return
  }

  list.innerHTML = items.map(item => {
    const index = constants.indexOf(item)

    return `
      <article class="constant-card">

        <div class="point-top">
          <strong>${escapeHtml(item.number)}</strong>
          <span>${escapeHtml(item.villa || 'بدون فيلا')}</span>
        </div>

        <div class="coordinates">
          <div>
            <small>X</small>
            <strong>${escapeHtml(item.x)}</strong>
          </div>

          <div>
            <small>Y</small>
            <strong>${escapeHtml(item.y)}</strong>
          </div>
        </div>

        <p>${escapeHtml(item.description || 'بدون وصف')}</p>

        <div class="card-actions">
          <button class="edit-btn" data-index="${index}">
            ✏️ تعديل
          </button>

          <button class="delete-btn" data-index="${index}">
            🗑️ حذف
          </button>
        </div>

      </article>
    `
  }).join('')

  document.querySelectorAll('.edit-btn').forEach(button => {
    button.onclick = () => openEdit(Number(button.dataset.index))
  })

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.onclick = () => deleteConstant(Number(button.dataset.index))
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function clearForm() {
  document.getElementById('pointNumber').value = ''
  document.getElementById('villaNumber').value = ''
  document.getElementById('xValue').value = ''
  document.getElementById('yValue').value = ''
  document.getElementById('description').value = ''
}

function openAdd() {
  editingIndex = -1
  clearForm()
  document.getElementById('modalTitle').textContent = 'إضافة ثابت X / Y'
  document.getElementById('saveBtn').textContent = 'حفظ الثابت'
  modal.classList.remove('hidden')
}

function openEdit(index) {
  const item = constants[index]

  editingIndex = index

  document.getElementById('pointNumber').value = item.number
  document.getElementById('villaNumber').value = item.villa
  document.getElementById('xValue').value = item.x
  document.getElementById('yValue').value = item.y
  document.getElementById('description').value = item.description

  document.getElementById('modalTitle').textContent = 'تعديل ثابت X / Y'
  document.getElementById('saveBtn').textContent = 'حفظ التعديل'

  modal.classList.remove('hidden')
}

function deleteConstant(index) {
  const item = constants[index]

  const confirmed = confirm(
    `هل تريد حذف الثابت ${item.number}؟`
  )

  if (!confirmed) return

  constants.splice(index, 1)
  saveData()
  performSearch()
}

function performSearch() {
  const value = searchInput.value.trim().toLowerCase()

  if (!value) {
    render(constants)
    return
  }

  const filtered = constants.filter(item =>
    `${item.number} ${item.villa} ${item.x} ${item.y} ${item.description}`
      .toLowerCase()
      .includes(value)
  )

  render(filtered)
}

document.getElementById('addBtn').onclick = openAdd

document.getElementById('closeModal').onclick = () => {
  modal.classList.add('hidden')
}

document.getElementById('saveBtn').onclick = () => {
  const number = document.getElementById('pointNumber').value.trim()
  const villa = document.getElementById('villaNumber').value.trim()
  const x = document.getElementById('xValue').value.trim()
  const y = document.getElementById('yValue').value.trim()
  const description = document.getElementById('description').value.trim()

  if (!number || !x || !y) {
    alert('اكتب رقم الثابت و X و Y')
    return
  }

  const item = {
    number,
    villa,
    x,
    y,
    description
  }

  if (editingIndex === -1) {
    constants.push(item)
  } else {
    constants[editingIndex] = item
  }

  saveData()

  modal.classList.add('hidden')
  clearForm()
  performSearch()
}

searchInput.addEventListener('input', performSearch)

document.getElementById('backBtn').onclick = () => {
  location.reload()
}

render()
