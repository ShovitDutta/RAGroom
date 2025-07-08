import * as yauzl from 'yauzl';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts a ZIP archive to a specified directory using a streaming approach.
 *
 * @param zipPath The absolute path to the ZIP file.
 * @param outDir The absolute path to the output directory.
 * @returns A promise that resolves when the extraction is complete.
 */
export function extractZipStream(zipPath: string, outDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(err || new Error('Failed to open ZIP file.'));
      }

      zipfile.on('entry', (entry: yauzl.Entry) => {
        const entryPath = path.join(outDir, entry.fileName);

        // Ensure parent directory exists
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          fs.mkdirSync(entryPath, { recursive: true });
          zipfile.readEntry();
        } else {
          // File entry
          fs.mkdirSync(path.dirname(entryPath), { recursive: true });
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) {
              return reject(err || new Error(`Failed to read entry: ${entry.fileName}`));
            }

            const writeStream = fs.createWriteStream(entryPath);
            readStream.on('end', () => {
              zipfile.readEntry();
            });
            readStream.pipe(writeStream);
          });
        }
      });

      zipfile.on('end', () => {
        resolve();
      });

      zipfile.on('error', (err) => {
        reject(err);
      });

      zipfile.readEntry();
    });
  });
}
