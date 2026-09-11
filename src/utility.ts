// Utility functions for the application

/**
 * API call wrapper
 */
export const apiCall = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Set label text with bold styling
 * @param labelElement - The HTML element to style
 * @param question - The text to display
 */
export const setQuestionLabel = (labelElement: HTMLElement, question: string): void => {
  labelElement.style.fontWeight = 'bold';
  labelElement.textContent = question;
};

/**
 * Clear label text
 * @param labelElement - The HTML element to clear
 */
export const clearLabel = (labelElement: HTMLElement): void => {
  labelElement.textContent = '';
};

/**
 * Clear status label (hide it)
 * @param statusElement - The status label element to hide
 */
export const clearStatus = (statusElement: HTMLElement): void => {
  statusElement.style.display = 'none';
};

/**
 * Set status label text and show it
 * @param statusElement - The status label element
 * @param message - The status message to display
 */
export const setStatus = (statusElement: HTMLElement, message: string): void => {
  statusElement.textContent = message;
  statusElement.style.display = '';
};

/**
 * Extract unique company names from an XML run-sheet document using the same logic pattern as the C# helper.
 * It looks for a RunSheet element whose RunSheetName contains the run-sheet name fragment and then
 * reads CompanyName attributes from each child node.
 */
export const getCompanyNames = (xml: string, runSheetName: string): string[] => {
  const result: string[] = [];

  if (!xml || !runSheetName) {
    return result;
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = doc.querySelector('parsererror');

  if (parserError) {
    return result;
  }

  const namespaceUri = 'http://www.test.com/engine/3';
  const trimmedName = runSheetName.trim();
  const searchName = trimmedName.length > 20 ? trimmedName.substring(0, 20) : trimmedName;

  const runSheet = Array.from(doc.getElementsByTagNameNS(namespaceUri, 'RunSheet')).find((node) => {
    const runSheetNameAttribute = node.getAttribute('RunSheetName');
    return runSheetNameAttribute ? runSheetNameAttribute.includes(searchName) : false;
  });

  if (!runSheet) {
    return result;
  }

  const elements = runSheet.childNodes;

  for (const item of Array.from(elements)) {
    if (item.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const companyName = (item as Element).getAttribute('CompanyName');

    if (companyName && !result.includes(companyName)) {
      result.push(companyName);
    }
  }

  return result;
};
