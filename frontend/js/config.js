// En local, l’API tourne sur le même ordinateur, au port 4000.
// Pour un déploiement, remplacez cette valeur par l’URL HTTPS du backend.
const browserHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? '127.0.0.1'
  : window.location.hostname

export const API_BASE = window.JCPMF_API_BASE || `http://${browserHost}:4000/api`
