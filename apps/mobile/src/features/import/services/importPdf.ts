import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { File, Directory, Paths } from "expo-file-system";

import type { LocalDocument } from "../../../shared/types/document";
import {
  addDocument,
  getAllDocuments,
} from "../../../database/repositories/documentRepository";

export async function importPdf(): Promise<LocalDocument | null> {
    // 1. Open the system file picker, PDFs only
    const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
    });
    if (result.canceled)
        return null;

    const asset = result.assets[0];
    const id =  Crypto.randomUUID();

    // 2. Copy the PDF into the app's permanent storage
    const pdfDir = new Directory(Paths.document, "pdfs");
    pdfDir.create({ idempotent: true, intermediates: true });

    const source = new File(asset.uri);
    const destination = new File(pdfDir, `${id}.pdf`)
    await source.copy(destination);

    // 3. Hash the copy and reject duplicates
    const fileHash = destination.info({ md5: true }).md5 ?? undefined;
    const existing = await getAllDocuments();
    if (fileHash && existing.some((d) => d.fileHash === fileHash)) {
        destination.delete();
        throw new Error("Duplicate PDF detected");
    };

    // 4. Build and save the record
    const doc: LocalDocument = {
        id,
        title: asset.name.replace(/\.pdf$/i, ""),
        originalFileName: asset.name,
        localUri: destination.uri,
        fileHash,
        fileSize: destination.size,
        dateAdded: new Date().toISOString(),
        isFavorite: false,
        isFinished: false,
    };
    await addDocument(doc);
    return doc;
}