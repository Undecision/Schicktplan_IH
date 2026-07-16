import { Global, Module } from "@nestjs/common";
import { PdfService } from "./pdf.service";

/** Global bereitgestellter PDF-Renderer (Übergaben P8.2, Reporting P10.2). */
@Global()
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
