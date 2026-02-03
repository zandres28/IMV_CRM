import axios from 'axios';
import { ProductSold, ProductInstallment } from '../types/AdditionalServices';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const ProductService = {
    create: async (product: Partial<ProductSold>) => {
        const response = await axios.post(`${API_URL}/products`, product);
        return response.data;
    },

    getByClient: async (clientId: number) => {
        const response = await axios.get(`${API_URL}/products/client/${clientId}`);
        return response.data;
    },

    getInstallments: async (productId: number) => {
        const response = await axios.get(`${API_URL}/products/${productId}/installments`);
        return response.data;
    },

    updateInstallment: async (id: number, installment: Partial<ProductInstallment>) => {
        const response = await axios.put(`${API_URL}/products/installments/${id}`, installment);
        return response.data;
    },

    updateProduct: async (id: number, product: Partial<ProductSold>) => {
        const response = await axios.put(`${API_URL}/products/${id}`, product);
        return response.data;
    },

    deleteProduct: async (id: number) => {
        const response = await axios.delete(`${API_URL}/products/${id}`);
        return response.data;
    }
};