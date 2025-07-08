import * as fs from 'fs';
import * as pdf from 'pdf-parse';
import { IParser } from './index';

export class PdfParser implements IParser {
  async parse(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf.default(dataBuffer);
      return data.text;
    } catch (error) {
      console.error(`Failed to parse PDF file: ${filePath}`, error);
      return '';
    }
  }
}
