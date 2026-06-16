// API-клиент Яндекс Маркета для продавцов
// Документация: https://yandex.ru/dev/market/partner-api/doc/

const YANDEX_API = "https://api.partner.market.yandex.ru";

interface YandexOffer {
  offerId: string;
  name?: string;
  offerName?: string;
  category?: string;
  price?: {
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

// Получить названия товаров через offer-mappings
async function getOfferMappings(apiKey: string, businessId: number, campaignId: number): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const res = await fetch(`${YANDEX_API}/businesses/${businessId}/offer-mappings`, {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ limit: 200, campaignIds: [campaignId] }),
  });
  if (!res.ok) return map;
  const data = await res.json();
  const offerMappings = data.result?.offerMappings || [];
  for (const m of offerMappings) {
    const name = m.offer?.name || m.mapping?.marketModelName || m.offer?.offerId || "";
    if (m.offer?.offerId) map.set(m.offer.offerId, name);
  }
  return map;
}

// Получить активные товары (offerIds) из магазина
export async function getCampaignOffers(
  apiKey: string,
  businessId: number,
  campaignId: number
): Promise<YandexOffer[]> {
  const url = `${YANDEX_API}/campaigns/${campaignId}/offers`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const [offersRes, nameMap] = await Promise.all([
      fetch(url, {
        method: "POST",
        headers: { "Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ page: 1, pageSize: 200, format: "JSON" }),
        signal: controller.signal,
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Yandex API error ${r.status}: ${await r.text()}`);
        return r.json();
      }),
      getOfferMappings(apiKey, businessId, campaignId).catch(() => new Map()),
    ]);

    const offers: YandexOffer[] = offersRes.result?.offers || offersRes.offers || [];
    for (const o of offers) {
      if (!o.name && nameMap.has(o.offerId)) o.name = nameMap.get(o.offerId)!;
    }
    return offers;
  } finally {
    clearTimeout(timeout);
  }
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
  await yandexRequest(
    apiKey,
    `/v2/campaigns/${campaignId}/orders/${orderId}/deliverDigitalGoods`,
    "POST",
    {
      items: items.map((item) => ({
        id: item.id,
        codes: item.codes,
        slip: item.slip,
        activateTill: item.activate_till || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })),
    }
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
          sku: offerId,
          warehouseId: 0,
          items: [
            {
              type: "FIT",
              count: stock,
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    }
  );
}

// Проверить валидность API-ключа
export async function validateApiKey(apiKey: string) {
  const url = `${YANDEX_API}/campaigns?page=1&pageSize=1`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Api-Key": apiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Yandex API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  // Извлекаем businessId из первой кампании
  const campaigns = data.campaigns || [];
  const businessId = campaigns[0]?.businessId ?? null;
  return { businessId, campaigns, raw: data };
}
