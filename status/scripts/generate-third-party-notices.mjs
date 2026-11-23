import fs from 'node:fs';
import path from 'node:path';

/**
 * Build a deterministic third-party notice document from the installed
 * production dependency tree described by package-lock.json.
 *
 * @param {string} projectRoot The status app directory (contains package.json).
 * @returns {string}
 */
export function generateThirdPartyNotices(projectRoot = process.cwd()) {
  const lockPath = path.join(projectRoot, 'package-lock.json');
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  if (!fs.existsSync(lockPath)) {
    throw new Error(`Cannot generate third-party notices: package-lock.json not found at ${lockPath}`);
  }
  if (!fs.existsSync(nodeModulesPath)) {
    throw new Error('Cannot generate third-party notices: install dependencies before building the status app.');
  }

  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const entries = Object.entries(lock.packages || {})
    .filter(([packagePath, metadata]) =>
      packagePath.startsWith('node_modules/') &&
      metadata.dev !== true &&
      metadata.devOptional !== true
    )
    .map(([packagePath, metadata]) => ({ packagePath, metadata }))
    .sort((a, b) => a.packagePath.localeCompare(b.packagePath));

  if (entries.length === 0) {
    throw new Error('Cannot generate third-party notices: no production dependencies were found in package-lock.json.');
  }

  const sections = [
    'THIRD-PARTY SOFTWARE NOTICES',
    '============================',
    '',
    'This file is generated during each status application build.',
    'It covers production dependencies recorded in package-lock.json.',
    'Development-only dependencies are excluded.',
    '',
  ];

  for (const { packagePath, metadata } of entries) {
    const packageDirectory = path.resolve(projectRoot, packagePath);
    const normalizedNodeModules = path.resolve(nodeModulesPath) + path.sep;
    if (!packageDirectory.startsWith(normalizedNodeModules)) {
      throw new Error(`Unsafe package path in lockfile: ${packagePath}`);
    }

    const packageJsonPath = path.join(packageDirectory, 'package.json');
    let packageJson = {};
    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    }

    const name = packageJson.name || packagePath.slice('node_modules/'.length);
    const version = metadata.version || packageJson.version || 'version unavailable';
    const declaredLicense = metadata.license || packageJson.license || 'License identifier not declared';
    const licenseFiles = fs.existsSync(packageDirectory)
      ? fs.readdirSync(packageDirectory, { withFileTypes: true })
          .filter((entry) =>
            entry.isFile() &&
            /^(LICENSE|LICENCE|COPYING)(?:[._ -].*)?$/i.test(entry.name)
          )
          .map((entry) => entry.name)
          .sort((a, b) => a.localeCompare(b))
      : [];

    sections.push(`Package: ${name}@${version}`);
    sections.push(`Declared license: ${typeof declaredLicense === 'string' ? declaredLicense : JSON.stringify(declaredLicense)}`);
    sections.push(`Lockfile path: ${packagePath}`);
    sections.push('');

    if (licenseFiles.length === 0) {
      sections.push('No standalone license text file was present in the installed package.');
      sections.push('The declared license identifier above is reproduced from package metadata.');
      sections.push('');
      continue;
    }

    for (const licenseFile of licenseFiles) {
      const licenseText = fs.readFileSync(path.join(packageDirectory, licenseFile), 'utf8').trim();
      sections.push(`--- ${licenseFile} ---`);
      sections.push(licenseText || '[License file is empty.]');
      sections.push('');
    }
  }

  return sections.join('\n').trimEnd() + '\n';
}
