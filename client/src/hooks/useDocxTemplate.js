import { useState, useCallback } from 'react';
import mammoth from 'mammoth';
import PizZip from 'pizzip';

/**
 * Hook for handling DOCX template uploads and placeholder detection
 * @returns {Object} { file, detectedPlaceholders, duplicatePlaceholders, handleFileChange, resetFile }
 */
export const useDocxTemplate = () => {
    const [file, setFile] = useState(null);
    const [detectedPlaceholders, setDetectedPlaceholders] = useState([]);
    const [duplicatePlaceholders, setDuplicatePlaceholders] = useState([]);

    const handleFileChange = useCallback(async (e) => {
        // Prevent default browser behavior just in case
        if (e.persist) e.persist();

        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        console.log("Analyzing file:", selectedFile.name);
        setFile(selectedFile);

        // Reset previous state
        setDetectedPlaceholders([]);
        setDuplicatePlaceholders([]);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();

            // Primary Detection: PizZip (Deep XML Scan)
            const zip = new PizZip(arrayBuffer);
            const xmlFiles = zip.file(/\.xml$/);

            const allMatches = new Set();
            const rawMatches = [];
            const regex = /\{\{(.*?)\}\}/g;

            xmlFiles.forEach(file => {
                try {
                    const content = file.asText();
                    // Strip XML tags to bridge fragmentation
                    const cleanText = content.replace(/<[^>]+>/g, '');
                    let match;
                    while ((match = regex.exec(cleanText)) !== null) {
                        const tag = match[1].trim();
                        if (tag) {
                            rawMatches.push(tag.toUpperCase());
                            allMatches.add(tag.toUpperCase());
                        }
                    }
                } catch (err) {
                    console.warn(`Could not read XML file ${file.name}:`, err);
                }
            });

            // Back-up: Mammoth (Standard Text Scan)
            try {
                const result = await mammoth.extractRawText({ arrayBuffer });
                if (result && result.value) {
                    let match;
                    // Reset regex index for safety
                    regex.lastIndex = 0;
                    while ((match = regex.exec(result.value)) !== null) {
                        const tag = match[1].trim();
                        if (tag) {
                            rawMatches.push(tag.toUpperCase());
                            allMatches.add(tag.toUpperCase());
                        }
                    }
                }
            } catch (err) {
                console.warn("Mammoth text extraction skipped:", err);
            }

            // Filter out system tags
            const systemTags = ['QR', 'QRCODE', 'CERTIFICATE_ID', 'IMAGE QR', 'IMAGE_QR', 'CERTIFICATEID', 'ID'];
            const finalPlaceholders = Array.from(allMatches).filter(p => !systemTags.includes(p));

            // Find true duplicates
            const counts = {};
            rawMatches.forEach(tag => {
                if (!systemTags.includes(tag)) {
                    counts[tag] = (counts[tag] || 0) + 1;
                }
            });
            const duplicates = Object.keys(counts).filter(tag => counts[tag] > 1);

            setDetectedPlaceholders(finalPlaceholders);
            setDuplicatePlaceholders(duplicates);

        } catch (err) {
            console.error("Critical error analyzing DOCX template:", err);
            // Don't crash the UI, just show no placeholders
            setDetectedPlaceholders([]);
        }
    }, []);

    const resetFile = useCallback(() => {
        setFile(null);
        setDetectedPlaceholders([]);
        setDuplicatePlaceholders([]);
    }, []);

    return {
        file,
        setFile,
        detectedPlaceholders,
        duplicatePlaceholders,
        handleFileChange,
        resetFile
    };
};

