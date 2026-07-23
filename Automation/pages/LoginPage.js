class LoginPage {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async loginAsAdmin(email = 'admin@example.com', password = 'admin@123') {
    const res = await this.apiClient.login(email, password);
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
    }
    console.log(`Logged in as ${email}`);
    return res.body.data;
  }
}

export default LoginPage;
