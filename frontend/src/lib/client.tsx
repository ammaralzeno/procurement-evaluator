/**
 * Generic interface for the API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  summary?: string;
  error?: string;
}

/**
 * Interfaces for the MathJS engine response structure
 */
export interface MathjsVariable {
  label: string;
  input: "number" | "radio" | "text"; // Can be extended with other input types if needed
  options?: string[];
  category?: string;
}

export interface MathjsRule {
  formula: string;
}

export interface MathjsConfig {
  variables: Record<string, MathjsVariable>;
  rules: MathjsRule[];
  summary?: string;
}

export type MathjsApiResponse = ApiResponse<MathjsConfig>;

/**
 * API Client specifically for interacting with the MathJS engine endpoint.
 */
export class ApiClient {
  private baseUrl: string;

  /**
   * Constructs the ApiClient.
   * @param baseUrl - The base URL for the API endpoint. Defaults to 'http://127.0.0.1:8000'.
   */
  constructor(baseUrl: string = 'http://127.0.0.1:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Uploads a file containing MathJS rules and variables for parsing.
   * @param file - The file object to upload.
   * @returns A Promise resolving to the parsed configuration or an error state.
   */
  async parseMathjsRules(file: File): Promise<MathjsApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = `${this.baseUrl}/parse-with-summary/`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
         const errorMessage = responseData?.error || responseData?.message || `HTTP error! Status: ${response.status}`;
         console.error(`Error fetching ${endpoint}: ${errorMessage}`, responseData);
         return {
             success: false,
             error: errorMessage,
             // data: responseData
         };
      }

      if (typeof responseData.success !== 'boolean' || typeof responseData.data !== 'object') {
          console.warn(`Unexpected successful response structure from ${endpoint}:`, responseData);
          return {
              success: false,
              error: 'Received unexpected data structure from the server.',
          };
      }

      return responseData as MathjsApiResponse;

    } catch (error) {
       console.error(`Network or parsing error calling ${endpoint}:`, error);
       return {
         success: false,
         error: error instanceof Error ? error.message : 'An unknown network or parsing error occurred',
       };
    }
  }
}

export default ApiClient;
