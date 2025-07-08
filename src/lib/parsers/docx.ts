import * as mammoth from 'mammoth';
import { IParser } from './index';

export class DocxParser implements IParser {
  async parse(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error(`Failed to parse DOCX file: ${filePath}`, error);
      return '';
    }
  }
}
