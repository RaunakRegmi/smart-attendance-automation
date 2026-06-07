class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.token = null;
    this.requestContext = null;
  }

  setToken(token) {
    this.token = token;
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async request(method, path, body) {
    const url = `${this.baseURL}${path}`;
    const options = { headers: this.headers() };
    if (body !== undefined) options.data = body;

    const ctx = this.requestContext;
    let response;
    switch (method) {
      case 'GET':    response = await ctx.get(url, options); break;
      case 'POST':   response = await ctx.post(url, options); break;
      case 'PUT':    response = await ctx.put(url, options); break;
      case 'DELETE': response = await ctx.delete(url, options); break;
      default:       throw new Error(`Unsupported method: ${method}`);
    }

    const contentType = response.headers()['content-type'] || '';
    let responseBody;
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return { status: response.status(), body: responseBody };
  }

  async get(path) {
    return this.request('GET', path);
  }

  async post(path, body) {
    return this.request('POST', path, body);
  }

  async put(path, body) {
    return this.request('PUT', path, body);
  }

  async delete(path) {
    return this.request('DELETE', path);
  }

  async login(email, password) {
    const res = await this.post('/api/auth/login', { email, password });
    if (res.status === 200 && res.body.success) {
      this.setToken(res.body.data.token);
    }
    return res;
  }

  setRequestContext(requestContext) {
    this.requestContext = requestContext;
  }
}

export default ApiClient;
