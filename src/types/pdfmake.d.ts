import "pdfmake/build/pdfmake";

declare module "pdfmake/build/pdfmake" {
  export interface TCreatedPdf {
    download(filename?: string): void;
    open(): void;
    print(): void;
    getBlob(callback: (blob: Blob) => void): void;
    getBase64(callback: (base64: string) => void): void;
  }

  export interface PdfMakeStatic {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    fonts: Record<
      string,
      {
        normal: string;
        bold: string;
        italics: string;
        bolditalics: string;
      }
    >;
    createPdf(docDefinition: unknown): TCreatedPdf;
  }

  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}
