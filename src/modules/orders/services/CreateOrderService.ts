import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';

import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer is not exist');
    }

    const idproducts = products.map(product => {
      return { id: product.id };
    });

    const productList = await this.productsRepository.findAllById(idproducts);

    if (productList.length <= 0) {
      throw new AppError('Products is empty');
    }

    products.forEach(product => {
      const quantityDb =
        productList.find(productDb => productDb.id === product.id)?.quantity ||
        0;

      if (quantityDb < product.quantity) {
        throw new AppError('insufient quantity');
      }
    });

    const newProducts = products.map(product => {
      return {
        product_id: product.id,
        price:
          productList.find(productDb => productDb.id === product.id)?.price ||
          0,
        quantity: product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: newProducts,
    });

    await this.productsRepository.updateQuantity(
      products.map(product => {
        return { id: product.id, quantity: product.quantity };
      }),
    );

    return order;
  }
}

export default CreateOrderService;
