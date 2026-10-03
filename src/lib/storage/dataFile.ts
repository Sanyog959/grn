import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Returns a writable path for JSON data files.
 * On serverless platforms (Netlify, Vercel, AWS Lambda), the deployment directory
 * (/var/task) is read-only. Writable operations must use os.tmpdir() (/tmp).
 */
export function getWritableDataFilePath(filename: string): string {
  const bundledDir = path.join(process.cwd(), 'data');
  const bundledPath = path.join(bundledDir, filename);

  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL ||
    process.cwd().startsWith('/var/task')
  );

  // If local development, try using process.cwd()/data
  if (!isServerless) {
    try {
      if (!fs.existsSync(bundledDir)) {
        fs.mkdirSync(bundledDir, { recursive: true });
      }
      fs.accessSync(bundledDir, fs.constants.W_OK);
      return bundledPath;
    } catch {
      // Fall through to /tmp if not writable
    }
  }

  // In serverless, use os.tmpdir()
  const tmpDir = path.join(os.tmpdir(), 'grn_app_data');
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  const tmpPath = path.join(tmpDir, filename);

  // If the file doesn't exist yet in /tmp, seed it from the bundled version
  if (!fs.existsSync(tmpPath) && fs.existsSync(bundledPath)) {
    try {
      fs.copyFileSync(bundledPath, tmpPath);
    } catch {
      // ignore copy errors
    }
  }

  return tmpPath;
}

/**
 * Safely writes JSON content to disk with error absorption for read-only environments.
 */
export function safeWriteJson(filePath: string, data: unknown): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn(`[Storage Warning] Could not write to ${filePath} (read-only filesystem):`, err);
    return false;
  }
}
