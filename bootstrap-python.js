
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


const MIN_PY = [3, 11];

// lazy require para não quebrar fora do Electron
function getElectronApp() {
  try { return require('electron').app; } catch { return null; }
}

function getAppRoot() {
  const app = getElectronApp();
  if (app) return app.isPackaged ? process.resourcesPath : app.getAppPath();
  // fallback fora do Electron (útil em testes)
  return process.cwd();
}

function getUserData() {
  const app = getElectronApp();
  return app ? app.getPath('userData') : path.join(process.cwd(), '.userData');
}

function probe(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8' });
    return r.status === 0 ? (r.stdout || r.stderr || '').trim() : null;
  } catch { return null; }
}

// function getVersion(pythonBin) {
//   const out = probe(pythonBin, ['-c', 'import sys;print(".".join(map(str,sys.version_info[:3])))']);
//   if (!out) return null;
//   return out.split('.').map(n => parseInt(n, 10));
// }

function getVersion(pythonBin) {
  const out = probe(pythonBin, ['-c', 'import sys;print(".".join(map(str,sys.version_info[:2])))']);
  if (!out) return null;
  const [maj, min] = out.split('.').map(n => parseInt(n, 10));
  return [maj, min];
}
function meetsMin(ver) {
  if (!ver) return false;
  const [a,b] = ver;
  return a > MIN_PY[0] || (a === MIN_PY[0] && b >= MIN_PY[1]);
}

function knownMacCandidates() {
  const home = process.env.HOME || '';
  return [
    '/opt/homebrew/bin/python3.12',
    '/opt/homebrew/bin/python3.11',
    '/usr/local/bin/python3.12',
    '/usr/local/bin/python3.11',
    '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12',
    '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11',
    // pyenv comuns:
    `${home}/.pyenv/versions/3.12.0/bin/python`,
    `${home}/.pyenv/versions/3.12.1/bin/python`,
    `${home}/.pyenv/versions/3.11.9/bin/python`,
    `${home}/.pyenv/shims/python3.12`,
    `${home}/.pyenv/shims/python3.11`,
  ];
}

/** Busca Python >=3.11.
 *  - overridePythonBin: caminho explícito (opcional)
 *  - configPythonBin: caminho salvo em JSON (opcional)
 */
function locatePython({ overridePythonBin, configPythonBin } = {}) {
  const tryBins = [];

  // 1) override explícito
  if (overridePythonBin) tryBins.push(overridePythonBin);

  // 2) bin salvo em config
  if (configPythonBin) tryBins.push(configPythonBin);

  // 3) variável de ambiente
  if (process.env.GRAPHLY_PYTHON) tryBins.push(process.env.GRAPHLY_PYTHON);

  // 4) candidatos mac conhecidos
  if (process.platform === 'darwin') {
    tryBins.push(...knownMacCandidates());
  }

  // 5) nomes genéricos
  tryBins.push(...(
    process.platform === 'win32'
      ? ['py -3.12', 'py -3.11', 'py -3']
      : ['python3.12', 'python3.11', 'python3', 'python']
  ));

  for (const name of tryBins) {
    const parts = name.split(' ');
    const exe = parts[0];
    const args = parts.length > 1 ? parts.slice(1).concat(['-c','import sys;print(sys.executable)'])
                                  : ['-c','import sys;print(sys.executable)'];
    const bin = probe(exe, args);
    if (bin && fs.existsSync(bin) && meetsMin(getVersion(bin))) return bin;
  }

  throw new Error(
    'Python ≥ 3.11 não encontrado.\n' +
    'Instale Python 3.12/3.11 (Homebrew ou python.org) ou selecione o binário nas Preferências.'
  );
}

// function locatePython() {
//   // 1) Override via env
//   const envPy = process.env.GRAPHLY_PYTHON;
//   if (envPy && fs.existsSync(envPy)) return envPy;

