import spawn, { fork } from 'spawncommand'
import { relative } from 'path'
import { dependencies, devDependencies } from './kibana.json'
import { c } from 'erte'
import loading from 'indicatrix'

const DD = { ...dependencies, ...devDependencies }

const getFile = (err) => {
  const [,file] = new RegExp(`(${process.cwd()}.+)\\)$`, 'm').exec(err) || []
  if (!file) return null
  const [path, line, col] = file.split(':')

  const p = relative('', path)
  return `${p}:${line}:${col}`
}
async function run() {
  const f = fork('src/cli', ['-e', 'http://unknown-host.test'], {
    stdio: 'pipe',
    execArgv: [], // eternal debug
    cwd: 'kibana',
  })
  let started = false
  const P = new Promise((re) => {
    f.stdout.on('data', d => {
      if (/No living connections/.test(d)) {
        re({ stdout: '' })
        console.log('Server started.')
        started = 1
        f.kill()
      }
    })
  })
  const res = await Promise.race([
    f.promise,
    P,
  ])
  let [,r] = /Cannot find module '(.+?)'/.exec(res.stderr) || []
  if (!r) {
    if (!started) {
      console.log('No error in stderr.')
      throw new Error('Server was not started.')
    }
    return
  }
  let file = getFile(res.stderr)
  if (!file) try {
    const lines = res.stdout.trim().split('\n')
    const last = lines[lines.length - 1]
    const { error: { stack } } = JSON.parse(last)
    file = getFile(stack)
  } catch (err) {
    throw new Error('Could not find the file.')
  }
  const rr = r.split('/', 1)
  const isScoped = r.startsWith('@')
  if (!isScoped) r = rr
  console.log(
    'MISSING %s%s in %s', c(r, 'red'), !isScoped && (r != rr) ? ` (import ${rr})` : '',
    c(file, 'grey'),
  )
  const version = DD[r]
  if (!version) throw new Error('Unknown version')
  const exact = `${r}@${version}`
  const p = spawn('yarn', ['add', '-E', exact], { cwd: 'kibana' })
  const t = ` yarn add -E ${c(exact, 'green')}`
  const rres = await loading(t, p.promise)
  if (rres.code != 0) throw new Error(rres.stderr)
  await run()
}

(async () => {
  try {
    await run()
  } catch ({ stack }) {
    console.log(stack)
  }
})()