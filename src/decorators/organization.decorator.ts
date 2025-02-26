import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrganizationEntity, RequestWithOrganization } from '../types';

export const Organization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OrganizationEntity => {
    const request = ctx.switchToHttp().getRequest<RequestWithOrganization>();
    return request.organization;
  },
);