//   // 2) Windows launcher
//   const pyPath = probe('py', ['-3', '-c', 'import sys;print(sys.executable)']);
//   if (pyPath && fs.existsSync(pyPath)) return pyPath;

//   // 3) python3/python
//   for (const name of ['python3', 'python', 'python3.12', 'python3.11', 'python3.10']) {
//     const p = probe(name, ['-c', 'import sys;print(sys.executable)']);
//     if (p && fs.existsSync(p)) return p;
//   }

//   throw new Error(
//     'Python 3 não encontrado. Instale Python 3.x (com Launcher no Windows) ou defina GRAPHLY_PYTHON.'
//   );
// }

// function locatePython() {
//   // 1) Override via env
//   if (process.env.GRAPHLY_PYTHON && fs.existsSync(process.env.GRAPHLY_PYTHON)) {
//     const v = getVersion(process.env.GRAPHLY_PYTHON);
//     if (meetsMin(v)) return process.env.GRAPHLY_PYTHON;
//   }

//   // 2) Candidatos por ordem de preferência (mac: prioriza 3.12/3.11)
//   const names = process.platform === 'win32'
//     ? ['py -3.12', 'py -3.11', 'py -3.10', 'py -3'] // Windows Launcher
//     : ['python3.12', 'python3.11', 'python3.10', 'python3', 'python'];

//   for (const name of names) {
//     const parts = name.split(' ');
//     const exe = parts[0];
//     const args = parts.slice(1).concat(['-c', 'import sys;print(sys.executable)']);
//     const bin = probe(exe, args);
//     if (bin && fs.existsSync(bin) && meetsMin(getVersion(bin))) {
//       return bin;
//     }
//   }

//   throw new Error(
//     'Python ≥ 3.11 não encontrado.\n' +
//     'Instale Python 3.12/3.11 e aponte a variável GRAPHLY_PYTHON para o executável.\n' +
//     'macOS (Apple Silicon): /opt/homebrew/bin/python3.12\n' +
//     'macOS (Intel):         /usr/local/bin/python3.12'
//   );
// }

function venvPython(venvDir) {
  const isWin = process.platform === 'win32';
  return isWin ? path.join(venvDir, 'Scripts', 'python.exe')
               : path.join(venvDir, 'bin', 'python');
}

// function ensureVenv(venvDir) {
//   const pyExe = locatePython();
//   const marker = process.platform === 'win32' ? 'Scripts' : 'bin';
//   if (!fs.existsSync(path.join(venvDir, marker))) {
//     const r = spawnSync(pyExe, ['-m', 'venv', venvDir], { stdio: 'inherit' });
//     if (r.status !== 0) throw new Error('Falha ao criar venv em ' + venvDir);
//   }
//   const pythonBin = venvPython(venvDir);
//   if (!fs.existsSync(pythonBin)) throw new Error('Python do venv não encontrado.');
//   return pythonBin;
// }

