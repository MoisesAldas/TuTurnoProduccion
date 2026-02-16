/**
 * PDF Preview Utilities
 * Core utilities for rendering and manipulating jsPDF documents in preview mode
 */

import jsPDF from "jspdf";

/**
 * Converts jsPDF document to blob URL for preview
 * @param doc - jsPDF document instance
 * @returns Blob URL string for PDF
 */
export const pdfToBlobURL = (doc: jsPDF): string => {
  const pdfBlob = doc.output("blob");
  return URL.createObjectURL(pdfBlob);
};

/**
 * Gets total page count from jsPDF document
 * @param doc - jsPDF document instance
 * @returns Total number of pages
 */
export const getPDFPageCount = (doc: jsPDF): number => {
  return doc.getNumberOfPages();
};

/**
 * Validates if PDF document is ready for preview
 * @param doc - jsPDF document instance or null
 * @returns True if document is valid and has pages
 */
export const isPDFReady = (doc: jsPDF | null): boolean => {
  if (!doc) return false;
  try {
    return getPDFPageCount(doc) > 0;
  } catch {
    return false;
  }
};

/**
 * Cleans up a blob URL to free memory
 * @param blobUrl - Blob URL to revoke
 */
export const revokeBlobURL = (blobUrl: string): void => {
  URL.revokeObjectURL(blobUrl);
};
