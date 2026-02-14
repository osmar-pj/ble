import { spawn } from 'child_process';

/**
 * Ejecuta un comando del sistema y devuelve su salida estándar.
 * @param {string} cmd
 * @param {string[]} [args=[]]
 * @returns {Promise<string>}
 */
export function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `Exit ${code}`));
      else resolve(stdout.trim());
    });
    child.on('error', reject);
  });
}
