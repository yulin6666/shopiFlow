import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface N8nWebhookResponse {
  status: string;
  classification?: string;
  reply?: string | null;
  reason?: string;
  riskLevel?: string;
  ticketId?: string | number;
  fallbackApplied?: boolean;
  [key: string]: any;
}

export class N8nClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5678') {
    this.baseUrl = baseUrl;

    // 清除可能影响 localhost 的代理环境变量
    const originalProxy = {
      http: process.env.HTTP_PROXY,
      https: process.env.HTTPS_PROXY,
      all: process.env.ALL_PROXY,
    };
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.ALL_PROXY;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // 本地地址不走代理，避免 VPN 代理拦截 localhost 请求
      proxy: false,
    });

    // 恢复环境变量（可选）
    if (originalProxy.http) process.env.HTTP_PROXY = originalProxy.http;
    if (originalProxy.https) process.env.HTTPS_PROXY = originalProxy.https;
    if (originalProxy.all) process.env.ALL_PROXY = originalProxy.all;
  }

  /**
   * 触发 n8n webhook
   */
  async triggerWebhook(path: string, payload: Record<string, any>): Promise<N8nWebhookResponse> {
    try {
      const response: AxiosResponse<N8nWebhookResponse> = await this.client.post(path, payload);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`n8n webhook failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 检查 n8n 健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/healthz');
      console.log(`🔍 healthCheck response: ${response.status}`);
      return response.status === 200;
    } catch (error: any) {
      console.log(`❌ healthCheck error: ${error.message}`);
      return false;
    }
  }

  /**
   * 等待 n8n 服务就绪
   */
  async waitForReady(maxRetries: number = 30, interval: number = 2000): Promise<void> {
    console.log(`🔍 Checking n8n at: ${this.baseUrl}/healthz`);
    for (let i = 0; i < maxRetries; i++) {
      const isReady = await this.healthCheck();
      if (isReady) {
        console.log(`✅ n8n is ready (attempt ${i + 1}/${maxRetries})`);
        return;
      }
      console.log(`⏳ Waiting for n8n... (attempt ${i + 1}/${maxRetries})`);
      await this.sleep(interval);
    }
    throw new Error(`n8n failed to become ready within timeout. Tried URL: ${this.baseUrl}/healthz`);
  }

  /**
   * 触发 Shopify Support Handler webhook
   */
  async triggerSupportWebhook(payload: {
    message: string;
    ticketId?: string | number;
    customerName?: string;
    customerEmail?: string;
    platform?: string;
    orderId?: string | null;
  }): Promise<N8nWebhookResponse> {
    return this.triggerWebhook('/webhook/shopify-support', {
      message: payload.message,
      ticketId: payload.ticketId || `test-${Date.now()}`,
      customerName: payload.customerName || 'Test User',
      customerEmail: payload.customerEmail || 'test@example.com',
      platform: payload.platform || 'shopify',
      orderId: payload.orderId || null,
    });
  }

  /**
   * 触发 Review Reply webhook
   */
  async triggerReviewWebhook(payload: {
    reviewId: string | number;
    rating: number;
    title: string;
    body: string;
    productTitle: string;
    reviewerName?: string;
    platform?: string;
  }): Promise<N8nWebhookResponse> {
    return this.triggerWebhook('/webhook/judgeme-review', {
      reviewId: payload.reviewId,
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
      productTitle: payload.productTitle,
      reviewerName: payload.reviewerName || 'Test Reviewer',
      platform: payload.platform || 'shopify',
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