// 🔎 se o venv já existir mas com Python < 3.11, recria
function ensureVenv(venvDir) {
  const marker = process.platform === 'win32' ? 'Scripts' : 'bin';
  const exists = fs.existsSync(path.join(venvDir, marker));
  if (exists) {
    const py = venvPython(venvDir);
    const v = getVersion(py);
    if (meetsMin(v)) return py;
    // recria se versão insuficiente
    fs.rmSync(venvDir, { recursive: true, force: true });
  }

  const sysPy = locatePython();
  const r = spawnSync(sysPy, ['-m', 'venv', venvDir], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Falha ao criar venv.');
  const pythonBin = venvPython(venvDir);
  if (!fs.existsSync(pythonBin)) throw new Error('Python do venv não encontrado.');
  return pythonBin;
}

function runPip(pythonBin, args, opts = {}) {
  const env = {
    ...process.env,
    PIP_DISABLE_PIP_VERSION_CHECK: '1',
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
  };
  if (opts.indexUrl) env.PIP_INDEX_URL = opts.indexUrl;
  if (opts.extraIndexUrl) env.PIP_EXTRA_INDEX_URL = opts.extraIndexUrl;

  const r = spawnSync(pythonBin, ['-m', 'pip', ...args], {
    stdio: 'inherit',
    env,
  });
  return r.status === 0;
}

function upgradeCoreTools(pythonBin) {
  if (!runPip(pythonBin, ['install', '--upgrade', 'pip', 'setuptools', 'wheel'])) {
    throw new Error('Falha ao atualizar pip/setuptools/wheel.');
  }
}

function installRequirementsOnline(pythonBin, requirementsPath, opts={}) {
  const args = ['install', '--upgrade', '-r', requirementsPath];
  return runPip(pythonBin, args, opts);
}

function installRequirementsOffline(pythonBin, requirementsPath, wheelsDir) {
  if (!wheelsDir || !fs.existsSync(wheelsDir)) return false;
  const args = [
    'install', '--upgrade',
    '--no-index', '--find-links', wheelsDir,
    '-r', requirementsPath,
  ];
  return runPip(pythonBin, args);
}

function fileInAppRoot(fileName) {
  return path.join(getAppRoot(), fileName);
}

function dirInAppRoot(dirName) {
  return path.join(getAppRoot(), dirName);
}

async function prepare({
  venvDirName = 'pyenv',
  requirementsFileName = 'requirements.txt',
  wheelsDirName = 'wheels',
  offline = false,
  indexUrl = null,
  extraIndexUrl = null,
} = {}) {
  const userData = getUserData();
  const venvDir = path.join(userData, venvDirName);
  const pythonBin = ensureVenv(venvDir);

  // upgrade pip/setuptools/wheel
  upgradeCoreTools(pythonBin);

  // paths de requirements e wheels no app root/resources
  const reqPath = fileInAppRoot(requirementsFileName);
  const wheelsDir = dirInAppRoot(wheelsDirName);

  if (!fs.existsSync(reqPath)) {
    console.warn('[bootstrap-python] requirements não encontrado em', reqPath);
    return { pythonBin, venvDir, installed: false };
  }

  let ok = false;
  if (offline) {
    ok = installRequirementsOffline(pythonBin, reqPath, wheelsDir);
    if (!ok) throw new Error('Instalação offline falhou (wheels ausentes/invalidos).');
  } else {
    ok = installRequirementsOnline(pythonBin, reqPath, { indexUrl, extraIndexUrl });
    if (!ok) {
      console.warn('[bootstrap-python] Instalação online falhou; tentando offline...');
      ok = installRequirementsOffline(pythonBin, reqPath, wheelsDir);
      if (!ok) throw new Error('Falha ao instalar dependências (online e offline).');
    }
  }

  return { pythonBin, venvDir, installed: ok };
}

function runPython(pythonBin, scriptPath, args = [], { onData } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, ['-u', scriptPath, ...args], { env: process.env });
    child.stdout.on('data', (d) => onData?.('stdout', d.toString()));
    child.stderr.on('data', (d) => onData?.('stderr', d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

async function runWithAutoDeps(pythonBin, scriptPath, args = [], opts = {}) {
  let stderr = '';
  const code = await runPython(pythonBin, scriptPath, args, {
    onData: (ch, msg) => { if (ch === 'stderr') stderr += msg; opts.onData?.(ch, msg); }
  });

  if (code === 0) return 0;

  const m = /ModuleNotFoundError: No module named '([^']+)'/.exec(stderr || '');
  if (m) {
    const missing = m[1];
    // tenta instalar e rodar novamente
    const ok = runPip(pythonBin, ['install', '--upgrade', missing]);
    if (ok) {
      return runPython(pythonBin, scriptPath, args, opts);
    }
  }
  return code;
}

module.exports = {
  prepare,
  ensureVenv,
  upgradeCoreTools,
  installRequirementsOnline,
  installRequirementsOffline,
  runPython,
  runWithAutoDeps,
};
// End of bootstrap-python.js