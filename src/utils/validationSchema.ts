import * as yup from "yup";

export const customerSchema = yup.object().shape({
  customer_name: yup.string().required("Customer name is required"),
  customer_email: yup
    .string()
    .email("Invalid email format")
    .required("Customer email is required"),
  customer_phone: yup.string().required("Customer's phone is required"),
});

export const productSchema = yup.object().shape({
  product_name: yup.string().required("Product name is required"),
  product_price: yup
    .number()
    .positive("Product price must be a positive number")
    .required("Product price is required"),
  product_qty: yup
    .number()
    .integer("Product quantity must be integer")
    .positive("Product quantity must be positive")
    .required("Product quantity is required"),
});

export const registerSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
  role: yup.string().required("Role is required"),
});

export const loginSchema = yup.object().shape({
    email: yup
      .string()
      .email("Invalid email format")
      .required("Email is required"),
    password: yup.string().required("Password is required"),
  });

export const orderDetailSchema = yup.object({
    product_id: yup.number().required('Product ID is required'),
    quantity: yup.number().positive().integer().required('Quantity must be a positive integer'),
    price_per_unit: yup.number().positive().required('Price per unit must be a positive number'),
});

export const createOrderSchema = yup.object({
    customer_id: yup.number().required('Customer ID is required'),
    orderDetails: yup.array()
        .of(orderDetailSchema)
        .min(1, 'At least one order detail is required')
        .required('Order details are required'),
});
  
