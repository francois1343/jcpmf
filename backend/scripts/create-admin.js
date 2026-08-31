require('dotenv').config()

const bcrypt = require('bcryptjs')
const db = require('../config/db')

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((argument) => {
      const [key, ...parts] = argument.replace(/^--/, '').split('=')
      return [key, parts.join('=')]
    }),
  )
  const email = args.email?.trim().toLowerCase()
  const username = args.username?.trim()
  const password = args.password

  if (!email || !username || !password || password.length < 10) {
    throw new Error('Usage : npm run create-admin -- --email=admin@example.com --username=admin --password=10-caracteres-minimum')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.execute(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash), role = 'admin'`,
    [username, email, passwordHash],
  )
  console.log(`Compte administrateur prêt : ${email}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => db.end())
