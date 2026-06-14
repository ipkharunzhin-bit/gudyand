// API-клиент Яндекс Маркета для продавцов
// Документация: https://yandex.ru/dev/market/partner-api/doc/

const YANDEX_API = "https://api.partner.market.yandex.ru";

interface YandexOffer {
  offerId: string;
  name: string;
  category: string;
  price: {
    value: number;
    currencyId: string;
  };
}

interface YandexOrder {
  id: number;
  creationDate: string;
  status: string;
  substatus: string | null;
  items: {
    id: number;
    offerId: string;
    offerName: string;
    count: number;
    price: number;
  }[];
  buyer: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

// Базовый запрос к API Яндекса
async function yandexRequest<T>(
  apiKey: string,
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown
): Promise<T> {
  const url = `${YANDEX_API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Yandex API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

// Получить список магазинов (кампаний)
export async function getCampaigns(apiKey: string, businessId: number) {
  const data = await yandexRequest<{
    campaigns: {
      id: number;
      businessId: number;
      domain: string;
      state: number;
    }[];
  }>(apiKey, `/v2/businesses/${businessId}/campaigns`);
  return data.campaigns || [];
}

// Получить активные товары (offerIds) из магазина
export async function getCampaignOffers(
  apiKey: string,
  businessId: number,
  campaignId: number
): Promise<YandexOffer[]> {
  let allOffers: YandexOffer[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = { limit: 200 };
    if (pageToken) body.page_token = pageToken;

    const data = await yandexRequest<{
      offers: YandexOffer[];
      paging?: { nextPageToken?: string };
    }>(apiKey, `/v2/businesses/${businessId}/offers`, "POST", body);

    allOffers = allOffers.concat(data.offers || []);
    pageToken = data.paging?.nextPageToken;
  } while (pageToken);

  // Фильтруем только товары этого campaignId
  // В реальном API offer привязан к конкретному campaignId через offerMappings
  return allOffers;
}

// Получить заказы с фильтрацией по статусу
export async function getOrders(
  apiKey: string,
  businessId: number,
  params: {
    statuses?: string[];
    fromDate?: string;
    toDate?: string;
    limit?: number;
    pageToken?: string;
    campaignIds?: number[];
  }
) {
  const body: Record<string, unknown> = {
    limit: params.limit || 50,
  };
  if (params.statuses) body.statuses = params.statuses;
  if (params.fromDate) body.fromDate = params.fromDate;
  if (params.toDate) body.toDate = params.toDate;
  if (params.pageToken) body.pageToken = params.pageToken;
  if (params.campaignIds) body.campaignIds = params.campaignIds;

  const data = await yandexRequest<{
    orders: YandexOrder[];
    paging?: { nextPageToken?: string };
  }>(apiKey, `/v1/businesses/${businessId}/orders`, "POST", body);

  return data;
}

// Передать ключи цифровых товаров (deliverDigitalGoods)
export async function deliverDigitalGoods(
  apiKey: string,
  businessId: number,
  campaignId: number,
  orderId: number,
  items: {
    id: number;
    codes: string[];
    slip: string;
    activate_till?: string;
  }[]
) {
  // Используем v2 endpoint для кампании
  await yandexRequest(
    apiKey,
    `/v2/campaigns/${campaignId}/orders/${orderId}/deliverDigitalGoods`,
    "POST",
    { items }
  );
}

// Обновить остатки товара (выставить stock=0 или stock=1)
export async function updateStocks(
  apiKey: string,
  businessId: number,
  campaignId: number,
  offerId: string,
  stock: number
) {
  await yandexRequest(
    apiKey,
    `/v2/campaigns/${campaignId}/offers/stocks`,
    "PUT",
    {
      skus: [
        {
          offerId,
          warehouseId: 0, // основной склад
          items: [
            {
              type: "FIT",
              count: stock > 0 ? stock : 0,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    }
  );
}

// Проверить валидность API-ключа (получить информацию о токене)
export async function validateApiKey(apiKey: string) {
  return yandexRequest<{ businessId: number }>(
    apiKey,
    "/v2/auth/token",
    "GET"
  );
}