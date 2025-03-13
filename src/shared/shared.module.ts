import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApikeysRepository } from '../apikeys/apikeys.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ApikeysRepository],
  exports: [ApikeysRepository, PrismaModule],
})
export class SharedModule {}
