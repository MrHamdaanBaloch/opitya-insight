import { toast } from '../hooks/use-toast';

// Determine API URL based on environment
const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const apiClient = async (endpoint, { body, ...customConfig } = {}) => {
  const token = localStorage.getItem('token'); // Assuming 'token' is stored directly
  
  // Default headers, Content-Type will be overridden if customConfig.headers specifies it
  const headers = {
    'Content-Type': 'application/json', // Default to JSON
    ...customConfig.headers, // Allow custom headers to override
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: headers, // Use the merged headers
  };

  if (body) {
    // If Content-Type is form-urlencoded, pass body directly (assuming it's already URLSearchParams)
    if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      config.body = body.toString(); // Ensure it's a string
    } else {
      // Otherwise, stringify as JSON
      config.body = JSON.stringify(body);
    }
  }

  let data;
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // For 204 No Content responses, return immediately without parsing JSON
    if (response.status === 204) {
      return null; 
    }

    data = await response.json();
    if (response.ok) {
      return data;
    } else {
      // Handle specific error codes
      if (response.status === 401) {
        // Unauthorized, token expired or invalid
        const description = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || "Session expired. Please log in again.");
        toast({
          title: "Authentication Error",
          description: description,
          variant: "destructive"
        });
        // Optionally, trigger a global logout if AuthContext is accessible here
        // For now, we'll rely on individual components to handle logout on 401
        localStorage.removeItem('optiya-user');
        localStorage.removeItem('token'); // Remove token as well
        window.location.href = '/login'; // Redirect to login page
      } else if (response.status === 403) {
        const description = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || "You do not have permission to perform this action.");
        toast({
          title: "Authorization Error",
          description: description,
          variant: "destructive"
        });
      } else {
        const description = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || `An error occurred: ${response.statusText}`);
        toast({
          title: "API Error",
          description: description,
          variant: "destructive"
        });
      }
      return Promise.reject(new Error(typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || 'Something went wrong')));
    }
  } catch (err) {
    const description = typeof err === 'object' ? JSON.stringify(err) : (err.message || "Could not connect to the server. Please check your internet connection or try again later.");
    toast({
      title: "Network Error",
      description: description,
      variant: "destructive"
    });
    return Promise.reject(err);
  }
};

export default apiClient;
