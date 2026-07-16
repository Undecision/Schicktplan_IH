import { Injectable, Logger } from "@nestjs/common";

/**
 * Platzhalter für die Virenprüfung von Uploads (Bauplan P4.1: "Virenscan-Hook
 * als Platzhalter"). In v1 ist dies ein No-Op – die Schnittstelle ist aber
 * bereits so geschnitten, dass später z.B. ein ClamAV-Daemon (clamd) oder ein
 * externer Scan-Service ohne Änderung an den Aufrufern angebunden werden kann.
 *
 * Wirft bei Fund einer Bedrohung, damit der Upload im Aufrufer abgebrochen und
 * das Objekt nicht persistiert wird.
 */
@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);

  /**
   * Prüft den Datei-Inhalt. v1: akzeptiert alles und protokolliert nur.
   * @throws Error wenn eine Bedrohung erkannt wird (später).
   */
  async scan(dateiname: string, _buffer: Buffer): Promise<void> {
    // TODO(P4.1): echte Anbindung (z.B. ClamAV clamd über TCP-Socket).
    this.logger.debug(`Virenscan (Platzhalter) übersprungen für "${dateiname}".`);
  }
}
