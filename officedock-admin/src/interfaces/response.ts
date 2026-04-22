import { AxiosError, AxiosResponse } from 'axios';

export type ResponseError<T> = AxiosError<T>;
export type ResponseData<T> = AxiosResponse<T>;
