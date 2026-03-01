export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  material: string;
}

export interface Order {
  id: string;
  items: Product[];
  total: number;
  customerName: string;
  customerEmail: string;
}
