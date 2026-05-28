import logger from './logger';
/**
 * Utility function to perform fetch requests with automatic retry on failure
 * This helps improve resilience against intermittent network issues
 */

/**
 * Performs a fetch request with automatic retries on failure
 * @param {Function} fetchFn - A function that returns a Promise (typically a fetch call)
 * @param {Object} options - Configuration options
 * @param {number} options.retries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay between retries in ms (default: 300)
 * @param {number} options.maxDelay - Maximum delay between retries in ms (default: 5000)
 * @param {Function} options.shouldRetry - Function to determine if retry should occur based on error (default: all non-4xx errors)
 * @returns {Promise} - The result of the fetch request
 */
export const fetchWithRetry = async (fetchFn, options = {}) => {
  const {
    retries = 3,
    baseDelay = 300,
    maxDelay = 5000,
    shouldRetry = (err) => {
      // Don't retry if it's a 4xx client error (except 408 Request Timeout)
      return !(err?.status >= 400 && err?.status < 500 && err?.status !== 408);
    },
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Execute the fetch function
      return await fetchFn();
    } catch (error) {
      lastError = error;
      attempt++;

      // If we've used all retries or shouldn't retry this error, throw
      if (attempt > retries || !shouldRetry(error)) {
        logger.error(`Fetch failed after ${attempt} attempts:`, error);
        throw error;
      }

      // Calculate exponential backoff delay with jitter
      const delay = Math.min(
        Math.random() * baseDelay * Math.pow(2, attempt), 
        maxDelay
      );

      logger.log(
        `Fetch attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`,
        error.message || error
      );

      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This shouldn't be reached because of the throw in the catch block
  // but just in case, throw the last error
  throw lastError;
};

/**
 * Wraps the Supabase client methods to add retry functionality
 * @param {Object} client - Supabase client instance
 * @param {Object} options - Retry options
 * @returns {Object} - Wrapped Supabase client with retry capability
 */
export const wrapSupabaseWithRetry = (client, options = {}) => {
  // Create a proxy that wraps all method calls with retry logic
  return new Proxy(client, {
    get(target, prop) {
      // Get the original property
      const original = target[prop];
      
      // If it's a method that returns a query builder (from, rpc, etc.)
      if (typeof original === 'function' && ['from', 'rpc', 'storage'].includes(prop)) {
        // Return a function that wraps the original method call
        return function(...args) {
          // Get the query builder
          const builder = original.apply(target, args);
          
          // Wrap methods that execute queries
          return new Proxy(builder, {
            get(builderTarget, builderProp) {
              const builderMethod = builderTarget[builderProp];
              
              // Wrap methods that execute the query (select, insert, update, delete, etc.)
              if (typeof builderMethod === 'function' && 
                  ['select', 'insert', 'update', 'delete', 'upsert', 'execute', 
                   'upload', 'download', 'remove', 'list', 'getPublicUrl'].includes(builderProp)) {
                return function(...methodArgs) {
                  return fetchWithRetry(
                    () => builderMethod.apply(builderTarget, methodArgs),
                    options
                  );
                };
              }
              
              // Return other methods and properties as is
              return builderMethod;
            }
          });
        };
      }
      
      // Return other properties as is
      return original;
    }
  });
};
