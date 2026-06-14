// Основные типы приложения

export interface User {
  id: string;
  email: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface Shop {
  id: string;
  user_id: string;
  name: string;
  business_id: number;
  api_key: string;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  offer_id: string;
  name: string;
  instruction: string;
  created_at: string;
  _count?: {
    keys: number;
  };
}

export interface ProductKey {
  id: string;
  product_id: string;
  code: string;
  status: "available" | "sent";
  order_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  order_id_ym: string;
  buyer_email: string;
  total_keys: number;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  key_id: string;
  code: string;
}

export interface YandexCampaign {
  id: number;
  business_id: number;
  name: string;
}

export interface YandexOrder {
  id: number;
  creationDate: string;
  status: "PROCESSING" | "DELIVERED" | "CANCELLED" | string;
  substatus: string | null;
  items: YandexOrderItem[];
  buyer: {
    email: string;
  };
}

export interface YandexOrderItem {
  id: number;
  offerId: string;
  count: number;
}

export interface YandexOffer {
  offerId: string;
  name: string;
  category: string;
  price: number;
}

// Статистика
export interface StatsData {
  totalKeysSold: number;
  totalRevenue: number;
  ordersCount: number;
  byDay: { date: string; sold: number; revenue: number }[];
  byWeek: { week: string; sold: number; revenue: number }[];
  byMonth: { month: string; sold: number; revenue: number }[];
}