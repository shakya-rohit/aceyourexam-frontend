export const environment = {
  production: true,
  // Use /api when the frontend host reverse-proxies API calls to the backend.
  // If hosting these services on separate origins, set this to the public API URL.
  apiBaseUrl: 'https://aceyourexam-bug6babhetg8a5gx.southeastasia-01.azurewebsites.net/api',
  // Replace with the public base URL of the deployed FastAPI AI agent.
  aiBaseUrl: 'https://your-deployed-ai-agent-host',
};
