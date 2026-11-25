import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'sgms:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
