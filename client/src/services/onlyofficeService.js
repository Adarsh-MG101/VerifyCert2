/**
 * OnlyOffice Service
 * Handles all OnlyOffice-related API calls
 */

import { get, post } from './apiService';

/**
 * Get OnlyOffice editor configuration for a template
 * @param {string} templateId - Template ID
 * @returns {Promise<{config: object, onlyofficeUrl: string, templateName: string}>}
 */
export const getEditorConfig = async (templateId) => {
    return get(`/api/onlyoffice/config/${templateId}`);
};

/**
 * Trigger force save for a template being edited in OnlyOffice
 * @param {string} templateId - Template ID
 * @returns {Promise<object>}
 */
export const forceSave = async (templateId) => {
    return post(`/api/onlyoffice/forcesave/${templateId}`);
};

/**
 * Refresh template data (re-extract placeholders, regenerate thumbnail)
 * @param {string} templateId - Template ID
 * @returns {Promise<{success: boolean, placeholders: array, thumbnailPath: string}>}
 */
export const refreshTemplate = async (templateId) => {
    return post(`/api/onlyoffice/refresh/${templateId}`);
};

export default {
    getEditorConfig,
    forceSave,
    refreshTemplate,
};
