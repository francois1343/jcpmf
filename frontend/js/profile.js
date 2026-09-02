import { api } from './api.js'
import { escapeHtml, mountNavigation, requireUser, showMessage } from './common.js'

const profile = document.querySelector('#profile')
const message = document.querySelector('#message')

async function load() {
  const user = await requireUser()
  if (!user) return
  if (user.role === 'admin') {
    window.location.replace('/admin.html')
    return
  }
  mountNavigation(user)
  profile.className = ''
  profile.innerHTML = `
    <header class="profile-header">
      <div class="avatar">${escapeHtml(user.username.slice(0, 1).toUpperCase())}</div>
      <div><p class="eyebrow">Espace personnel</p><h1>Mon profil</h1><p class="muted">Votre compte et les réglages du parcours.</p></div>
    </header>
    <section class="card">
      <div class="profile-field"><span>Nom d’utilisateur</span><strong>${escapeHtml(user.username)}</strong></div>
      <div class="profile-field"><span>Adresse e-mail</span><strong>${escapeHtml(user.email)}</strong></div>
      <div class="profile-field"><span>Type de compte</span><strong>Coureur</strong></div>
    </section>
    <section class="card danger-zone">
      <h2>Réinitialiser ma progression</h2>
      <p class="muted">Toutes les séances et tous les bilans seront effacés. Votre compte et le programme sont conservés.</p>
      <button id="reset-all" class="button button-danger" type="button">Tout réinitialiser</button>
    </section>`

  document.querySelector('#reset-all').addEventListener('click', async (event) => {
    if (!window.confirm('Réinitialiser toute votre progression ?')) return
    event.target.disabled = true
    try {
      await api('/runner/progress/all', { method: 'DELETE' })
      showMessage(message, 'Votre progression a été réinitialisée.', 'success')
    } catch (error) {
      showMessage(message, error.message)
    } finally {
      event.target.disabled = false
    }
  })
}

load()
